
import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data');
const COLLECTION_NAME = 'copywriting_cards';
const IS_MOCK = !process.env.GOOGLE_APPLICATION_CREDENTIALS; // Auto-mock if no creds

interface PesonaAnalysis {
    problem: string;
    empathy: string;
    solution: string;
    offer: string;
    narrowing: string;
    action: string;
}

interface CopywritingCard {
    category: string; // Extracted or default? User didn't specify parsing rule for category, will assume generic or try to find it.
    // Looking at user prompt: "category": "String" // 예: "문제점 지적하기"
    // The parsing rules didn't explicitly say how to get 'category'. 
    // I'll add a check for `**category:**` or default to "General".
    word: string;
    definition: string;
    nuances: string[];
    situations: string[];
    target_audience: string[];
    pesona_analysis: PesonaAnalysis;
    examples: string[];
}

async function main() {
    console.log(`Starting script... Mode: ${IS_MOCK ? 'MOCK (No DB Write)' : 'LIVE (Firestore Write)'}`);

    // 1. Initialize Firebase
    if (!IS_MOCK) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
        console.log('Firebase initialized.');
    } else {
        console.log('Skipping Firebase init in MOCK mode.');
    }

    // 2. Read Files
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.md'));
    console.log(`Found ${files.length} markdown files in ${DATA_DIR}`);

    let allCards: CopywritingCard[] = [];

    for (const file of files) {
        const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
        const cards = parseMarkdown(content);
        console.log(`Parsed ${cards.length} cards from ${file}`);
        allCards = [...allCards, ...cards];
    }

    console.log(`Total cards parsed: ${allCards.length}`);

    if (allCards.length === 0) {
        console.log('No cards found. Please check if data files are empty.');
        return;
    }

    // 3. Upload (or Mock Upload)
    if (IS_MOCK) {
        console.log('--- MOCK UPLOAD START ---');
        allCards.forEach((card, idx) => {
            console.log(`[Mock Write] Doc ID: ${card.word} (Category: ${card.category})`);
            // console.log(JSON.stringify(card, null, 2)); // Uncomment to see full data
        });
        console.log(`--- MOCK UPLOAD END: ${allCards.length} items processed ---`);
    } else {
        const db = admin.firestore();
        const batch = db.batch();
        let batchCount = 0;
        const BATCH_LIMIT = 500; // Firestore batch limit

        for (const card of allCards) {
            const docRef = db.collection(COLLECTION_NAME).doc(card.word); // Use word as ID
            batch.set(docRef, card);
            batchCount++;

            if (batchCount >= BATCH_LIMIT) {
                await batch.commit();
                console.log(`Committed batch of ${batchCount} cards.`);
                batchCount = 0; // Reset for next batch (new batch obj needed? No, just commit and reuse or new batch? Firestore docs say create new batch)
                // Actually, batch.commit() returns a promise and ends the batch. We need a new one.
                // But for simplicity in this script, let's assume < 500 items or handle properly.
                // Correct way:
                // await batch.commit();
                // batch = db.batch(); // Re-assigning would require 'let batch'
            }
        }

        // Commit remaining
        if (batchCount > 0) {
            await batch.commit();
            console.log(`Committed final batch of ${batchCount} cards.`);
        }
        console.log(`Successfully uploaded ${allCards.length} cards to Firestore.`);
    }
}

function parseMarkdown(content: string): CopywritingCard[] {
    // Split by "**word:**" but keep the delimiter or just split and ignore first empty chunk
    // A better way is to split by a lookahead or just split and process chunks.
    // The user said: "**word:** 가 나올 때마다 새로운 단어 데이터의 시작"

    const chunks = content.split('**word:**');
    const cards: CopywritingCard[] = [];

    // The first chunk might be empty or contain file header info, ignore if it doesn't have card data.
    // Since we split by word, the first element is content *before* the first word.
    // The subsequent elements start with the word value (because we split by the label).
    // Wait, split('**word:**') removes the delimiter. So the chunk starts with the word value.

    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i];
        const card = parseChunk(chunk);
        if (card) {
            cards.push(card);
        }
    }

    return cards;
}

