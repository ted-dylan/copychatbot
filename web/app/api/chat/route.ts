import { GoogleGenerativeAI } from '@google/generative-ai';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// 1. Firebase Admin Initialization (Updated for Vercel)
if (!admin.apps.length) {
    try {
        // Option A: Environment Variable (Best for Vercel)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        // Option B: Local File (Fallback)
        else {
            const keyPath = path.join(process.cwd(), '../serviceAccountKey.json');
            if (fs.existsSync(keyPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            } else {
                console.warn('Service account key not found. Please set FIREBASE_SERVICE_ACCOUNT_KEY env var.');
            }
        }
    } catch (e) {
        console.error('Firebase init error:', e);
    }
}

// 2. Main POST Handler
export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const lastMessage = messages[messages.length - 1];
        const userQuery = lastMessage.content;

        console.log('Received query:', userQuery);

        // --- RAG Logic (Simple) ---
        let contextData = "";
        try {
            if (admin.apps.length > 0) {
                const db = admin.firestore();
                const cardsRef = db.collection('copywriting_cards');
                const keywords = userQuery.split(/\s+/).filter((w: string) => w.length > 1).slice(0, 5);

                if (keywords.length > 0) {
                    const snapshot = await cardsRef.where('situations', 'array-contains-any', keywords).limit(3).get();
                    let docs = snapshot.docs;
                    if (docs.length === 0) {
                        const snapshot2 = await cardsRef.where('nuances', 'array-contains-any', keywords).limit(3).get();
                        docs = snapshot2.docs;
                    }

                    if (docs.length > 0) {
                        contextData = docs.map(doc => {
                            const d = doc.data();
                            return `- 뉘앙스: ${d.nuances?.join(', ')}\n- 예문: ${d.examples?.join(', ')}`;
                        }).join('\n\n');
                        console.log('Found context cards:', docs.length);
                    }
                }
            }
        } catch (dbErr) {
            console.error('Firestore lookup failed (non-fatal):', dbErr);
        }

        // --- Construct System Prompt ---
        const systemPrompt = `
당신은 대한민국 최고의 '감성 카피라이터'입니다.
Context Data: ${contextData || "없음"}
User Request: ${userQuery}

작성 원칙:
1. 참고 데이터('Context Data')의 뉘앙스를 반영하여, 고객의 마음을 울리는 한 줄 카피를 3~5개 제안하세요.
2. 설명조("~입니다") 대신, 바로 카피 문장부터 보여주세요.
3. 각 카피 아래엔 짧게(한 문장) 이 카피의 의도를 덧붙이세요.
4. 이모지를 적절히 사용하여 감성적인 분위기를 연출하세요.
`;

        // --- Native Google AI Call ---
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing');

        const genAI = new GoogleGenerativeAI(apiKey);
        // Switching to 2.5-flash as 2.0 is rate limited and 1.5 is 404
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log('Generating content stream with gemini-2.5-flash...');
        const streamingResp = await model.generateContentStream(systemPrompt);

        // --- Create Manual ReadableStream ---
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of streamingResp.stream) {
                        const chunkText = chunk.text();
                        controller.enqueue(encoder.encode(chunkText));
                    }
                } catch (e) {
                    console.error('Stream error:', e);
                    controller.error(e);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

    } catch (error: any) {
        console.error('Critical Error in POST /api/chat:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
