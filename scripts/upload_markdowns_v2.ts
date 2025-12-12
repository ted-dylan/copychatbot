import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data');
const COLLECTION_NAME = 'copywriting_cards';
const KEY_PATH = path.join(process.cwd(), 'serviceAccountKey.json');
const IS_MOCK = !fs.existsSync(KEY_PATH);

interface PesonaAnalysis {
    problem: string;
    empathy: string;
    solution: string;
    offer: string;
    narrowing: string;
    action: string;
}

interface CopywritingCard {
    category: string;
    word: string;
    definition: string;
    nuances: string[];
    situations: string[];
    target_audience: string[];
    pesona_analysis: PesonaAnalysis;
    examples: string[];
}

async function main() {
    console.log(`Starting V2 script... Mode: ${IS_MOCK ? 'MOCK' : 'LIVE'}`);

    if (!IS_MOCK) {
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('Firebase initialized successfully.');
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            process.exit(1);
        }
    }

    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.md'));
    let allCards: CopywritingCard[] = [];

    for (const file of files) {
        const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
        const cards = parseMarkdownV2(content, file);
        console.log(`Parsed ${cards.length} cards from ${file}`);
        allCards = [...allCards, ...cards];
    }

    console.log(`Total cards parsed: ${allCards.length}`);

    if (IS_MOCK) {
        // Print a few samples to verify
        if (allCards.length > 0) {
            console.log('Sample Card 1:', JSON.stringify(allCards[0], null, 2));
            console.log('Sample Card Last:', JSON.stringify(allCards[allCards.length - 1], null, 2));
        }
    } else {
        // Upload logic
        const db = admin.firestore();

        console.log('Deleting existing collection...');
        await deleteCollection(db, COLLECTION_NAME, 400);
        console.log('Collection deleted.');

        const chunks = chunkArray(allCards, 400);
        let totalUploaded = 0;

        for (const chunk of chunks) {
            const batch = db.batch();
            for (const card of chunk) {
                const docId = card.word.replace(/\//g, '_');
                const docRef = db.collection(COLLECTION_NAME).doc(docId);
                batch.set(docRef, card);
            }
            await batch.commit();
            totalUploaded += chunk.length;
            console.log(`Committed batch of ${chunk.length} cards. Total: ${totalUploaded}`);
        }
        console.log(`Successfully uploaded ${allCards.length} cards.`);
    }
}

