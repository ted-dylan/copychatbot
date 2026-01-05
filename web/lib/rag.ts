import { Index } from "@upstash/vector";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// Lazy initialization for clients (to avoid build-time errors when env vars are missing)
let vectorIndex: Index | null = null;
let openai: OpenAI | null = null;

function getVectorIndex(): Index {
    if (!vectorIndex) {
        if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
            throw new Error("Upstash Vector credentials are missing");
        }
        vectorIndex = new Index({
            url: process.env.UPSTASH_VECTOR_REST_URL,
            token: process.env.UPSTASH_VECTOR_REST_TOKEN,
        });
    }
    return vectorIndex;
}

function getOpenAI(): OpenAI {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OpenAI API key is missing");
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openai;
}

// Types for parsed data
interface CopywritingExpression {
    id: string;
    word: string;
    definition: string;
    nuances: string[];
    situations: string[];
    targetAudience: string[];
    examples: string[];
    fullText: string;
}

/**
 * Parse a single expression block from markdown
 */
function parseExpressionBlock(block: string, index: number, fileIndex: number): CopywritingExpression | null {
    try {
        // Extract word (first line with **word:** or heading)
        const wordMatch = block.match(/\*\*word:\*\*\s*(.+)/i) || block.match(/^-\s+(.+)$/m);
        if (!wordMatch) return null;

        const word = wordMatch[1].trim();

        // Extract definition
        const defMatch = block.match(/\*\*definition:\*\*\s*([\s\S]*?)(?=\*\*nuances|\*\*situations|\n\n)/i);
        const definition = defMatch ? defMatch[1].trim() : "";

        // Extract nuances
        const nuancesMatch = block.match(/\*\*nuances:\*\*\s*([\s\S]*?)(?=\*\*situations|\*\*target|$)/i);
        const nuances = nuancesMatch
            ? extractListItems(nuancesMatch[1])
            : [];

        // Extract situations
        const situationsMatch = block.match(/\*\*situations:\*\*\s*([\s\S]*?)(?=\*\*target|\*\*pesona|$)/i);
        const situations = situationsMatch
            ? extractListItems(situationsMatch[1])
            : [];

        // Extract target audience
        const audienceMatch = block.match(/\*\*target_audience:\*\*\s*([\s\S]*?)(?=\*\*pesona|$)/i);
        const targetAudience = audienceMatch
            ? extractListItems(audienceMatch[1])
            : [];

        // Extract examples
        const examplesMatch = block.match(/\*\*examples:\*\*\s*([\s\S]*?)(?=\n-\s+\w|\n###|$)/i);
        const examples = examplesMatch
            ? extractExamples(examplesMatch[1])
            : [];

        // Create full text for embedding
        const fullText = `
표현: ${word}
정의: ${definition}
뉘앙스: ${nuances.join(", ")}
활용 상황: ${situations.join(", ")}
타겟: ${targetAudience.join(", ")}
예시: ${examples.slice(0, 3).join(" | ")}
    `.trim();

        return {
            id: `expr_${fileIndex}_${index}`,
            word,
            definition,
            nuances,
            situations,
            targetAudience,
            examples,
            fullText,
        };
    } catch (error) {
        console.error("Error parsing block:", error);
        return null;
    }
}

function extractListItems(text: string): string[] {
    // Handle JSON array format
    const jsonMatch = text.match(/\[([^\]]+)\]/);
    if (jsonMatch) {
        try {
            return JSON.parse(`[${jsonMatch[1]}]`).map((s: string) => s.replace(/_/g, " "));
        } catch {
            // Fall through to list format
        }
    }

    // Handle markdown list format
    const items = text.match(/-\s+(.+)/g);
    return items ? items.map((item) => item.replace(/^-\s+/, "").trim()) : [];
}

function extractExamples(text: string): string[] {
    const examples: string[] = [];
    const lines = text.split("\n");

    for (const line of lines) {
        const match = line.match(/^\d+\.\s*["""]?(.+)["""]?$/);
        if (match) {
            examples.push(match[1].trim().replace(/^["""]|["""]$/g, ""));
        }
    }

    return examples;
}

/**
 * Parse all markdown files in the data directory
 */
export async function parseAllData(dataDir: string): Promise<CopywritingExpression[]> {
    const expressions: CopywritingExpression[] = [];
    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".md"));

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        const content = fs.readFileSync(path.join(dataDir, file), "utf-8");

        // Split by expression blocks (each starts with "- " at the beginning of a line followed by word)
        const blocks = content.split(/\n(?=-\s+[^\s])/);

        for (let i = 0; i < blocks.length; i++) {
            const expr = parseExpressionBlock(blocks[i], i, fileIndex);
            if (expr && expr.word && expr.definition) {
                expressions.push(expr);
            }
        }
    }

    console.log(`Parsed ${expressions.length} expressions from ${files.length} files`);
    return expressions;
}

/**
 * Generate embeddings using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await getOpenAI().embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });
    return response.data[0].embedding;
}

/**
 * Upload expressions to Upstash Vector
 */
export async function uploadToVectorDB(expressions: CopywritingExpression[]): Promise<void> {
    const batchSize = 20; // Reduced batch size to avoid rate limits

    for (let i = 0; i < expressions.length; i += batchSize) {
        const batch = expressions.slice(i, i + batchSize);

        // Generate embeddings one by one to avoid rate limits
        const embeddings: number[][] = [];
        for (const expr of batch) {
            const embedding = await generateEmbedding(expr.fullText);
            embeddings.push(embedding);
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Prepare vectors for upload
        const vectors = batch.map((expr, idx) => ({
            id: expr.id,
            vector: embeddings[idx],
            metadata: {
                word: expr.word,
                definition: expr.definition,
                nuances: expr.nuances.join(", "),
                situations: expr.situations.join(", "),
                examples: expr.examples.slice(0, 3).join(" | "),
            },
        }));

        // Upload to Upstash
        await getVectorIndex().upsert(vectors);
        console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(expressions.length / batchSize)}, ${vectors.length} vectors`);

        // Delay between batches to respect rate limits
        if (i + batchSize < expressions.length) {
            console.log('⏳ Waiting 3 seconds for rate limit...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.log(`✅ Successfully uploaded ${expressions.length} expressions to vector DB`);
}

/**
 * Search for relevant expressions
 */
export async function searchExpressions(
    query: string,
    topK: number = 5
): Promise<Array<{ word: string; definition: string; nuances: string; examples: string; score: number }>> {
    const queryEmbedding = await generateEmbedding(query);

    const results = await getVectorIndex().query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
    });

    return results.map((r) => ({
        word: (r.metadata?.word as string) || "",
        definition: (r.metadata?.definition as string) || "",
        nuances: (r.metadata?.nuances as string) || "",
        examples: (r.metadata?.examples as string) || "",
        score: r.score,
    }));
}
