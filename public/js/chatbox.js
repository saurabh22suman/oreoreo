/**
 * Chatbox Module
 * Handles the RAG-based chat interface
 */

// DOM Elements
let chatboxToggle = null;
let chatboxWindow = null;
let chatboxClose = null;
let chatboxMessages = null;
let chatboxInput = null;
let chatboxSend = null;

let isProcessing = false;

/**
 * Initialize the chatbox
 */
function initChatbox() {
    chatboxToggle = document.getElementById('chatbox-toggle');
    chatboxWindow = document.getElementById('chatbox-window');
    chatboxClose = document.getElementById('chatbox-close');
    chatboxMessages = document.getElementById('chatbox-messages');
    chatboxInput = document.getElementById('chatbox-input');
    chatboxSend = document.getElementById('chatbox-send');

    if (!chatboxToggle || !chatboxWindow) {
        console.debug('Chatbox elements not found');
        return;
    }

    // Event listeners
    chatboxToggle.addEventListener('click', toggleChatbox);
    chatboxClose.addEventListener('click', closeChatbox);
    chatboxSend.addEventListener('click', sendMessage);

    // Enter key to send
    chatboxInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

/**
 * Toggle chatbox open/closed
 */
function toggleChatbox() {
    chatboxWindow.classList.toggle('open');

    if (chatboxWindow.classList.contains('open')) {
        chatboxInput.focus();
    }
}

/**
 * Close the chatbox
 */
function closeChatbox() {
    chatboxWindow.classList.remove('open');
}

/**
 * Send a message to the chat API
 */
async function sendMessage() {
    if (isProcessing) return;

    const message = chatboxInput.value.trim();

    if (!message) return;

    // Clear input
    chatboxInput.value = '';

    // Add user message to chat
    addMessage(message, 'user');

    // Show loading indicator
    const loadingId = addLoadingMessage();

    isProcessing = true;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        // Remove loading indicator
        removeMessage(loadingId);

        if (!response.ok) {
            throw new Error('Failed to get response');
        }

        const data = await response.json();

        if (data.response) {
            addMessage(data.response, 'bot');
        } else {
            addMessage("I'm sorry, I couldn't process that question. Please try again.", 'bot');
        }
    } catch (error) {
        // Remove loading indicator
        removeMessage(loadingId);

        addMessage("I'm having trouble connecting. Please try again later.", 'bot');
        console.error('Chat error:', error);
    }

    isProcessing = false;
}

/**
 * Add a message to the chat
 */
function addMessage(text, type) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;

    chatboxMessages.appendChild(messageEl);

    // Scroll to bottom
    chatboxMessages.scrollTop = chatboxMessages.scrollHeight;

    return messageEl;
}

/**
 * Add loading message
 */
function addLoadingMessage() {
    const id = `loading-${Date.now()}`;
    const messageEl = document.createElement('div');
    messageEl.className = 'message bot';
    messageEl.id = id;
    messageEl.innerHTML = '<div class="loading-spinner"></div>';

    chatboxMessages.appendChild(messageEl);
    chatboxMessages.scrollTop = chatboxMessages.scrollHeight;

    return id;
}

/**
 * Remove a message by ID
 */
function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) {
        el.remove();
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbox);
} else {
    initChatbox();
}