function chunkArray<T>(array: T[], size: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

function parseMarkdownV2(content: string, filename: string): CopywritingCard[] {
    const lines = content.split('\n');
    const cards: CopywritingCard[] = [];

    let currentCard: Partial<CopywritingCard> | null = null;
    let buffer: string[] = [];
    let currentCategory = 'Uncategorized';

    const saveCard = () => {
        if (currentCard && currentCard.word) {
            const fullText = buffer.join('\n');
            fillCardData(currentCard, fullText);

            // Defaults
            if (!currentCard.category) currentCard.category = currentCategory;
            if (!currentCard.nuances) currentCard.nuances = [];
            if (!currentCard.situations) currentCard.situations = [];
            if (!currentCard.target_audience) currentCard.target_audience = [];
            if (!currentCard.examples) currentCard.examples = [];
            if (!currentCard.pesona_analysis) {
                currentCard.pesona_analysis = {
                    problem: '', empathy: '', solution: '', offer: '', narrowing: '', action: ''
                };
            }

            cards.push(currentCard as CopywritingCard);
        }
    };

    // Strict Word Patterns: Only accept explicit tags
    const wordPatterns = [
        /^\s*\*\*word:\*\*\s*(.+)/i,
        /^\s*###\s*word:\s*(.+)/i,
        /^\s*#\s*word:\s*(.+)/i,
        /^\s*###\s*단어:\s*(.+)/,
        /^\s*단어:\s*(.+)/
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let newWordFound = false;
        let extractedWord = '';

        // Check for category header (List item that is NOT a word)
        // A category usually looks like "- CategoryName" and is NOT followed by definition/nuance immediately.
        // But in 1.md, "- 문제" is a word.
        // So we rely on the Strong Tags to define a word.
        // If we see a list item, we check if it's a category.

        const listMatch = line.match(/^\s*-\s+(.+)$/);
        if (listMatch) {
            const content = listMatch[1].trim();
            // If it's short and doesn't look like a sentence, maybe a category?
            // But we only care about updating currentCategory if it's NOT a word start.
            // We will know it's a word start if we see a Strong Tag soon.
            // Actually, let's just use the Strong Tags for Words.
            // And assume list items *might* be categories if they are not words.

            // Heuristic: If a list item is followed by a Strong Tag for the SAME text, it's a word title.
            // If it's followed by a Strong Tag for a DIFFERENT text, it might be a category.
            // If it's followed by nothing relevant, it's just text.

            // Let's keep it simple:
            // If we find a Strong Tag, that's a word.
            // The category is whatever the last "Header" or "List Item" was?
            // No, that's too risky.
            // Let's look for explicit category markers if possible, or just use the filename/structure.
            // In 1.md: "- 문제점 지적하기" -> Category.
            //          "    - 문제" -> Word Title (followed by **word:** 문제)

            // So if indentation level increases, it's a sub-item.
            // Level 0: "- 문제점 지적하기" (Category)
            // Level 1: "    - 문제" (Word)

            // Let's try to track indentation?
            // Or just: If a line matches `**word:**`, the word is found.
            // The category is the *last list item* that appeared before this word?
            // But "    - 문제" appears right before "**word:** 문제".
            // So the category is the list item *before* that?

            // Let's try to capture the "Category" from lines that look like headers.
            // For now, let's just be Strict about Words.
            // If we miss categories, it's better than garbage words.

            // We will NOT treat list items as words anymore. Only explicit tags.
        }

        for (const p of wordPatterns) {
            const match = line.match(p);
            if (match) {
                newWordFound = true;
                extractedWord = match[1].trim();
                break;
            }
        }

        if (newWordFound) {
            saveCard();
            currentCard = { word: extractedWord, category: currentCategory };
            buffer = [];
        }

        if (currentCard) {
            buffer.push(line);
        } else {
            // If we are not in a card, maybe we can find a category?
            if (listMatch) {
                const candidate = listMatch[1].trim();
                // If it doesn't have "for_", "**", and is short
                if (!candidate.includes('**') && !candidate.startsWith('for_') && candidate.length < 40) {
                    // It might be a category.
                    // But wait, "    - 문제" is short.
                    // If the NEXT meaningful line is "**word:** 문제", then "문제" is not a category.
                    // We can check lookahead.
                    const lookAhead = lines.slice(i + 1, i + 5).join('\n');
                    if (!lookAhead.includes('**word:**') && !lookAhead.includes('### word:')) {
                        currentCategory = candidate;
                    }
                }
            }
        }
    }

    saveCard();
    return cards;
}

// ... (main function update for delete)

async function deleteCollection(db: admin.firestore.Firestore, collectionPath: string, batchSize: number) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db: admin.firestore.Firestore, query: admin.firestore.Query, resolve: Function) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

