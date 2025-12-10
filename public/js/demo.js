/**
 * Demo Mode Module
 * Handles JSON editing and live preview in iframe
 */

const DEMO_STORAGE_KEY = 'demo-portfolio';

// DOM Elements
let jsonEditor = null;
let previewIframe = null;
let errorMessage = null;
let runBtn = null;
let resetBtn = null;

/**
 * Initialize the demo editor
 */
async function initDemo() {
    jsonEditor = document.getElementById('json-editor');
    previewIframe = document.getElementById('preview-iframe');
    errorMessage = document.getElementById('error-message');
    runBtn = document.getElementById('run-btn');
    resetBtn = document.getElementById('reset-btn');

    if (!jsonEditor || !previewIframe) {
        console.error('Demo elements not found');
        return;
    }

    // Load portfolio JSON
    await loadPortfolioJSON();

    // Event listeners
    runBtn.addEventListener('click', handleRun);
    resetBtn.addEventListener('click', handleReset);

    // Keyboard shortcut: Ctrl+Enter to run
    jsonEditor.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            handleRun();
        }
    });

    // Tab key support in editor
    jsonEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = jsonEditor.selectionStart;
            const end = jsonEditor.selectionEnd;
            jsonEditor.value = jsonEditor.value.substring(0, start) + '  ' + jsonEditor.value.substring(end);
            jsonEditor.selectionStart = jsonEditor.selectionEnd = start + 2;
        }
    });

    // Welcome modal handling
    const welcomeModal = document.getElementById('welcome-modal');
    const getStartedBtn = document.getElementById('get-started-btn');

    // Close modal when "Let's Try It!" is clicked
    if (getStartedBtn && welcomeModal) {
        getStartedBtn.addEventListener('click', () => {
            welcomeModal.classList.remove('active');
        });

        // Also close on overlay click
        welcomeModal.addEventListener('click', (e) => {
            if (e.target === welcomeModal) {
                welcomeModal.classList.remove('active');
            }
        });
    }
}

/**
 * Load portfolio JSON from API
 */
async function loadPortfolioJSON() {
    try {
        // Check if there's existing demo data
        const existing = sessionStorage.getItem(DEMO_STORAGE_KEY);
        if (existing) {
            jsonEditor.value = JSON.stringify(JSON.parse(existing), null, 2);
            return;
        }

        // Fetch from API
        const response = await fetch('/api/portfolio');
        if (!response.ok) {
            throw new Error('Failed to fetch portfolio');
        }

        const data = await response.json();
        jsonEditor.value = JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('Error loading portfolio:', error);
        showError('Failed to load portfolio data. Please refresh the page.');
    }
}

/**
 * Handle Run button click
 */
function handleRun() {
    hideError();

    const jsonText = jsonEditor.value.trim();

    if (!jsonText) {
        showError('Please enter some JSON content.');
        return;
    }

    try {
        // Parse to validate JSON
        const data = JSON.parse(jsonText);

        // Basic validation
        if (!data.profile || !data.profile.name) {
            showError('Invalid portfolio structure: missing profile.name');
            return;
        }

        // Store in sessionStorage
        sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));

        // Reload iframe
        refreshPreview();

    } catch (error) {
        if (error instanceof SyntaxError) {
            showError(`JSON Syntax Error: ${error.message}`);
        } else {
            showError(`Error: ${error.message}`);
        }
    }
}

/**
 * Handle Reset button click
 */
async function handleReset() {
    hideError();

    // Clear sessionStorage
    sessionStorage.removeItem(DEMO_STORAGE_KEY);

    // Reload from API
    try {
        const response = await fetch('/api/portfolio');
        if (!response.ok) {
            throw new Error('Failed to fetch portfolio');
        }

        const data = await response.json();
        jsonEditor.value = JSON.stringify(data, null, 2);

        // Refresh preview
        refreshPreview();
    } catch (error) {
        showError('Failed to reset. Please refresh the page.');
    }
}

/**
 * Refresh the preview iframe
 */
function refreshPreview() {
    if (previewIframe) {
        // Add timestamp to force reload
        const src = previewIframe.src.split('?')[0];
        previewIframe.src = `${src}?demo=1&t=${Date.now()}`;
    }
}

/**
 * Show error message
 */
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }
}

/**
 * Hide error message
 */
function hideError() {
    if (errorMessage) {
        errorMessage.classList.remove('show');
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDemo);
} else {
    initDemo();
}

// Add theme switcher logic
const themeButtons = document.querySelectorAll('.theme-btn');
themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        themeButtons.forEach(b => b.classList.remove('active'));
        // Add to clicked
        btn.classList.add('active');

        const theme = btn.dataset.theme;

        // Update localStorage so the iframe picks it up
        localStorage.setItem('portfolio-theme', theme);

        // Reload iframe to apply theme
        refreshPreview();
    });
});
