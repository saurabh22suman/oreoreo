/**
 * LLM Response Generation
 * Uses the provider abstraction to support multiple LLM backends
 */

import { getClient, getChatModel, isProviderConfigured, getProviderStatus } from './providers.js';

/**
 * Generate a response using the LLM with retrieved context
 * @param {string} query - User's question
 * @param {Array<{text: string}>} chunks - Retrieved relevant chunks
 * @returns {Promise<string>}
 */
export async function generateResponse(query, chunks) {
    // Build context from chunks
    const context = chunks.map(c => c.text).join('\n\n');

    // Check if provider is configured
    if (!isProviderConfigured()) {
        const status = getProviderStatus();
        console.log(`LLM provider (${status.name}) not configured. Using fallback.`);
        return generateFallbackResponse(query, chunks);
    }

    try {
        const client = getClient();
        const model = getChatModel();
        const status = getProviderStatus();

        console.log(`Using ${status.name} with model: ${model}`);

        const systemPrompt = `You are a professional AI assistant representing Saurabh Suman's portfolio website. Your role is to provide polished, articulate, and engaging responses about Saurabh's professional background.

## Response Guidelines:
- **Tone**: Professional yet approachable, confident but not boastful
- **Style**: Write in third person when discussing Saurabh (e.g., "He has..." not "I have...")
- **Format**: Use clean, well-structured responses. Avoid excessive bullet points or markdown unless listing multiple items
- **Length**: Be concise but comprehensive. Aim for 2-4 sentences for simple questions, more for complex ones
- **Accuracy**: Only use information from the provided context. Never fabricate details
- **Personality**: Present Saurabh as a seasoned professional with deep expertise

## Formatting Rules:
- For certifications: Mention the credential name and issuing organization naturally, without verification URLs
- For experience: Highlight key achievements and impact, not just job duties
- For skills: Group related technologies and explain practical application when relevant
- For projects: Emphasize the problem solved and technologies used

If a question cannot be answered from the context, politely explain that specific information isn't available and suggest what you can help with instead.

Context about Saurabh:
${context}`;

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
            ],
            max_tokens: 500,
            temperature: 0.6
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error generating LLM response:', error.message);
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

    if (queryLower.includes('certif') || queryLower.includes('credential') || queryLower.includes('qualified')) {
        const certChunk = chunks.find(c => c.type === 'certification');
        if (certChunk) {
            return `Here are certifications: ${certChunk.text}`;
        }
    }

    if (queryLower.includes('interest') || queryLower.includes('hobby') || queryLower.includes('hobbies') || queryLower.includes('fun')) {
        const interestsChunk = chunks.find(c => c.type === 'interests');
        if (interestsChunk) {
            return interestsChunk.text;
        }
    }

    // Default: return the most relevant chunk
    return `Based on the portfolio: ${chunks[0].text}`;
}
