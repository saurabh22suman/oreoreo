import OpenAI from 'openai';
import { chunkPortfolio } from './chunker.js';

// In-memory storage for embeddings
let embeddingsCache = [];

/**
 * Initialize embeddings on server startup
 */
export async function initializeEmbeddings() {
    const chunks = await chunkPortfolio();

    if (chunks.length === 0) {
        console.warn('No chunks to embed');
        embeddingsCache = [];
        return;
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-your')) {
        console.warn('OpenAI API key not configured. Using simple keyword matching for RAG.');
        // Store chunks without embeddings for fallback keyword matching
        embeddingsCache = chunks.map(chunk => ({
            ...chunk,
            embedding: null
        }));
        return;
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Generate embeddings for all chunks
        const embeddingPromises = chunks.map(async (chunk) => {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: chunk.text
            });

            return {
                ...chunk,
                embedding: response.data[0].embedding
            };
        });

        embeddingsCache = await Promise.all(embeddingPromises);
        console.log(`Generated embeddings for ${embeddingsCache.length} chunks`);
    } catch (error) {
        console.error('Error generating embeddings:', error);
        // Fallback to keyword matching
        embeddingsCache = chunks.map(chunk => ({
            ...chunk,
            embedding: null
        }));
    }
}

/**
 * Get the current embeddings cache
 */
export function getEmbeddingsCache() {
    return embeddingsCache;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate embedding for a query
 */
export async function generateQueryEmbedding(query) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-your')) {
        return null;
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: query
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating query embedding:', error);
        return null;
    }
}
