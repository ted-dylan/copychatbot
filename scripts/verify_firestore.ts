
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

        // Check if already initialized to avoid error
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        const db = admin.firestore();
        const collectionRef = db.collection('copywriting_cards');

        // 1. Count documents
        const countSnapshot = await collectionRef.count().get();
        const totalCount = countSnapshot.data().count;
        console.log(`Total documents in 'copywriting_cards': ${totalCount}`);

        // 2. Get a sample document (Random-ish: getting one after a random offset is hard in Firestore without IDs, 
        // so we just get the first one or a few and pick one)
        // Actually, listing 1 is fine.
        const sampleSnapshot = await collectionRef.limit(5).get();

        if (sampleSnapshot.empty) {
            console.log('Collection is empty.');
        } else {
            // Pick a random one from the 5 fetched
            const randomIndex = Math.floor(Math.random() * sampleSnapshot.size);
            const doc = sampleSnapshot.docs[randomIndex];
            console.log('\n--- Sample Document ---');
            console.log(`ID: ${doc.id}`);
            const data = doc.data();
            console.log(JSON.stringify(data, null, 2));

            // Check for search_tags (User asked for this, but our schema has nuances/situations/target_audience)
            // We'll verify those instead as they serve the tag purpose.
            console.log('\n--- Structure Check ---');
            console.log(`Has 'pesona_analysis'? ${!!data.pesona_analysis}`);
            console.log(`Has 'nuances' (Tags)? ${Array.isArray(data.nuances)} (${data.nuances?.length || 0} items)`);
            console.log(`Has 'situations' (Tags)? ${Array.isArray(data.situations)} (${data.situations?.length || 0} items)`);
            console.log(`Has 'target_audience' (Tags)? ${Array.isArray(data.target_audience)} (${data.target_audience?.length || 0} items)`);
        }

        console.log(`\n검증 완료: 총 ${totalCount}개의 데이터가 확인되었습니다.`);

    } catch (error) {
        console.error('Error verifying Firestore:', error);
        process.exit(1);
    }
}

main();