function fillCardData(card: Partial<CopywritingCard>, text: string) {
    // Definition
    const defMatch = text.match(/(\*\*definition:\*\*|\*\*1\. 단어의 정의 \(Definition\)\*\*|definition:|### definition:)\s*([\s\S]*?)(?=(\*\*nuances|\*\*2\.|\*\*situations|nuances:|### nuances|$))/i);
    if (defMatch) card.definition = defMatch[2].trim();

    // Nuances, Situations, Target Audience
    const nuancesBlockMatch = text.match(/\*\*2\. 뉘앙스[\s\S]*?(?=\*\*3\.|###|$)/);
    if (nuancesBlockMatch) {
        const block = nuancesBlockMatch[0];
        const nMatch = block.match(/핵심 뉘앙스:\*\*\s*(\[.*?\])/);
        if (nMatch) card.nuances = parseArray(nMatch[1]);

        const sMatch = block.match(/추천 사용 상황:\*\*\s*(\[.*?\])/);
        if (sMatch) card.situations = parseArray(sMatch[1]);

        const tMatch = block.match(/타겟 고객:\*\*\s*(\[.*?\])/);
        if (tMatch) card.target_audience = parseArray(tMatch[1]);
    } else {
        card.nuances = parseFieldListOrArray(text, /(\*\*nuances:\*\*|nuances:|### nuances:)/i);
        card.situations = parseFieldListOrArray(text, /(\*\*situations:\*\*|situations:|### situations:)/i);
        card.target_audience = parseFieldListOrArray(text, /(\*\*target_audience:\*\*|target_audience:|### target_audience:)/i);
    }

    // Pesona
    const pesonaBlockMatch = text.match(/(\*\*pesona_analysis:\*\*|\*\*3\. PESONA 설득 논리 \(PESONA Analysis\)\*\*|pesona_analysis:|### pesona_analysis:)[\s\S]*?(?=(\*\*examples|\*\*4\.|examples:|### examples|$))/i);
    if (pesonaBlockMatch) {
        const block = pesonaBlockMatch[0];
        card.pesona_analysis = {
            problem: getPesonaField(block, 'problem') || getPesonaField(block, 'Problem'),
            empathy: getPesonaField(block, 'empathy') || getPesonaField(block, 'Empathy'),
            solution: getPesonaField(block, 'solution') || getPesonaField(block, 'Solution'),
            offer: getPesonaField(block, 'offer') || getPesonaField(block, 'Offer'),
            narrowing: getPesonaField(block, 'narrowing') || getPesonaField(block, 'Narrowing'),
            action: getPesonaField(block, 'action') || getPesonaField(block, 'Action'),
        };
    }

    // Examples
    const exMatch = text.match(/(\*\*examples:\*\*|\*\*4\. 실전 카피 예문 \(Examples\)\*\*|examples:|### examples:)[\s\S]*/i);
    if (exMatch) {
        const raw = exMatch[0];
        const lines = raw.split('\n');
        const examples = lines
            .map(l => l.trim())
            .filter(l => /^\d+\.|^-\s/.test(l))
            .map(l => l.replace(/^\d+\.\s*|^-\s*/, ''));
        card.examples = examples;
    }
}

function parseFieldListOrArray(text: string, headerRegex: RegExp): string[] {
    const match = text.match(new RegExp(headerRegex.source + "\\s*([\\s\\S]*?)(?=(\\*\\*|###|\\n\\s*\\w+:|$))", 'i'));
    if (!match) return [];

    const content = match[2].trim();

    if (content.startsWith('[')) {
        return parseArray(content);
    }

    const lines = content.split('\n');
    const items = lines
        .map(l => l.trim())
        .filter(l => l.startsWith('-'))
        .map(l => l.replace(/^-\s*/, '').trim());

    return items;
}

function parseArray(str: string): string[] {
    try {
        return JSON.parse(str.replace(/'/g, '"'));
    } catch {
        return [];
    }
}

function getPesonaField(chunk: string, fieldName: string): string {
    const regex = new RegExp(`-\\s*\\*\\*${fieldName}.*?:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*-\\s*\\*\\*|\\n\\s*\\*\\*|$)`, 'i');
    const match = chunk.match(regex);
    if (match) return match[1].trim();

    const regex2 = new RegExp(`${fieldName}:\\s*([\\s\\S]*?)(?=\\n\\s*\\w+:|$)`, 'i');
    const match2 = chunk.match(regex2);
    return match2 ? match2[1].trim() : '';
}

main().catch(console.error);
