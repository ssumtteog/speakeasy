// Supabase Edge Function: scan-whisky-label (TURBO EDITION)
// - Cached dynamic Flash model discovery (0ms after warm-up)
// - Parallel race across top 2 fastest Flash models with AbortController
// - thinkingBudget: 0 + compact prompt + maxOutputTokens: 240 for ~1.5-3s latency
// Required Supabase Secret: GEMINI_API_KEY

export { };

interface DenoLike {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
}

const denoRuntime = (globalThis as unknown as { Deno: DenoLike }).Deno;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPT = `Identify the whisky bottle label in this photo. Respond ONLY with JSON:
{"detected":boolean,"whiskyName":"한국어 제품명","brand":"한국어 브랜드명","enName":"English name","category":"싱글몰트|버번|블렌디드|피트|기타","abv":"40%","confidence":"high|medium|low","searchKeyword":"핵심 한국어 브랜드명","notes":"향과 맛 한국어 1문장 요약"}
If Islay/peated whisky use category "피트". If no bottle label is visible set detected:false and explain briefly in Korean in notes.`;

// Warm-instance cache of fast Flash models (30 min TTL)
let cachedFlashModels: string[] = [];
let cachedAt = 0;

async function getFastModels(apiKey: string): Promise<string[]> {
  if (cachedFlashModels.length > 0 && Date.now() - cachedAt < 30 * 60 * 1000) {
    return cachedFlashModels;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { signal: ctrl.signal },
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const models = Array.isArray(data.models) ? data.models : [];
      const usable: string[] = models
        .filter(
          (m: { name?: string; supportedGenerationMethods?: string[] }) =>
            typeof m.name === "string" &&
            /gemini.*flash/i.test(m.name) &&
            !/embedding|imagen|veo|tts|audio|live|aqa|thinking|image-gen/i.test(m.name) &&
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes("generateContent"),
        )
        .map((m: { name: string }) => m.name.replace(/^models\//, ""));

      usable.sort((a: string, b: string) => {
        const rank = (n: string) => {
          let s = /flash-lite/i.test(n) ? 0 : 10;
          if (/latest/i.test(n)) s -= 2;
          if (/preview|exp/i.test(n)) s += 3;
          // Prefer newer major version (e.g., 3.8 > 2.5)
          const ver = n.match(/gemini-(\d+(?:\.\d+)?)/i);
          if (ver) s -= parseFloat(ver[1]);
          return s;
        };
        return rank(a) - rank(b);
      });

      if (usable.length > 0) {
        cachedFlashModels = usable.slice(0, 4);
        cachedAt = Date.now();
        return cachedFlashModels;
      }
    }
  } catch {
    // Fall through to default candidates
  }
  return ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.8-flash"];
}

async function callSingleModel(
  apiKey: string,
  model: string,
  imageBase64: string,
  mimeType: string,
  timeoutMs: number,
  disableThinking: boolean,
): Promise<{ res: Response; model: string }> {
  const cleanModel = model.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const genConfig: Record<string, unknown> = {
    temperature: 0.1,
    maxOutputTokens: 260,
    responseMimeType: "application/json",
  };
  if (disableThinking) {
    genConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: genConfig,
      }),
    });
    return { res, model: cleanModel };
  } finally {
    clearTimeout(timer);
  }
}

function firstFulfilled<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (promises.length === 0) {
      reject({ errors: [] });
      return;
    }
    const errors: unknown[] = [];
    let rejectedCount = 0;
    promises.forEach((p, idx) => {
      Promise.resolve(p).then(
        (val) => resolve(val),
        (err) => {
          errors[idx] = err;
          rejectedCount += 1;
          if (rejectedCount === promises.length) {
            reject({ errors });
          }
        },
      );
    });
  });
}

async function raceFastModels(
  apiKey: string,
  models: string[],
  imageBase64: string,
  mimeType: string,
): Promise<{ text: string; model: string } | { error: string; status: number }> {
  const runOne = async (model: string): Promise<{ text: string; model: string }> => {
    let attempt = await callSingleModel(apiKey, model, imageBase64, mimeType, 9000, true);
    // If a model doesn't accept thinkingConfig (HTTP 400), retry immediately without it
    if (attempt.res.status === 400) {
      attempt = await callSingleModel(apiKey, model, imageBase64, mimeType, 9000, false);
    }
    if (!attempt.res.ok) {
      const detail = await attempt.res.text().catch(() => "");
      throw { status: attempt.res.status, model: attempt.model, detail };
    }
    const json = await attempt.res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw { status: 502, model: attempt.model, detail: "Empty response" };
    return { text, model: attempt.model };
  };

  // Race top 2 fastest Flash models simultaneously — fastest 200 OK wins immediately!
  const firstBatch = models.slice(0, 2);
  try {
    return await firstFulfilled(firstBatch.map((m) => runOne(m)));
  } catch (aggErr) {
    // If both in first batch failed (e.g. 503 busy), try remaining models in parallel
    const secondBatch = models.slice(2, 4);
    if (secondBatch.length > 0) {
      try {
        return await firstFulfilled(secondBatch.map((m) => runOne(m)));
      } catch {
        // fall through
      }
    }
    const first = (aggErr as { errors?: Array<{ status?: number; detail?: string }> })?.errors?.[0];
    const status = first?.status || 503;
    return {
      status,
      error:
        status === 503 || status === 429
          ? "AI 서버가 잠시 혼잡해요. 몇 초 후 다시 시도해 주세요."
          : "Gemini API error",
    };
  }
}

denoRuntime.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const apiKey = denoRuntime.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY secret is not configured in Supabase." }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const startedAt = Date.now();
  try {
    const body = await req.json();
    const rawBase64 = String(body.imageBase64 || "").replace(/^data:[^;]+;base64,/, "");
    const mimeType = String(body.mimeType || "image/jpeg");

    if (!rawBase64 || rawBase64.length < 100) {
      return new Response(JSON.stringify({ error: "Invalid image payload" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (rawBase64.length > 7_000_000) {
      return new Response(JSON.stringify({ error: "Image too large" }), {
        status: 413,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const models = await getFastModels(apiKey);
    const outcome = await raceFastModels(apiKey, models, rawBase64, mimeType);

    if ("error" in outcome) {
      return new Response(
        JSON.stringify({ error: outcome.error, status: outcome.status }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const cleaned = outcome.text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    parsed._meta = { model: outcome.model, ms: Date.now() - startedAt };

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Scan failed", detail: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
