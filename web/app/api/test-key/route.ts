import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    try {
        const { apiKey } = await req.json();

        if (!apiKey || typeof apiKey !== 'string') {
            return new Response(JSON.stringify({ error: 'API 키가 필요합니다' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Test the API key with a simple request
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent("Say 'API key is valid' in Korean, just the phrase.");
        const response = result.response.text();

        if (response) {
            return new Response(JSON.stringify({ success: true, message: 'API 키가 정상 작동합니다' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            throw new Error('No response from API');
        }

    } catch (error: any) {
        console.error('API key test error:', error);

        let errorMessage = 'API 키 테스트에 실패했습니다';

        if (error.message?.includes('API_KEY_INVALID')) {
            errorMessage = '유효하지 않은 API 키입니다';
        } else if (error.message?.includes('PERMISSION_DENIED')) {
            errorMessage = 'API 키 권한이 없습니다';
        } else if (error.message?.includes('QUOTA_EXCEEDED')) {
            errorMessage = 'API 할당량을 초과했습니다';
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
