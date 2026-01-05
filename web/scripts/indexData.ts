/**
 * Script to index all copywriting expressions from data/*.md to Upstash Vector
 * 
 * Usage: npx tsx scripts/indexData.ts
 * 
 * Required environment variables:
 * - UPSTASH_VECTOR_REST_URL
 * - UPSTASH_VECTOR_REST_TOKEN
 * - OPENAI_API_KEY
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { parseAllData, uploadToVectorDB } from "../lib/rag";

async function main() {
    console.log("🚀 Starting data indexing...\n");

    // Check environment variables
    if (!process.env.UPSTASH_VECTOR_REST_URL) {
        throw new Error("UPSTASH_VECTOR_REST_URL is required");
    }
    if (!process.env.UPSTASH_VECTOR_REST_TOKEN) {
        throw new Error("UPSTASH_VECTOR_REST_TOKEN is required");
    }
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required");
    }

    // Parse data files
    const dataDir = path.join(__dirname, "../../data");
    console.log(`📂 Parsing data from: ${dataDir}`);

    const expressions = await parseAllData(dataDir);
    console.log(`✅ Parsed ${expressions.length} expressions\n`);

    // Show sample
    console.log("📝 Sample expressions:");
    expressions.slice(0, 3).forEach((expr, i) => {
        console.log(`  ${i + 1}. ${expr.word}: ${expr.definition.slice(0, 50)}...`);
    });
    console.log("\n");

    // Upload to vector DB
    console.log("⬆️ Uploading to Upstash Vector...");
    await uploadToVectorDB(expressions);

    console.log("\n✅ Indexing complete!");
}

main().catch(console.error);
