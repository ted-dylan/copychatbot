
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';

const KEY_PATH = path.join(process.cwd(), 'serviceAccountKey.json');

async function main() {
    if (!fs.existsSync(KEY_PATH)) {
        console.error('Error: serviceAccountKey.json not found.');
        process.exit(1);
    }

    try {
        const serviceAccount = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        const db = admin.firestore();
        const collectionRef = db.collection('copywriting_cards');

        // Get a random document
        // Since we can't easily get a random doc by ID, we'll fetch a small batch and pick one.
        // To make it more random, we could use a random offset, but for now let's just grab a few.
        const snapshot = await collectionRef.limit(20).get();

        if (snapshot.empty) {
            console.log('No cards found.');
            return;
        }

        const randomIndex = Math.floor(Math.random() * snapshot.size);
        const doc = snapshot.docs[randomIndex];
        const data = doc.data();

        // Format output like a real Chatbot/UI response
        console.log('\n==================================================');
        console.log(`✨ 카피라이팅 카드: ${data.word}`);
        console.log('==================================================');
        console.log(`📂 카테고리: ${data.category}`);
        console.log('--------------------------------------------------');
        console.log(`📖 정의`);
        console.log(`${data.definition}`);
        console.log('--------------------------------------------------');
        console.log(`🎨 뉘앙스 (Nuances)`);
        console.log(data.nuances?.map((n: string) => `• ${n}`).join('\n') || '-');
        console.log('\n🎯 추천 사용 상황 (Situations)');
        console.log(data.situations?.map((s: string) => `• ${s}`).join('\n') || '-');
        console.log('\n👥 타겟 독자 (Target Audience)');
        console.log(data.target_audience?.map((t: string) => `• ${t}`).join('\n') || '-');
        console.log('--------------------------------------------------');
        console.log(`🧠 PESONA 분석`);
        if (data.pesona_analysis) {
            console.log(`🔴 Problem (문제): ${data.pesona_analysis.problem}`);
            console.log(`🟠 Empathy (공감): ${data.pesona_analysis.empathy}`);
            console.log(`🟡 Solution (해결): ${data.pesona_analysis.solution}`);
            console.log(`🟢 Offer (제안): ${data.pesona_analysis.offer}`);
            console.log(`🔵 Narrowing (타겟): ${data.pesona_analysis.narrowing}`);
            console.log(`🟣 Action (행동): ${data.pesona_analysis.action}`);
        } else {
            console.log('분석 데이터 없음');
        }
        console.log('--------------------------------------------------');
        console.log(`💡 실전 예문`);
        console.log(data.examples?.map((e: string, i: number) => `${i + 1}. ${e}`).join('\n') || '-');
        console.log('==================================================\n');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
