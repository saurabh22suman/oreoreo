/**
 * LLM Provider Abstraction Layer
 * Supports: OpenAI, Hugging Face, Gemini, OpenRouter
 */

import OpenAI from 'openai';

// Provider configuration
const PROVIDERS = {
    openai: {
        name: 'OpenAI',
        envKey: 'OPENAI_API_KEY',
        baseURL: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        embeddingModel: 'text-embedding-3-small'
    },
    huggingface: {
        name: 'Hugging Face',
        envKey: 'HUGGINGFACE_API_KEY',
        baseURL: 'https://router.huggingface.co/v1',
        defaultModel: 'Qwen/Qwen2.5-72B-Instruct', // Confirmed chat model
        embeddingModel: null // HF router doesn't support embeddings via OpenAI API
    },
    gemini: {
        name: 'Google Gemini',
        envKey: 'GEMINI_API_KEY',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
        defaultModel: 'gemini-1.5-flash',
        embeddingModel: 'text-embedding-004'
    },
    openrouter: {
        name: 'OpenRouter',
        envKey: 'OPENROUTER_API_KEY',
        baseURL: 'https://openrouter.ai/api/v1',
        defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
        embeddingModel: null // OpenRouter doesn't support embeddings
    }
};

/**
 * Get the current provider configuration
 */
export function getProviderConfig() {
    const providerName = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
    const config = PROVIDERS[providerName];

    if (!config) {
        console.warn(`Unknown provider: ${providerName}. Falling back to OpenAI.`);
        return { ...PROVIDERS.openai, provider: 'openai' };
    }

    return { ...config, provider: providerName };
}

/**
 * Check if the current provider is configured
 */
export function isProviderConfigured() {
    const config = getProviderConfig();
    const apiKey = process.env[config.envKey];

    // Check for common placeholder patterns and minimum length
    return (
        apiKey &&
        !/your[-_]/i.test(apiKey) &&
        apiKey.length > 10
    );
}

/**
 * Get the OpenAI-compatible client for the current provider
 */
export function getClient() {
    const config = getProviderConfig();
    const apiKey = process.env[config.envKey];

    if (!apiKey) {
        return null;
    }

    const clientOptions = {
        apiKey: apiKey,
        baseURL: config.baseURL
    };

    // Add extra headers for OpenRouter
    if (config.provider === 'openrouter') {
        clientOptions.defaultHeaders = {
            'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
            'X-Title': 'Portfolio Chatbot'
        };
    }

    return new OpenAI(clientOptions);
}

/**
 * Get the model to use for chat completions
 */
export function getChatModel() {
    const config = getProviderConfig();
    return process.env.LLM_CHAT_MODEL || config.defaultModel;
}

/**
 * Get the model to use for embeddings
 */
export function getEmbeddingModel() {
    const config = getProviderConfig();
    return process.env.LLM_EMBEDDING_MODEL || config.embeddingModel;
}

/**
 * Check if embeddings are supported by the current provider
 */
export function supportsEmbeddings() {
    const config = getProviderConfig();
    return config.embeddingModel !== null;
}

/**
 * Get provider status for debugging
 */
export function getProviderStatus() {
    const config = getProviderConfig();
    const isConfigured = isProviderConfigured();

    return {
        provider: config.provider,
        name: config.name,
        isConfigured,
        chatModel: getChatModel(),
        embeddingModel: getEmbeddingModel(),
        supportsEmbeddings: supportsEmbeddings()
    };
}

export { PROVIDERS };
