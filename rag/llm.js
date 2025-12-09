import OpenAI from 'openai';

/**
 * Generate a response using the LLM with retrieved context
 * @param {string} query - User's question
 * @param {Array<{text: string}>} chunks - Retrieved relevant chunks
 * @returns {Promise<string>}
 */
export async function generateResponse(query, chunks) {
    // Build context from chunks
    const context = chunks.map(c => c.text).join('\n\n');

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-your')) {
        return generateFallbackResponse(query, chunks);
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const systemPrompt = `You are a helpful assistant for a portfolio website. Answer questions based on the provided context about the portfolio owner. Be concise, friendly, and professional.

If the question cannot be answered from the context, politely say you don't have that information.

Context:
${context}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
            ],
            max_tokens: 500,
            temperature: 0.7
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error generating LLM response:', error);
        return generateFallbackResponse(query, chunks);
    }
}

/**
 * Generate a simple fallback response when LLM is unavailable
 */
function generateFallbackResponse(query, chunks) {
    if (chunks.length === 0) {
        return "I don't have enough information to answer that question. Please try asking about the portfolio owner's skills, projects, or experience.";
    }

    const queryLower = query.toLowerCase();

    // Simple intent detection
    if (queryLower.includes('project')) {
        const projectChunk = chunks.find(c => c.type === 'project');
        if (projectChunk) {
            return `Here's information about a project: ${projectChunk.text}`;
        }
    }

    if (queryLower.includes('skill') || queryLower.includes('know') || queryLower.includes('technology')) {
        const skillChunk = chunks.find(c => c.type === 'skill');
        if (skillChunk) {
            return `Here are some skills: ${skillChunk.text}`;
        }
    }

    if (queryLower.includes('experience') || queryLower.includes('work') || queryLower.includes('job')) {
        const expChunk = chunks.find(c => c.type === 'experience');
        if (expChunk) {
            return `Here's work experience: ${expChunk.text}`;
        }
    }

    if (queryLower.includes('who') || queryLower.includes('about') || queryLower.includes('name')) {
        const profileChunk = chunks.find(c => c.type === 'profile');
        if (profileChunk) {
            return profileChunk.text;
        }
    }

    // Default: return the most relevant chunk
    return `Based on the portfolio: ${chunks[0].text}`;
}
