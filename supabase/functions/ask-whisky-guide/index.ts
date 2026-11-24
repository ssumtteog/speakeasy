// Supabase Edge Function: ask-whisky-guide (TURBO EDITION)
// - Cached dynamic Flash model discovery + parallel Promise.any race
// - Concise, refined Korean whisky sommelier answers for both beginners & enthusiasts
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

const SYSTEM_INSTRUCTION = `당신은 서울 고급 스피크이지 위스키 바의 수석 바텐더이자 소믈리에입니다.
입문자부터 위스키 애호가까지 모두 만족할 수 있도록, 과장 없이 정확하고 세련된 한국어로 답하세요.
반드시 아래 JSON 형식으로만 응답하세요:
{"title":"질문 핵심 요약 제목(18자 이내)","answer":"정확하고 실용적인 답변(3~4문장, 자연스러운 존댓말)","keywords":["관련 핵심 키워드 2~3개"],"recommendedWhisky":"질문과 어울리는 대표 위스키 한국어 이름 1개(없으면 빈 문자열)"}
위스키·바·칵테일·안주 페어링과 무관한 질문이면 정중히 위스키 관련 질문을 안내하세요.`;

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
  question: string,
  timeoutMs: number,
  disableThinking: boolean,
): Promise<{ res: Response; model: string }> {
  const cleanModel = model.replace(/^models\//, "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const genConfig: Record<string, unknown> = {
    temperature: 0.35,
    maxOutputTokens: 420,
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
            parts: [{ text: `${SYSTEM_INSTRUCTION}\n\n사용자 질문: ${question}` }],
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
  question: string,
): Promise<{ text: string; model: string } | { error: string; status: number }> {
  const runOne = async (model: string): Promise<{ text: string; model: string }> => {
    let attempt = await callSingleModel(apiKey, model, question, 9000, true);
    if (attempt.res.status === 400) {
      attempt = await callSingleModel(apiKey, model, question, 9000, false);
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

  const firstBatch = models.slice(0, 2);
  try {
    return await firstFulfilled(firstBatch.map((m) => runOne(m)));
  } catch (aggErr) {
    const secondBatch = models.slice(2, 4);
    if (secondBatch.length > 0) {
      try {
        return await firstFulfilled(secondBatch.map((m) => runOne(m)));
      } catch {
        // fall through
      }
    }
    const first = (aggErr as { errors?: Array<{ status?: number }> })?.errors?.[0];
    const status = first?.status || 503;
    return {
      status,
      error:
        status === 503 || status === 429
          ? "AI 소믈리에 응답이 잠시 혼잡해요. 몇 초 후 다시 시도해 주세요."
          : "AI 응답 생성 중 오류가 발생했어요.",
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
    const question = String(body.question || "").trim();

    if (question.length < 2) {
      return new Response(JSON.stringify({ error: "질문을 2자 이상 입력해 주세요." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (question.length > 300) {
      return new Response(JSON.stringify({ error: "질문은 300자 이내로 입력해 주세요." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const models = await getFastModels(apiKey);
    const outcome = await raceFastModels(apiKey, models, question);

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
      JSON.stringify({ error: "Ask failed", detail: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