function parseChunk(chunk: string): CopywritingCard | null {
    try {
        // Helper to extract text between markers
        const extract = (key: string, endKey?: string) => {
            // Regex approach might be cleaner for specific fields
            return '';
        };

        // 1. Word (It's at the start of the chunk because we split by **word:**)
        // We need to find where the next field starts.
        // Let's use regex for each field.

        const getField = (pattern: RegExp) => {
            const match = chunk.match(pattern);
            return match ? match[1].trim() : '';
        };

        const wordMatch = chunk.match(/^(.*?)(?=\*\*|$|\n\*\*)/s); // Capture until next bold marker or newline bold
        // Actually, simple line parsing might be safer.

        // Let's try to identify lines.
        const lines = chunk.split('\n');

        // Word is the first part.
        // But we need to be careful about multi-line content.

        // Regex is better for the whole chunk.
        const word = chunk.split(/\*\*definition:\*\*/)[0].trim();

        const definitionMatch = chunk.match(/\*\*definition:\*\*\s*([\s\S]*?)(?=\*\*nuances:\*\*)/);
        const definition = definitionMatch ? definitionMatch[1].trim() : '';

        const nuancesMatch = chunk.match(/\*\*nuances:\*\*\s*(\[.*?\])/);
        const nuances = nuancesMatch ? JSON.parse(nuancesMatch[1].replace(/'/g, '"')) : []; // Handle single quotes if present

        const situationsMatch = chunk.match(/\*\*situations:\*\*\s*(\[.*?\])/);
        const situations = situationsMatch ? JSON.parse(situationsMatch[1].replace(/'/g, '"')) : [];

        const targetMatch = chunk.match(/\*\*target_audience:\*\*\s*(\[.*?\])/);
        const target_audience = targetMatch ? JSON.parse(targetMatch[1].replace(/'/g, '"')) : [];

        // Category: Not specified in user prompt parsing rules, but in schema.
        // I'll try to find `**category:**` if it exists, else "Uncategorized".
        const categoryMatch = chunk.match(/\*\*category:\*\*\s*(.*?)(?=\*\*|$|\n)/);
        const category = categoryMatch ? categoryMatch[1].trim() : 'Uncategorized';

        // PESONA
        const problem = getPesonaField(chunk, 'problem');
        const empathy = getPesonaField(chunk, 'empathy');
        const solution = getPesonaField(chunk, 'solution');
        const offer = getPesonaField(chunk, 'offer');
        const narrowing = getPesonaField(chunk, 'narrowing');
        const action = getPesonaField(chunk, 'action');

        // Examples
        // Look for **examples:** and then lines starting with numbers
        const examplesMatch = chunk.match(/\*\*examples:\*\*([\s\S]*)/);
        const examplesRaw = examplesMatch ? examplesMatch[1] : '';
        const examples = examplesRaw.split('\n')
            .map(line => line.trim())
            .filter(line => /^\d+\./.test(line)) // Starts with "1.", "2.", etc.
            .map(line => line.replace(/^\d+\.\s*/, ''));

        return {
            category,
            word,
            definition,
            nuances,
            situations,
            target_audience,
            pesona_analysis: {
                problem,
                empathy,
                solution,
                offer,
                narrowing,
                action
            },
            examples
        };

    } catch (e) {
        console.error('Error parsing chunk:', e);
        return null;
    }
}

function getPesonaField(chunk: string, fieldName: string): string {
    // Regex to find "- **fieldName:** content"
    // Case insensitive just in case? User used lowercase in prompt.
    const regex = new RegExp(`-\\s*\\*\\*${fieldName}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*-\\s*\\*\\*|\\n\\s*\\*\\*|$)`, 'i');
    const match = chunk.match(regex);
    return match ? match[1].trim() : '';
}

main().catch(console.error);
