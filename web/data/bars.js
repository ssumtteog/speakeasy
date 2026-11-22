// ===== CURATED REAL NATIONWIDE SOUTH KOREA WHISKY BAR DATA (69 VERIFIED VENUES) =====
const BARS = [
  // ===== 서울 (23곳) =====
  {
    id: 'alice', name: '앨리스 청담', city: '서울', region: '청담·신사', subloc: '서울 강남구 청담동',
    desc: '꽃집 지하의 비밀 문을 열면 펼쳐지는 클래식 스피크이지 바. 정교한 시그니처 칵테일과 폭넓은 싱글몰트 라인업이 강점입니다.',
    mood: 2, price: 5, space: 3, taste: 3, priceText: '잔당 2.4~3.8만원', cover: '커버차지 1만원',
    hours: '19:00 ~ 02:00', whiskeys: ['맥캘란 18y', '글렌피딕 21y', '라가불린 16y'],
    naverQuery: '앨리스 청담', lat: 37.5257, lng: 127.0434, station: '압구정로데오역', walkMin: 6
  },
  {
    id: 'lechamber', name: '르챔버', city: '서울', region: '청담·신사', subloc: '서울 강남구 청담동',
    desc: '책장을 밀고 들어가는 대표 스피크이지. 차분한 재즈 선율과 함께 희귀 올드 바틀과 깊은 피트 위스키를 즐길 수 있습니다.',
    mood: 1, price: 5, space: 3, taste: 5, priceText: '잔당 2.5~4.2만원', cover: '커버차지 1만원',
    hours: '19:00 ~ 03:00', whiskeys: ['아드벡 우가달', '스프링뱅크 15y', '발베니 21y'],
    naverQuery: '르챔버', lat: 37.5224, lng: 127.0410, station: '압구정로데오역', walkMin: 7
  },
  {
    id: 'zest-seoul', name: '제스트', city: '서울', region: '청담·신사', subloc: '서울 강남구 청담동',
    desc: '아시아 베스트 바 최상위권에 오른 제로 웨이스트 컨셉 바. 한국 제철 재료 칵테일과 엄선된 싱글몰트를 함께 즐길 수 있어요.',
    mood: 2, price: 5, space: 3, taste: 3, priceText: '잔당 2.5~3.8만원', cover: '커버차지 1만원',
    hours: '18:30 ~ 02:00', whiskeys: ['맥캘란 15y', '야마자키 12y', '글렌모렌지 시그넷'],
    naverQuery: '제스트 청담', lat: 37.5240, lng: 127.0392, station: '압구정로데오역', walkMin: 5
  },
  {
    id: 'pineandco', name: '파인앤코', city: '서울', region: '청담·신사', subloc: '서울 강남구 역삼·신사',
    desc: '모던하고 감각적인 인테리어에서 독창적인 칵테일과 트렌디한 위스키 라인업을 즐길 수 있는 인기 바입니다.',
    mood: 3, price: 4, space: 3, taste: 3, priceText: '잔당 2.2~3.5만원', cover: '커버차지 1만원',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 14y', '우드포드 리저브', '히비키 하모니'],
    naverQuery: '파인앤코', lat: 37.5192, lng: 127.0285, station: '학동역', walkMin: 8
  },
  {
    id: 'thebooze-cd', name: '더부즈 청담', city: '서울', region: '청담·신사', subloc: '서울 강남구 청담동',
    desc: '국내 몰트바 문화를 이끈 정통 스피크이지. 중후한 우드 백바와 수백 종의 싱글몰트 위스키 컬렉션이 압권입니다.',
    mood: 1, price: 5, space: 2, taste: 5, priceText: '잔당 2.4~4.0만원', cover: '커버차지 1만원',
    hours: '19:00 ~ 02:00', whiskeys: ['라가불린 16y', '글렌드로낙 18y', '아드벡 10y'],
    naverQuery: '더부즈 청담', lat: 37.5262, lng: 127.0468, station: '청담역', walkMin: 7
  },
  {
    id: 'bar-cham', name: '바참', city: '서울', region: '종로·을지로', subloc: '서울 종로구 통인동 (서촌)',
    desc: '한옥의 따뜻한 참나무 질감이 살아있는 국내 대표 감성 바. 조용히 한 잔에 집중하기 좋고 입문자도 편하게 추천받을 수 있어요.',
    mood: 1, price: 3, space: 2, taste: 2, priceText: '잔당 1.7~2.6만원', cover: '커버차지 없음',
    hours: '18:00 ~ 01:00', whiskeys: ['발베니 12y', '히비키 하모니', '메이커스마크'],
    naverQuery: '바참', lat: 37.5797, lng: 126.9704, station: '경복궁역', walkMin: 7
  },
  {
    id: 'cobbler', name: '코블러', city: '서울', region: '종로·을지로', subloc: '서울 종로구 내자동 (서촌)',
    desc: '서촌 한옥 골목에 자리한 메뉴판 없는 클래식 바. 바텐더에게 취향을 말하면 딱 맞는 위스키와 칵테일을 추천해 줍니다.',
    mood: 1, price: 4, space: 2, taste: 3, priceText: '잔당 2.0~3.2만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌알라키 12y', '발베니 14y', '탈리스커 10y'],
    naverQuery: '코블러', lat: 37.5754, lng: 126.9718, station: '경복궁역', walkMin: 4
  },
  {
    id: 'charles-h', name: '찰스H', city: '서울', region: '종로·을지로', subloc: '서울 종로구 당주동 (포시즌스)',
    desc: '비밀의 문 너머 펼쳐지는 세계적인 명성의 스피크이지 바. 클래식한 뉴욕 감성과 최고급 싱글몰트 라인업을 경험할 수 있습니다.',
    mood: 2, price: 5, space: 3, taste: 4, priceText: '잔당 2.8~4.5만원', cover: '커버차지 있음',
    hours: '18:00 ~ 01:30', whiskeys: ['글렌모렌지 시그넷', '맥캘란 18y', '야마자키 12y'],
    naverQuery: '찰스H', lat: 37.5707, lng: 126.9756, station: '광화문역', walkMin: 2
  },
  {
    id: 'sookhee-euljiro', name: '숙희', city: '서울', region: '종로·을지로', subloc: '서울 중구 을지로',
    desc: '한국적인 자개와 동양화 미학을 현대적으로 녹여낸 을지로 대표 오센틱 바. 수준 높은 칵테일과 싱글몰트를 즐길 수 있어요.',
    mood: 1, price: 4, space: 2, taste: 3, priceText: '잔당 2.0~3.4만원', cover: '커버차지 없음',
    hours: '18:00 ~ 01:00', whiskeys: ['기원 배치', '발베니 14y', '야마자키 12y'],
    naverQuery: '숙희 을지로', lat: 37.5662, lng: 126.9922, station: '을지로3가역', walkMin: 4
  },
  {
    id: 'bellboy-euljiro', name: '벨보이', city: '서울', region: '종로·을지로', subloc: '서울 중구 을지로',
    desc: '아치형 우드 인테리어와 아늑한 무드의 오너 바텐더 바. 희귀 독립병입 싱글몰트 위스키를 다양하게 만날 수 있어요.',
    mood: 1, price: 4, space: 2, taste: 5, priceText: '잔당 1.9~3.3만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['스프링뱅크 10y', '아드벡 10y', '글렌알라키 15y'],
    naverQuery: '벨보이 을지로', lat: 37.5654, lng: 126.9896, station: '을지로3가역', walkMin: 5
  },
  {
    id: 'urban-whisky', name: '어반위스키', city: '서울', region: '강남', subloc: '서울 서초구 반포동 (신논현)',
    desc: '신논현역 인근 차분하고 모던한 위스키·칵테일 바. 다양한 싱글몰트와 부드러운 하이볼로 입문자도 편하게 즐길 수 있어요.',
    mood: 2, price: 3, space: 3, taste: 2, priceText: '잔당 1.6~2.8만원', cover: '커버차지 없음',
    hours: '18:30 ~ 02:00', whiskeys: ['글렌피딕 15y', '발베니 12y', '우드포드 리저브'],
    naverQuery: '어반위스키', lat: 37.5055, lng: 127.0242, station: '신논현역', walkMin: 4
  },
  {
    id: 'delamano', name: '델라마노', city: '서울', region: '강남', subloc: '서울 강남구 역삼동 (선릉·역삼)',
    desc: '비밀의 방 같은 앤틱하고 아늑한 분위기의 위스키·시가 바. 바텐더가 취향에 맞는 묵직한 싱글몰트와 버번을 친절히 추천해 줍니다.',
    mood: 1, price: 4, space: 2, taste: 4, priceText: '잔당 1.9~3.2만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌알라키 15y', '발베니 14y', '라프로익 10y'],
    naverQuery: '델라마노', lat: 37.5016, lng: 127.0398, station: '역삼역', walkMin: 6
  },
  {
    id: 'soko', name: '소코바', city: '서울', region: '한남·이태원', subloc: '서울 용산구 한남동',
    desc: '1920년대 개화기 무드의 고급 라운지. 격식 있는 서비스와 함께 깊은 숙성 싱글몰트를 즐기기에 완벽합니다.',
    mood: 2, price: 5, space: 3, taste: 4, priceText: '잔당 2.4~3.8만원', cover: '커버차지 1만원',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌드로낙 18y', '야마자키 12y', '아드벡 코리브레칸'],
    naverQuery: '소코바', lat: 37.5357, lng: 127.0073, station: '한강진역', walkMin: 8
  },
  {
    id: 'southside', name: '사우스사이드팔러', city: '서울', region: '한남·이태원', subloc: '서울 용산구 이태원동',
    desc: '활기찬 음악과 캐주얼한 에너지가 흐르는 아메리칸 스타일 바. 친구들과 버번 하이볼이나 칵테일을 즐기기 좋아요.',
    mood: 5, price: 2, space: 5, taste: 2, priceText: '잔당 1.4~2.2만원', cover: '커버차지 없음',
    hours: '18:00 ~ 02:00', whiskeys: ['메이커스마크', '불릿 버번', '제임슨'],
    naverQuery: '사우스사이드팔러', lat: 37.5345, lng: 126.9896, station: '녹사평역', walkMin: 6
  },
  {
    id: 'superbarket', name: '슈퍼바켓', city: '서울', region: '홍대·연남', subloc: '서울 마포구 연남동',
    desc: '경의선 숲길 인근의 아늑하고 앤틱한 위스키·칵테일 바. 부담 없는 가격과 편안한 무드로 입문자나 친구와 가기 좋아요.',
    mood: 3, price: 2, space: 4, taste: 2, priceText: '잔당 1.2~2.1만원', cover: '커버차지 없음',
    hours: '18:00 ~ 02:00', whiskeys: ['글렌피딕 12y', '발베니 12y', '버팔로 트레이스'],
    naverQuery: '슈퍼바켓', lat: 37.5623, lng: 126.9242, station: '홍대입구역', walkMin: 7
  },
  {
    id: 'barsangsuri', name: '바상수리', city: '서울', region: '홍대·연남', subloc: '서울 마포구 상수동',
    desc: '홍대·상수에서 오래 사랑받아온 싱글몰트 전문 위스키 바. 친절한 설명과 함께 묵직한 아일라 피트부터 올드 바틀까지 즐길 수 있어요.',
    mood: 2, price: 3, space: 1, taste: 5, priceText: '잔당 1.5~2.6만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['아드벡 10y', '라프로익 쿼터캐스크', '탈리스커 10y'],
    naverQuery: '바상수리', lat: 37.5476, lng: 126.9225, station: '상수역', walkMin: 3
  },
  {
    id: 'onzieme-mangwon', name: '온지엠', city: '서울', region: '홍대·연남', subloc: '서울 마포구 망원동',
    desc: '낮에는 모로코 러그 쇼룸, 밤에는 감각적인 위스키 바로 변하는 독특한 공간. 좋은 음악과 조용한 대화에 완벽합니다.',
    mood: 2, price: 3, space: 2, taste: 3, priceText: '잔당 1.6~2.8만원', cover: '커버차지 없음',
    hours: '19:00 ~ 01:00', whiskeys: ['글렌모렌지 10y', '몽키숄더', '메이커스마크'],
    naverQuery: '온지엠 망원', lat: 37.5558, lng: 126.9052, station: '망원역', walkMin: 6
  },
  {
    id: 'reveeat-hapjeong', name: '레브이트', city: '서울', region: '홍대·연남', subloc: '서울 마포구 합정동',
    desc: '합정·망원 사이 한적한 골목의 프렌치 다이닝 위스키 바. 수준 높은 요리와 싱글몰트 페어링으로 인기가 높아요.',
    mood: 2, price: 4, space: 3, taste: 3, priceText: '잔당 1.8~3.0만원', cover: '커버차지 없음',
    hours: '18:00 ~ 01:00', whiskeys: ['발베니 12y', '맥캘란 12y', '글렌리벳 15y'],
    naverQuery: '레브이트 합정', lat: 37.5512, lng: 126.9114, station: '합정역', walkMin: 6
  },
  {
    id: 'escape-sinchon', name: '이스케이프 신촌', city: '서울', region: '홍대·연남', subloc: '서울 서대문구 창천동 (신촌)',
    desc: '신촌에서 합리적인 가격대로 다양한 위스키와 하이볼, 칵테일을 편안하게 즐길 수 있는 캐주얼 위스키 바예요.',
    mood: 4, price: 1, space: 4, taste: 2, priceText: '잔당 0.9~1.8만원', cover: '커버차지 없음',
    hours: '18:00 ~ 03:00', whiskeys: ['제임슨', '산토리 가쿠빈', '글렌피딕 12y'],
    naverQuery: '이스케이프 신촌', lat: 37.5568, lng: 126.9354, station: '신촌역', walkMin: 4
  },
  {
    id: 'docent-seongsu', name: '도슨트 성수', city: '서울', region: '성수', subloc: '서울 성동구 성수동',
    desc: '미술관 도슨트처럼 술에 대한 친절하고 전문적인 설명을 들으며 즐길 수 있는 바. 위스키 입문자 첫 방문지로 강력 추천해요.',
    mood: 2, price: 3, space: 2, taste: 1, priceText: '잔당 1.5~2.5만원', cover: '커버차지 없음',
    hours: '18:00 ~ 01:00', whiskeys: ['글렌모렌지 오리지널', '발베니 14y', '카발란 솔리스트'],
    naverQuery: '도슨트 성수', lat: 37.5458, lng: 127.0532, station: '성수역', walkMin: 5
  },
  {
    id: 'moveon-seongsu', name: '무브온 성수', city: '서울', region: '성수', subloc: '서울 성동구 성수동',
    desc: '은은한 조명과 턴테이블 음악이 어우러지는 성수 뮤직·위스키 바. 데이트와 소규모 모임 모두 만족도가 높은 감성 아지트입니다.',
    mood: 4, price: 2, space: 4, taste: 3, priceText: '잔당 1.4~2.4만원', cover: '커버차지 없음',
    hours: '18:00 ~ 02:00', whiskeys: ['글렌리벳 12y', '메이커스마크', '라프로익 10y'],
    naverQuery: '무브온 성수', lat: 37.5418, lng: 127.0572, station: '성수역', walkMin: 6
  },
  {
    id: 'lionheart-jamsil', name: '라이언하트', city: '서울', region: '잠실·송파', subloc: '서울 송파구 송파동 (석촌호수)',
    desc: '비밀 철문을 열고 들어가는 뉴욕 맨해튼 감성의 위스키 & 스테이크 바. 세심한 위스키 추천과 다이닝을 함께 즐길 수 있어요.',
    mood: 2, price: 4, space: 3, taste: 4, priceText: '잔당 2.0~3.5만원', cover: '커버차지 없음',
    hours: '18:00 ~ 01:00', whiskeys: ['맥캘란 15y', '우드포드 리저브', '라가불린 16y'],
    naverQuery: '라이언하트 잠실', lat: 37.5082, lng: 127.1065, station: '석촌역', walkMin: 6
  },
  {
    id: 'yahwa-jamsil', name: '야화 혼술바 잠실방이점', city: '서울', region: '잠실·송파', subloc: '서울 송파구 방이동',
    desc: '혼자 방문해도 어색하지 않게 바텐더와 소통하며 가볍게 위스키와 하이볼을 즐길 수 있는 트렌디한 혼술 바입니다.',
    mood: 3, price: 2, space: 1, taste: 2, priceText: '잔당 1.2~2.1만원', cover: '커버차지 없음',
    hours: '19:00 ~ 03:00', whiskeys: ['몽키숄더', '발베니 12y', '메이커스마크'],
    naverQuery: '야화 잠실방이점', lat: 37.5138, lng: 127.1108, station: '방이먹자골목', walkMin: 5
  },

  // ===== 경기 (16곳 — 안양·석수·범계·평촌·분당·판교·수원·일산·부천·용인!) =====
  {
    id: 'seoksu-vinyl', name: '석수 바이닐펍', city: '경기', region: '안양·석수', subloc: '경기 안양시 만안구 석수동',
    desc: '석수동 골목의 아늑한 LP 바이닐 펍. 올드팝·재즈·록 신청곡을 들으며 편안하게 위스키와 하이볼을 즐길 수 있는 동네 아지트예요.',
    mood: 3, price: 2, space: 3, taste: 2, priceText: '잔당 1.1~2.0만원', cover: '커버차지 없음',
    hours: '18:30 ~ 01:00', whiskeys: ['제임슨', '산토리 가쿠빈', '글렌피딕 12y'],
    naverQuery: '석수 바이닐펍', lat: 37.4312, lng: 126.9065, station: '석수역', walkMin: 7
  },
  {
    id: 'icarus-anyang', name: '이카루스', city: '경기', region: '안양·범계', subloc: '경기 안양시 동안구 호계동 (범계)',
    desc: '22년 경력 오너 바텐더가 운영하는 범계 대표 클래식 바. 400여 종의 싱글몰트 위스키와 4,000장의 LP 사운드가 압권입니다.',
    mood: 1, price: 4, space: 2, taste: 5, priceText: '잔당 1.8~3.4만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['아드벡 우가달', '스프링뱅크 15y', '발베니 14y'],
    naverQuery: '이카루스 범계', lat: 37.3902, lng: 126.9522, station: '범계역', walkMin: 4
  },
  {
    id: 'luhan-anyang', name: '루한', city: '경기', region: '안양·인덕원', subloc: '경기 안양시 동안구 관양동 (인덕원)',
    desc: '인덕원 골목에 자리한 차분하고 감성적인 칵테일·위스키 바. 혼술이나 조용한 대화에 딱 맞는 아담하고 따뜻한 공간이에요.',
    mood: 2, price: 3, space: 2, taste: 2, priceText: '잔당 1.4~2.5만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌모렌지 10y', '발베니 12y', '메이커스마크'],
    naverQuery: '루한 인덕원', lat: 37.4004, lng: 126.9762, station: '인덕원역', walkMin: 6
  },
  {
    id: 'kevinscabin-anyang', name: '케빈스 캐빈', city: '경기', region: '안양·평촌', subloc: '경기 안양시 동안구 평촌동',
    desc: '평촌 위스키 애호가들의 비밀 아지트로 손꼽히는 정통 싱글몰트 바. 전문적인 설명과 함께 다채로운 몰트를 경험할 수 있어요.',
    mood: 1, price: 3, space: 1, taste: 4, priceText: '잔당 1.6~2.9만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌알라키 12y', '탈리스커 10y', '라프로익 10y'],
    naverQuery: '케빈스 캐빈 평촌', lat: 37.3948, lng: 126.9632, station: '평촌역', walkMin: 5
  },
  {
    id: 'daedalus-anyang', name: '다이달로스', city: '경기', region: '안양·범계', subloc: '경기 안양시 동안구 호계동 (범계)',
    desc: '깔끔하고 정돈된 인테리어에서 클래식 칵테일과 싱글몰트 위스키를 차분하게 즐길 수 있는 범계 인기 바입니다.',
    mood: 2, price: 3, space: 2, taste: 3, priceText: '잔당 1.6~2.8만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌리벳 12y', '우드포드 리저브', '히비키 하모니'],
    naverQuery: '다이달로스 범계', lat: 37.3886, lng: 126.9510, station: '범계역', walkMin: 5
  },
  {
    id: 'melang-anyang', name: '멜랑멜랑 범계점', city: '경기', region: '안양·범계', subloc: '경기 안양시 동안구 호계동 (범계)',
    desc: '낮은 조도와 감성적인 인테리어로 데이트·혼술에 인기가 높은 바. 부담 없는 가격에 위스키와 하이볼을 즐길 수 있어요.',
    mood: 3, price: 2, space: 3, taste: 2, priceText: '잔당 1.2~2.2만원', cover: '커버차지 없음',
    hours: '18:00 ~ 02:00', whiskeys: ['몽키숄더', '버팔로 트레이스', '글렌피딕 12y'],
    naverQuery: '멜랑멜랑 범계점', lat: 37.3914, lng: 126.9535, station: '범계역', walkMin: 4
  },
  {
    id: 'it-pangyo', name: '잇트 판교', city: '경기', region: '분당·판교', subloc: '경기 성남시 분당구 백현동',
    desc: '판교 알파리움 인근의 스피크이지 칵테일·위스키 바. 세련된 공간에서 수준 높은 싱글몰트와 시그니처 칵테일을 즐길 수 있어요.',
    mood: 2, price: 4, space: 3, taste: 3, priceText: '잔당 2.0~3.4만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 14y', '맥캘란 12y', '우드포드 리저브'],
    naverQuery: '잇트 판교', lat: 37.3947, lng: 127.1105, station: '판교역', walkMin: 4
  },
  {
    id: 'islay-barley', name: '아일라 발리', city: '경기', region: '분당·판교', subloc: '경기 성남시 분당구 구미동 (미금)',
    desc: '취향과 예산에 맞춰 바텐더가 위스키를 추천해 주는 몰트 전문 바. 하프 글라스 주문이 가능해 다양한 보틀을 비교 시음하기 좋아요.',
    mood: 1, price: 3, space: 1, taste: 5, priceText: '잔당 1.4~2.8만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['아드벡 우가달', '스프링뱅크 10y', '보모어 12y'],
    naverQuery: '아일라 발리', lat: 37.3498, lng: 127.1088, station: '미금역', walkMin: 5
  },
  {
    id: 'chanchan-sunae', name: '찬찬', city: '경기', region: '분당·판교', subloc: '경기 성남시 분당구 수내동',
    desc: '유럽 골목 펍을 옮겨놓은 듯한 따뜻한 우드톤 아이리시 펍 겸 바. 캐주얼하게 싱글몰트와 하이볼을 즐기기 좋습니다.',
    mood: 3, price: 2, space: 3, taste: 2, priceText: '잔당 1.3~2.3만원', cover: '커버차지 없음',
    hours: '18:00 ~ 01:00', whiskeys: ['제임슨', '글렌피딕 12y', '부쉬밀'],
    naverQuery: '찬찬 수내', lat: 37.3782, lng: 127.1142, station: '수내역', walkMin: 4
  },
  {
    id: 'detail-suwon', name: '디테일 바', city: '경기', region: '수원', subloc: '경기 수원시 팔달구 장안동 (행궁동)',
    desc: '수원 화성 행궁동의 야경이 펼쳐지는 감성 위스키 바. 앤틱한 공간에서 취향 맞춤 추천을 받으며 조용히 즐기기 좋아요.',
    mood: 1, price: 3, space: 2, taste: 3, priceText: '잔당 1.6~2.8만원', cover: '커버차지 없음',
    hours: '18:30 ~ 01:00', whiskeys: ['글렌모렌지 10y', '발베니 12y', '히비키 하모니'],
    naverQuery: '디테일 바 행궁동', lat: 37.2842, lng: 127.0152, station: '수원화성 행궁', walkMin: 5
  },
  {
    id: 'reforma-suwon', name: '리포르마 시가바', city: '경기', region: '수원', subloc: '경기 수원시 팔달구 인계동',
    desc: '수원 인계동의 클래식 재즈·위스키 라운지. 중후한 분위기에서 싱글몰트와 버번, 시가 페어링을 경험할 수 있어요.',
    mood: 2, price: 4, space: 3, taste: 4, priceText: '잔당 1.9~3.4만원', cover: '커버차지 있음',
    hours: '19:00 ~ 02:00', whiskeys: ['맥캘란 15y', '와일드터키 레어브리드', '라가불린 16y'],
    naverQuery: '리포르마 시가바', lat: 37.2636, lng: 127.0322, station: '수원시청역', walkMin: 6
  },
  {
    id: 'bar1225-ilsan', name: '1225바', city: '경기', region: '일산', subloc: '경기 고양시 일산동구 정발산동 (밤리단길)',
    desc: '밤리단길의 아늑하고 차분한 감성 바. 은은한 조명 아래 부담 없는 가격으로 위스키와 하이볼을 즐기기 좋은 동네 아지트예요.',
    mood: 2, price: 2, space: 2, taste: 2, priceText: '잔당 1.3~2.3만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌리벳 12y', '메이커스마크', '몽키숄더'],
    naverQuery: '1225바 일산', lat: 37.6675, lng: 126.7845, station: '정발산역', walkMin: 10
  },
  {
    id: 'geebar-bucheon', name: 'GEE BAR', city: '경기', region: '부천', subloc: '경기 부천시 원미구 상동',
    desc: '부천 상동역 인근의 클래식 싱글몰트 위스키 바. 조용하고 깔끔한 분위기에서 다양한 위스키를 즐기기 좋습니다.',
    mood: 1, price: 3, space: 2, taste: 3, priceText: '잔당 1.6~2.8만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 12y', '맥캘란 12y', '글렌피딕 15y'],
    naverQuery: 'GEE BAR 상동', lat: 37.5058, lng: 126.7532, station: '상동역', walkMin: 5
  },
  {
    id: 'blanc-bucheon', name: '블랑', city: '경기', region: '부천', subloc: '경기 부천시 원미구 중동 (신중동)',
    desc: '신중동역 인근의 세련된 모던 위스키·칵테일 라운지. 편안한 대화를 나누기 좋은 아늑한 좌석이 강점이에요.',
    mood: 2, price: 3, space: 3, taste: 2, priceText: '잔당 1.5~2.7만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌모렌지 10y', '메이커스마크', '조니워커 블랙'],
    naverQuery: '블랑 신중동', lat: 37.5032, lng: 126.7758, station: '신중동역', walkMin: 4
  },
  {
    id: 'underlounge-suji', name: '언더라운지 용인수지점', city: '경기', region: '용인·수지', subloc: '경기 용인시 수지구 풍덕천동',
    desc: '수지구청역 인근 힙하고 감각적인 라운지 바. 어둑한 조명 아래 위스키와 칵테일을 트렌디하게 즐길 수 있어요.',
    mood: 3, price: 3, space: 3, taste: 3, priceText: '잔당 1.5~2.6만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 12y', '와일드터키 101', '아드벡 10y'],
    naverQuery: '언더라운지 용인수지점', lat: 37.3228, lng: 127.0954, station: '수지구청역', walkMin: 4
  },
  {
    id: 'yahwa-suji', name: '야화 수지구청점', city: '경기', region: '용인·수지', subloc: '경기 용인시 수지구 풍덕천동',
    desc: '수지구청역 근처에서 편안하게 혼술과 위스키·하이볼을 즐길 수 있는 캐주얼 감성 바예요.',
    mood: 3, price: 2, space: 1, taste: 2, priceText: '잔당 1.2~2.1만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['몽키숄더', '산토리 가쿠빈', '글렌피딕 12y'],
    naverQuery: '야화 수지구청점', lat: 37.3216, lng: 127.0968, station: '수지구청역', walkMin: 5
  },

  // ===== 인천 (5곳) =====
  {
    id: 'amento-songdo', name: '몰트바 어멘토', city: '인천', region: '송도', subloc: '인천 연수구 송도동',
    desc: '송도의 대표적인 정통 몰트바. 스피크이지 감성의 고풍스러운 공간에서 풍부한 셰리·싱글몰트 백바를 즐길 수 있어요.',
    mood: 1, price: 4, space: 2, taste: 4, priceText: '잔당 1.8~3.2만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌드로낙 15y', '맥캘란 12y', '아드벡 10y'],
    naverQuery: '몰트바 어멘토', lat: 37.3924, lng: 126.6458, station: '센트럴파크역', walkMin: 7
  },
  {
    id: 'incheon-spirit', name: '인천스피릿', city: '인천', region: '구월동', subloc: '인천 남동구 구월동',
    desc: '예술회관역 인근 책장 문을 열고 들어가는 아지트 감성 위스키 바. 친절한 맞춤 추천으로 입문자도 만족도가 높아요.',
    mood: 2, price: 3, space: 2, taste: 3, priceText: '잔당 1.4~2.6만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 12y', '글렌알라키 12y', '메이커스마크'],
    naverQuery: '인천스피릿', lat: 37.4508, lng: 126.7019, station: '예술회관역', walkMin: 5
  },
  {
    id: 'a7x-incheon', name: 'A7X', city: '인천', region: '구월동', subloc: '인천 남동구 구월동',
    desc: '구월동 로데오 인근의 따뜻한 우드톤 위스키 펍. 넓은 바 테이블 덕분에 혼술이나 조용한 데이트에 잘 어울립니다.',
    mood: 2, price: 2, space: 2, taste: 2, priceText: '잔당 1.2~2.2만원', cover: '커버차지 없음',
    hours: '19:00 ~ 03:00', whiskeys: ['글렌피딕 12y', '제임슨', '버팔로 트레이스'],
    naverQuery: 'A7X 구월동', lat: 37.4481, lng: 126.7035, station: '예술회관역', walkMin: 6
  },
  {
    id: 'sloth-bupyeong', name: '슬로스 레코드바', city: '인천', region: '부평', subloc: '인천 부평구 부평동 (평리단길)',
    desc: '부평 평리단길의 숨은 LP 뮤직 위스키 바. 좋은 바이닐 사운드와 함께 하이볼부터 싱글몰트까지 편안하게 즐길 수 있어요.',
    mood: 4, price: 2, space: 4, taste: 2, priceText: '잔당 1.2~2.1만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['몽키숄더', '산토리 가쿠빈', '와일드터키 101'],
    naverQuery: '슬로스 레코드바', lat: 37.4932, lng: 126.7248, station: '부평역', walkMin: 6
  },
  {
    id: 'whiskeasy-incheon', name: '위스키지', city: '인천', region: '송도·연수', subloc: '인천 연수구 송도동',
    desc: '위스키와 시가를 함께 취급하는 전문 몰트 공간. 묵직한 피트와 버번 페어링을 깊이 있게 탐험하기 좋습니다.',
    mood: 1, price: 4, space: 2, taste: 5, priceText: '잔당 1.8~3.4만원', cover: '커버차지 없음',
    hours: '19:00 ~ 01:00', whiskeys: ['라프로익 10y', '놉크릭 9y', '라가불린 16y'],
    naverQuery: '위스키지', lat: 37.3865, lng: 126.6520, station: '인천대입구역', walkMin: 8
  },

  // ===== 부산 (6곳) =====
  {
    id: 'pavox-haeundae', name: '파복스 해운대', city: '부산', region: '해운대', subloc: '부산 해운대구 우동',
    desc: '해운대를 대표하는 하이엔드 몰트·칵테일 바. 스코틀랜드 지도 인테리어와 압도적인 백바 컬렉션이 인상적입니다.',
    mood: 1, price: 5, space: 3, taste: 4, priceText: '잔당 2.4~4.0만원', cover: '커버차지 1만원',
    hours: '19:00 ~ 02:00', whiskeys: ['맥캘란 18y', '야마자키 12y', '아드벡 우가달'],
    naverQuery: '파복스 해운대', lat: 35.1618, lng: 129.1586, station: '해운대역', walkMin: 6
  },
  {
    id: 'thebooze-haeundae', name: '더부즈 해운대', city: '부산', region: '해운대', subloc: '부산 해운대구 중동',
    desc: '비밀의 문을 열고 들어가는 해운대 정통 스피크이지. 잔잔한 재즈와 함께 깊은 싱글몰트에 몰입하기 최고의 공간이에요.',
    mood: 1, price: 5, space: 2, taste: 5, priceText: '잔당 2.3~3.9만원', cover: '커버차지 1만원',
    hours: '19:00 ~ 02:00', whiskeys: ['라가불린 16y', '글렌드로낙 18y', '스프링뱅크 15y'],
    naverQuery: '더부즈 해운대', lat: 35.1628, lng: 129.1662, station: '중동역', walkMin: 7
  },
  {
    id: 'joseph-gwangan', name: '조셉바', city: '부산', region: '광안리', subloc: '부산 수영구 광안동',
    desc: '광안리에서 메뉴판 없이 손님 취향대로 추천해 주는 클래식 바. 아늑한 분위기에서 깊은 대화를 나누기 좋아요.',
    mood: 1, price: 3, space: 2, taste: 3, priceText: '잔당 1.6~2.8만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 12y', '글렌알라키 12y', '탈리스커 10y'],
    naverQuery: '조셉바 광안리', lat: 35.1542, lng: 129.1185, station: '광안역', walkMin: 8
  },
  {
    id: 'pyoryu-gwangan', name: '표류', city: '부산', region: '광안리', subloc: '부산 수영구 민락동 (광안리)',
    desc: '광안리 해변 인근의 감각적이고 힙한 바. 여행 중 캐주얼하게 위스키 하이볼과 칵테일을 즐기기 좋은 2차 성지예요.',
    mood: 4, price: 2, space: 4, taste: 2, priceText: '잔당 1.3~2.2만원', cover: '커버차지 없음',
    hours: '18:30 ~ 02:00', whiskeys: ['산토리 가쿠빈', '메이커스마크', '몽키숄더'],
    naverQuery: '표류 광안리', lat: 35.1558, lng: 129.1235, station: '금련산역', walkMin: 9
  },
  {
    id: 'woodside-seomyeon', name: '우드사이드', city: '부산', region: '서면·전포', subloc: '부산 부산진구 부전동 (서면)',
    desc: '서면의 클래식한 서재 감성 위스키 바. 우드톤 샹들리에 아래 수많은 위스키 진열장이 멋진 무드를 완성합니다.',
    mood: 2, price: 3, space: 3, taste: 3, priceText: '잔당 1.6~2.9만원', cover: '커버차지 없음',
    hours: '19:00 ~ 03:00', whiskeys: ['글렌피딕 15y', '버팔로 트레이스', '라프로익 10y'],
    naverQuery: '우드사이드 서면', lat: 35.1556, lng: 129.0604, station: '서면역', walkMin: 5
  },
  {
    id: 'heyjude-jeonpo', name: '헤이주드', city: '부산', region: '서면·전포', subloc: '부산 부산진구 전포동',
    desc: '전포역 인근 비틀즈 감성의 빈티지 위스키·칵테일 바. 아늑하고 편안해 혼술부터 데이트까지 두루 사랑받아요.',
    mood: 3, price: 2, space: 3, taste: 2, priceText: '잔당 1.3~2.3만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌리벳 12y', '제임슨', '불릿 버번'],
    naverQuery: '헤이주드 전포', lat: 35.1544, lng: 129.0648, station: '전포역', walkMin: 4
  },

  // ===== 대구 (2곳) =====
  {
    id: 'yakjeon-daegu', name: '약전', city: '대구', region: '동성로·교동', subloc: '대구 중구 남성로 (동성로)',
    desc: '대구 동성로 인근 고즈넉한 골목의 클래식 위스키·시가 바. 바텐더의 세심한 추천과 차분한 분위기가 일품입니다.',
    mood: 1, price: 4, space: 2, taste: 4, priceText: '잔당 1.8~3.2만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 14y', '아드벡 10y', '글렌드로낙 15y'],
    naverQuery: '약전 대구', lat: 35.8682, lng: 128.5918, station: '반월당역', walkMin: 6
  },
  {
    id: 'barjuok-daegu', name: '바주옥', city: '대구', region: '동성로·교동', subloc: '대구 중구 삼덕동 (동성로)',
    desc: '번화가에서 한 발짝 떨어져 조용하게 위스키와 칵테일에 집중할 수 있는 감성 바. 데이트와 혼술 모두 만족도가 높아요.',
    mood: 2, price: 3, space: 2, taste: 2, priceText: '잔당 1.5~2.6만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌모렌지 오리지널', '히비키 하모니', '메이커스마크'],
    naverQuery: '바주옥', lat: 35.8665, lng: 128.6012, station: '경대병원역', walkMin: 7
  },

  // ===== 대전 (2곳) =====
  {
    id: 'lelat-daejeon', name: '릴렛', city: '대전', region: '둔산동', subloc: '대전 서구 둔산동',
    desc: '둔산동의 호텔 라운지처럼 차분하고 우아한 클래식 바. 긴 바 테이블과 빼곡한 위스키 백바가 혼술·데이트에 완벽합니다.',
    mood: 1, price: 4, space: 2, taste: 3, priceText: '잔당 1.8~3.0만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['맥캘란 12y', '발베니 12y', '글렌알라키 15y'],
    naverQuery: '릴렛 대전', lat: 36.3515, lng: 127.3788, station: '시청역', walkMin: 6
  },
  {
    id: 'proof94-daejeon', name: '94프루프', city: '대전', region: '둔산·갈마', subloc: '대전 서구 갈마동',
    desc: '250여 종의 방대한 위스키를 합리적인 가격에 즐길 수 있는 대전 위스키 성지. 입문자부터 피트 마니아까지 모두 열광해요.',
    mood: 2, price: 2, space: 2, taste: 5, priceText: '잔당 1.1~2.4만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['아드벡 10y', '라프로익 쿼터캐스크', '와일드터키 101'],
    naverQuery: '94프루프', lat: 36.3510, lng: 127.3672, station: '갈마역', walkMin: 7
  },

  // ===== 광주 (2곳) =====
  {
    id: 'lebain-gwangju', name: '바 르뱅', city: '광주', region: '동명동', subloc: '광주 동구 동명동',
    desc: '동명동 골목의 높은 층고와 이국적 감성이 돋보이는 싱글몰트 전문 바. 독립병입 위스키와 깊은 향을 즐기기 좋습니다.',
    mood: 1, price: 4, space: 1, taste: 5, priceText: '잔당 1.8~3.2만원', cover: '커버차지 없음',
    hours: '19:00 ~ 01:30', whiskeys: ['스프링뱅크 10y', '라가불린 16y', '글렌드로낙 15y'],
    naverQuery: '바 르뱅', lat: 35.1496, lng: 126.9242, station: '문화전당역', walkMin: 8
  },
  {
    id: 'blanktape-gwangju', name: '블랭크테잎', city: '광주', region: '동명동', subloc: '광주 동구 동명동',
    desc: '잔잔한 재즈와 LP 사운드가 흐르는 동리단길 감성 위스키 바. 부드러운 하이볼과 싱글몰트를 편안하게 즐길 수 있어요.',
    mood: 3, price: 2, space: 3, taste: 2, priceText: '잔당 1.3~2.3만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌피딕 12y', '몽키숄더', '버팔로 트레이스'],
    naverQuery: '블랭크테잎', lat: 35.1508, lng: 126.9268, station: '문화전당역', walkMin: 9
  },

  // ===== 강원 (3곳) =====
  {
    id: 'nugnas-gangneung', name: '누그나스', city: '강원', region: '강릉', subloc: '강원 강릉시 교동',
    desc: '강릉 교동의 차분하고 정돈된 바 테이블 중심 위스키·칵테일 바. 바텐더와 대화하며 조용히 즐기기 좋아요.',
    mood: 1, price: 3, space: 2, taste: 3, priceText: '잔당 1.5~2.7만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 12y', '글렌모렌지 10y', '메이커스마크'],
    naverQuery: '누그나스 강릉', lat: 37.7642, lng: 128.8785, station: '강릉 교동', walkMin: 5
  },
  {
    id: 'aloha-gangneung', name: '알로하라운지', city: '강원', region: '강릉', subloc: '강원 강릉시 포남동',
    desc: '강릉 시내 야경이 탁 트인 스카이라운지 위스키 바. 폭넓은 싱글몰트와 하이볼을 여유롭게 즐길 수 있어요.',
    mood: 3, price: 3, space: 4, taste: 2, priceText: '잔당 1.5~2.8만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['맥캘란 12y', '글렌피딕 15y', '조니워커 블루'],
    naverQuery: '알로하라운지 강릉', lat: 37.7688, lng: 128.9052, station: '강릉역', walkMin: 8
  },
  {
    id: 'doors-gangneung', name: '도어즈 LP바', city: '강원', region: '강릉', subloc: '강원 강릉시 임당동',
    desc: '레트로한 바이닐 감성이 가득한 강릉 대표 LP 위스키 바. 좋은 아날로그 음악과 함께 여행의 밤을 마무리하기 좋아요.',
    mood: 3, price: 2, space: 3, taste: 2, priceText: '잔당 1.2~2.2만원', cover: '커버차지 없음',
    hours: '19:00 ~ 01:00', whiskeys: ['제임슨', '산토리 가쿠빈', '와일드터키 101'],
    naverQuery: '도어즈 강릉', lat: 37.7568, lng: 128.8962, station: '강릉 중앙시장', walkMin: 6
  },

  // ===== 충청 (3곳) =====
  {
    id: 'geunbon-cheonan', name: '근본', city: '충청', region: '천안', subloc: '충남 천안시 서북구 불당동',
    desc: '천안 신불당의 감각적인 칵테일·위스키 바. 깔끔하고 트렌디한 무드에서 완성도 높은 술을 즐길 수 있어요.',
    mood: 2, price: 3, space: 3, taste: 3, priceText: '잔당 1.5~2.7만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 12y', '글렌알라키 12y', '우드포드 리저브'],
    naverQuery: '근본 천안 불당', lat: 36.8142, lng: 127.1088, station: '천안아산역', walkMin: 10
  },
  {
    id: 'yahwa-cheonan', name: '야화 신불당점', city: '충청', region: '천안', subloc: '충남 천안시 서북구 불당동',
    desc: '혼자 들러도 어색하지 않은 캐주얼 혼술 위스키 바. 다양한 하이볼과 데일리 위스키를 부담 없이 즐기기 좋아요.',
    mood: 3, price: 2, space: 1, taste: 2, priceText: '잔당 1.1~2.0만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['몽키숄더', '메이커스마크', '글렌피딕 12y'],
    naverQuery: '야화 신불당점', lat: 36.8128, lng: 127.1072, station: '신불당', walkMin: 5
  },
  {
    id: 'nowave-cheongju', name: '노웨이브 지웰시티점', city: '충청', region: '청주', subloc: '충북 청주시 흥덕구 복대동',
    desc: '내향인도 편안하게 위스키를 즐길 수 있는 차분한 다찌석 중심 바. 합리적인 가격에 다양한 몰트를 시음하기 좋아요.',
    mood: 1, price: 2, space: 1, taste: 3, priceText: '잔당 1.2~2.3만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['글렌리벳 12y', '보모어 12y', '버팔로 트레이스'],
    naverQuery: '노웨이브 지웰시티점', lat: 36.6438, lng: 127.4272, station: '청주 지웰시티', walkMin: 4
  },

  // ===== 전라 (2곳) =====
  {
    id: 'jinjoodoga-jeonju', name: '진주도가', city: '전라', region: '전주', subloc: '전북 전주시 완산구 중앙동 (웨리단길)',
    desc: '전주 웨리단길의 한옥 감성과 클래식 바 무드가 어우러진 명소. 탄탄한 싱글몰트와 시그니처 칵테일로 유명해요.',
    mood: 2, price: 3, space: 2, taste: 3, priceText: '잔당 1.5~2.7만원', cover: '커버차지 없음',
    hours: '18:30 ~ 01:00', whiskeys: ['발베니 14y', '히비키 하모니', '기원 배치'],
    naverQuery: '진주도가 전주', lat: 35.8178, lng: 127.1452, station: '전주 웨리단길', walkMin: 4
  },
  {
    id: 'deokgil-jeonju', name: '덕길상회', city: '전라', region: '전주', subloc: '전북 전주시 완산구 고사동 (객리단길)',
    desc: '전주 객리단길 골목의 아늑하고 편안한 위스키·하이볼 바. 여행 중 가볍게 들러 대화 나누기 좋은 감성 공간이에요.',
    mood: 3, price: 2, space: 3, taste: 2, priceText: '잔당 1.2~2.1만원', cover: '커버차지 없음',
    hours: '18:30 ~ 01:30', whiskeys: ['글렌피딕 12y', '산토리 가쿠빈', '메이커스마크'],
    naverQuery: '덕길상회 전주', lat: 35.8186, lng: 127.1415, station: '전주 객리단길', walkMin: 5
  },

  // ===== 경상 (3곳 — 울산·창원) =====
  {
    id: 'nowave-ulsan', name: '노웨이브 울산삼산점', city: '경상', region: '울산', subloc: '울산 남구 삼산동',
    desc: '울산 삼산동에서 프라이빗하게 혼술과 위스키에 집중할 수 있는 차분한 다찌석 바. 입문자도 편안하게 추천받을 수 있어요.',
    mood: 1, price: 2, space: 1, taste: 3, priceText: '잔당 1.2~2.4만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['발베니 12y', '아드벡 10y', '우드포드 리저브'],
    naverQuery: '노웨이브 울산삼산점', lat: 35.5396, lng: 129.3358, station: '울산 삼산동', walkMin: 5
  },
  {
    id: 'speakeasy-den-cw', name: '스피키지 덴', city: '경상', region: '창원', subloc: '경남 창원시 성산구 상남동',
    desc: '숨겨진 문을 찾아 들어가는 창원 대표 정통 스피크이지 바. 고급스럽고 조용한 공간에서 다양한 싱글몰트를 즐길 수 있어요.',
    mood: 1, price: 4, space: 2, taste: 4, priceText: '잔당 1.8~3.2만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['맥캘란 15y', '글렌드로낙 15y', '라가불린 16y'],
    naverQuery: '스피키지 덴 창원', lat: 35.2225, lng: 128.6852, station: '창원 상남동', walkMin: 5
  },
  {
    id: 'wesukki-cw', name: '위스끼', city: '경상', region: '창원', subloc: '경남 창원시 성산구 중앙동',
    desc: '수많은 위스키 보틀 인테리어와 좋은 LP 사운드가 어우러진 창원 중앙동의 감성 위스키·LP 바입니다.',
    mood: 3, price: 2, space: 3, taste: 3, priceText: '잔당 1.3~2.4만원', cover: '커버차지 없음',
    hours: '19:00 ~ 02:00', whiskeys: ['탈리스커 10y', '메이커스마크', '글렌피딕 12y'],
    naverQuery: '위스끼 창원', lat: 35.2252, lng: 128.6810, station: '창원 중앙동', walkMin: 5
  },

  // ===== 제주 (2곳) =====
  {
    id: 'thebooze-jeju', name: '더 부즈 제주', city: '제주', region: '제주시', subloc: '제주 제주시 노형동',
    desc: '비밀 전화부스 문을 열고 들어가는 제주의 대표 스피크이지 바. 수준 높은 싱글몰트 라인업과 클래식 무드를 자랑해요.',
    mood: 1, price: 4, space: 2, taste: 4, priceText: '잔당 2.0~3.6만원', cover: '커버차지 있음',
    hours: '19:00 ~ 02:00', whiskeys: ['맥캘란 15y', '글렌모렌지 시그넷', '아드벡 10y'],
    naverQuery: '더 부즈 제주', lat: 33.4858, lng: 126.4812, station: '노형오거리', walkMin: 4
  },
  {
    id: 'barseri-jeju', name: '바 세리', city: '제주', region: '제주시', subloc: '제주 제주시 일도일동 (원도심)',
    desc: '제주 원도심의 차분하고 우아한 밤을 담은 위스키·칵테일 바. 혼자 여행 중 들러도 편안하게 한 잔 즐기기 좋습니다.',
    mood: 2, price: 3, space: 2, taste: 2, priceText: '잔당 1.6~2.8만원', cover: '커버차지 없음',
    hours: '19:00 ~ 01:00', whiskeys: ['발베니 12y', '기원 배치', '히비키 하모니'],
    naverQuery: '바 세리 제주', lat: 33.5132, lng: 126.5262, station: '제주 중앙로', walkMin: 5
  }
];

