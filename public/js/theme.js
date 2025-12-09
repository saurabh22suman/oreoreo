/**
 * Theme Switcher Module
 * Handles theme switching and persistence via localStorage
 */

const THEMES = ['minimal', 'modern', 'elegant', 'retro'];
const STORAGE_KEY = 'portfolio-theme';
const DEFAULT_THEME = 'modern';

/**
 * Get the currently selected theme from localStorage
 */
export function getCurrentTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.includes(stored)) {
        return stored;
    }
    return DEFAULT_THEME;
}

/**
 * Apply a theme by swapping the CSS file
 */
export function applyTheme(themeName) {
    if (!THEMES.includes(themeName)) {
        console.warn(`Invalid theme: ${themeName}`);
        return;
    }

    const themeLink = document.getElementById('theme-css');
    if (themeLink) {
        themeLink.href = `/css/theme-${themeName}.css`;
    }

    // Update button states
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === themeName);
    });

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, themeName);

    // Send analytics event
    sendThemeAnalytics(themeName);
}

/**
 * Send theme switch event to the server
 */
async function sendThemeAnalytics(themeName) {
    try {
        await fetch('/api/theme-analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ theme: themeName })
        });
    } catch (error) {
        // Silently fail - analytics shouldn't break the UI
        console.debug('Failed to send theme analytics:', error);
    }
}

/**
 * Initialize theme switcher
 */
function initThemeSwitcher() {
    // Apply saved theme on load
    const savedTheme = getCurrentTheme();
    applyTheme(savedTheme);

    // Add click handlers to theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const themeName = btn.dataset.theme;
            if (themeName) {
                applyTheme(themeName);
            }
        });
    });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeSwitcher);
} else {
    initThemeSwitcher();
}
