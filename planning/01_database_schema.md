### 1. Firestore Collection Name
`copywriting_cards`

### 2. Document Data Structure (JSON)
각 문서는 하나의 '단어' 정보를 담으며, 아래 필드명을 정확히 따라야 한다.

{
  // 1. 메타 정보 & 카테고리
  "category": "String",        // 예: "문제점 지적하기", "긴박감 나타내기" (상위 카테고리)
  "word": "String",            // 예: "실수", "돈 버는"
  "definition": "String",      // 단어의 정의

  // 2. 검색 및 필터링 태그 (Array 형태 필수)
  "nuances": ["String"],       // 예: ["고민", "리스크"]
  "situations": ["String"],    // 예: ["부모_모임", "기업_전략"]
  "target_audience": ["String"], // 예: ["직장인", "경영진"]

  // 3. PESONA 설득 논리 (Nested Object)
  "pesona_analysis": {
    "problem": "String",       // 문제 제기
    "empathy": "String",       // 공감 (EQ 핵심)
    "solution": "String",      // 해결책
    "offer": "String",         // 제안 (오타 수정: offfer -> offer)
    "narrowing": "String",     // 타겟 좁히기
    "action": "String"         // 행동 촉구 (오타 수정: acrion -> action)
  },

  // 4. 예문 데이터
  "examples": ["String"]       // 예문 리스트 (1., 2., 3. 번호 제거하고 내용만 저장)
}

### 3. Evaluation
이 구조는 `pesona_analysis`의 `empathy`와 `situations` 태그를 통해 사용자의 감정과 상황을 정밀하게 매칭할 수 있어, 공감 기반의 고도화된 카피라이팅 RAG 시스템 구축에 매우 적합합니다.