// Nationwide camera presets for Leaflet Map (South Korea — comfortable zoom 14 default!)
const MAP_CITY_VIEWS = {
  '전체': { lat: 36.38, lng: 127.78, zoom: 7 },
  '서울': { lat: 37.535, lng: 126.995, zoom: 14 },
  '경기': { lat: 37.391, lng: 126.952, zoom: 14 },
  '인천': { lat: 37.450, lng: 126.702, zoom: 14 },
  '부산': { lat: 35.158, lng: 129.115, zoom: 14 },
  '대구': { lat: 35.868, lng: 128.596, zoom: 14 },
  '대전': { lat: 36.351, lng: 127.373, zoom: 14 },
  '광주': { lat: 35.150, lng: 126.925, zoom: 14 },
  '강원': { lat: 37.762, lng: 128.892, zoom: 14 },
  '충청': { lat: 36.814, lng: 127.108, zoom: 14 },
  '전라': { lat: 35.818, lng: 127.143, zoom: 14 },
  '경상': { lat: 35.224, lng: 128.683, zoom: 14 },
  '제주': { lat: 33.498, lng: 126.505, zoom: 14 }
};

const LABEL_MAP = {
  mood: ['매우 조용한', '차분한', '적당한 분위기', '경쾌한', '활기찬'],
  price: ['가성비', '합리적 가격', '중간 가격대', '고급진', '프리미엄'],
  space: ['혼술 최적', '소수 아늑한', '혼술·둘다 OK', '소모임 추천', '모임에 좋은'],
  taste: ['가볍고 달콤', '부드러운', '밸런스 좋은', '묵직한', '강렬·피트']
};

const DOT_SIZES = [
  { outer: 46, inner: 34 },
  { outer: 38, inner: 28 },
  { outer: 30, inner: 22 },
  { outer: 38, inner: 28 },
  { outer: 46, inner: 34 }
];
