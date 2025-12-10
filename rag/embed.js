/**
 * Embedding Generation and Management
 * Uses the provider abstraction to support multiple embedding backends
 */

import { chunkPortfolio } from './chunker.js';
import { getClient, getEmbeddingModel, isProviderConfigured, supportsEmbeddings, getProviderStatus } from './providers.js';

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

    const status = getProviderStatus();

    // Check if provider is configured and supports embeddings
    if (!isProviderConfigured()) {
        console.warn(`${status.name} not configured. Using simple keyword matching for RAG.`);
        embeddingsCache = chunks.map(chunk => ({
            ...chunk,
            embedding: null
        }));
        return;
    }

    if (!supportsEmbeddings()) {
        console.warn(`${status.name} doesn't support embeddings. Using keyword matching.`);
        embeddingsCache = chunks.map(chunk => ({
            ...chunk,
            embedding: null
        }));
        return;
    }

    try {
        const client = getClient();
        const model = getEmbeddingModel();

        console.log(`Generating embeddings with ${status.name} (${model})`);

        // Generate embeddings for all chunks
        const embeddingPromises = chunks.map(async (chunk) => {
            const response = await client.embeddings.create({
                model: model,
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
        console.error('Error generating embeddings:', error.message);
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
    if (!isProviderConfigured() || !supportsEmbeddings()) {
        return null;
    }

    try {
        const client = getClient();
        const model = getEmbeddingModel();

        const response = await client.embeddings.create({
            model: model,
            input: query
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating query embedding:', error.message);
        return null;
    }
}
