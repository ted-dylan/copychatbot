import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchExpressions } from '@/lib/rag';

// Tone definitions for different writing styles
const TONE_STYLES: Record<string, string> = {
    humorous: '유머러스하고 재치있게. 위트있는 비유와 드립을 활용. 독자가 웃음지을 수 있게.',
    emotional: '감성적이고 따뜻하게. 공감을 이끌어내는 서정적 문체. 마음을 터치하는 표현.',
    professional: '전문적이고 신뢰감있게. 명확한 정보 전달. 품격있는 톤.',
    trendy: 'MZ세대 트렌디하게. 최신 밈과 유행어 활용. 힙하고 쿨하게.',
    motivational: '동기부여하고 응원하는 톤. 힘을 주는 메시지. 긍정적 에너지.'
};

// Check if RAG is enabled (Upstash credentials exist)
function isRagEnabled(): boolean {
    return !!(process.env.UPSTASH_VECTOR_REST_URL &&
        process.env.UPSTASH_VECTOR_REST_TOKEN &&
        process.env.OPENAI_API_KEY);
}

// Main POST Handler - Platform-specific content generation
export async function POST(req: Request) {
    try {
        const { topic, tone = 'emotional', apiKey: clientApiKey } = await req.json();

        if (!topic || typeof topic !== 'string') {
            return new Response(JSON.stringify({ error: 'Topic is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const toneStyle = TONE_STYLES[tone] || TONE_STYLES.emotional;
        console.log('Received topic:', topic, 'with tone:', tone);

        // --- RAG: Search for relevant copywriting expressions ---
        let ragContext = '';
        if (isRagEnabled()) {
            try {
                console.log('🔍 RAG enabled - searching for relevant expressions...');
                const relevantExpressions = await searchExpressions(topic, 5);

                if (relevantExpressions.length > 0) {
                    ragContext = `
[참고할 카피라이팅 표현]
다음은 주제와 관련된 검증된 카피라이팅 표현들입니다. 이 표현들을 참고하여 더 설득력 있는 카피를 작성하세요:

${relevantExpressions.map((expr, i) => `
${i + 1}. "${expr.word}"
   - 정의: ${expr.definition}
   - 뉘앙스: ${expr.nuances}
   - 예시: ${expr.examples}
`).join('')}
`;
                    console.log(`✅ Found ${relevantExpressions.length} relevant expressions`);
                }
            } catch (ragError) {
                console.warn('⚠️ RAG search failed, continuing without:', ragError);
            }
        } else {
            console.log('ℹ️ RAG disabled - missing credentials');
        }

        // --- Construct System Prompt for Platform-Specific Content ---
        const systemPrompt = `
당신은 대한민국 최고의 '소셜 미디어 카피라이터'입니다.
주어진 주제로 Threads와 X(Twitter)에 올릴 최적화된 카피를 생성해주세요.

주제: ${topic}
톤/스타일: ${toneStyle}
${ragContext}

응답 형식 (반드시 아래 JSON 형식으로만 응답):
{
  "threads": {
    "content": "Threads용 카피 (500자 이내, 지정된 톤으로)",
    "hashtags": ["관련해시태그1", "관련해시태그2", "관련해시태그3"]
  },
  "x": {
    "content": "X용 카피 (280자 이내, 지정된 톤으로, 핵심 메시지 전달)",
    "hashtags": ["관련해시태그1", "관련해시태그2"]
  }
}

작성 원칙:
1. Threads: 지정된 톤으로 스토리텔링. 500자 이내. 줄바꿈을 활용해 읽기 쉽게.
2. X: 지정된 톤으로 임팩트있게. 280자(한글 약 140자) 이내. 바이럴 될 수 있는 훅이 있게.
3. 해시태그는 한글로, # 없이 텍스트만.
4. 이모지(이모티콘) 절대 사용 금지.
5. 굵은 글씨(**), 기울임(*), 마크다운 서식 절대 사용 금지. 순수 텍스트만 작성.
6. 특수문자 중 <, >, & 사용 금지.
7. 반드시 유효한 JSON 형식으로만 응답. 다른 텍스트 없이 JSON만.
${ragContext ? '8. 위의 [참고할 카피라이팅 표현]을 활용하여 더 전문적이고 설득력 있는 카피를 작성하세요.' : ''}
`;

        // --- Native Google AI Call ---
        // BYOK: Client must provide their own API key (no server fallback)
        if (!clientApiKey) {
            return new Response(JSON.stringify({
                error: 'API 키가 필요합니다. 설정 페이지에서 Gemini API 키를 등록해주세요.',
                needsApiKey: true
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const apiKey = clientApiKey;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        console.log('Generating platform-specific content...');
        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        console.log('Raw response:', responseText);

        // Parse and validate JSON
        let parsedContent;
        try {
            parsedContent = JSON.parse(responseText);
        } catch (parseError) {
            // Try to extract JSON from response if wrapped in markdown
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedContent = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse AI response as JSON');
            }
        }

        // Validate structure
        if (!parsedContent.threads?.content || !parsedContent.x?.content) {
            throw new Error('Invalid response structure');
        }

        // Enforce character limits
        if (parsedContent.threads.content.length > 500) {
            parsedContent.threads.content = parsedContent.threads.content.substring(0, 497) + '...';
        }
        if (parsedContent.x.content.length > 280) {
            parsedContent.x.content = parsedContent.x.content.substring(0, 277) + '...';
        }

        return new Response(JSON.stringify(parsedContent), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Critical Error in POST /api/chat:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
