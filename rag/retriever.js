import { getEmbeddingsCache, generateQueryEmbedding, cosineSimilarity } from './embed.js';

const TOP_K = 5; // Number of relevant chunks to retrieve (increased for better context)

/**
 * Retrieve the most relevant chunks for a given query
 * @param {string} query - User's question
 * @returns {Promise<Array<{text: string, score: number}>>}
 */
export async function retrieveRelevantChunks(query) {
    const cache = getEmbeddingsCache();

    if (cache.length === 0) {
        return [];
    }

    // Check if we have embeddings or need to use keyword fallback
    const hasEmbeddings = cache.some(chunk => chunk.embedding !== null);

    if (hasEmbeddings) {
        return await retrieveByEmbedding(query, cache);
    } else {
        return retrieveByKeyword(query, cache);
    }
}

/**
 * Retrieve chunks using embedding similarity
 */
async function retrieveByEmbedding(query, cache) {
    const queryEmbedding = await generateQueryEmbedding(query);

    if (!queryEmbedding) {
        // Fallback to keyword if embedding fails
        return retrieveByKeyword(query, cache);
    }

    // Calculate similarity scores
    const scored = cache.map(chunk => ({
        text: chunk.text,
        type: chunk.type,
        score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Sort by score descending and take top K
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, TOP_K);
}

/**
 * Retrieve chunks using simple keyword matching (fallback)
 */
function retrieveByKeyword(query, cache) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scored = cache.map(chunk => {
        const textLower = chunk.text.toLowerCase();
        let score = 0;

        // Count keyword matches
        queryWords.forEach(word => {
            if (textLower.includes(word)) {
                score += 1;
            }
        });

        // Bonus for type matches
        const typeKeywords = {
            project: ['project', 'built', 'created', 'developed', 'app', 'website', 'pipeline', 'system'],
            skill: ['skill', 'know', 'technology', 'language', 'framework', 'tool', 'tech', 'stack'],
            experience: ['work', 'job', 'company', 'role', 'position', 'experience', 'career', 'employed'],
            education: ['education', 'degree', 'university', 'school', 'study', 'college', 'bachelor', 'master'],
            profile: ['who', 'about', 'name', 'contact', 'email', 'summary', 'introduce'],
            social: ['social', 'link', 'github', 'linkedin', 'twitter', 'medium', 'portfolio', 'website'],
            certification: ['certification', 'certified', 'certificate', 'credential', 'badge', 'qualification'],
            interests: ['interest', 'hobby', 'hobbies', 'like', 'enjoy', 'passion', 'free time', 'fun']
        };

        if (typeKeywords[chunk.type]) {
            typeKeywords[chunk.type].forEach(keyword => {
                if (queryWords.some(w => w.includes(keyword) || keyword.includes(w))) {
                    score += 2;
                }
            });
        }

        return {
            text: chunk.text,
            type: chunk.type,
            score: score
        };
    });

    // Sort by score descending and take top K
    scored.sort((a, b) => b.score - a.score);

    // Filter out zero-score matches if we have enough
    const relevant = scored.filter(s => s.score > 0);

    if (relevant.length >= TOP_K) {
        return relevant.slice(0, TOP_K);
    }

    // If not enough matches, return top K anyway
    return scored.slice(0, TOP_K);
}
