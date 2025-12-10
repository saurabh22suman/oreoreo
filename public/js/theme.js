/**
 * Theme Switcher Module
 * Handles theme switching, popup modal, and "like" functionality
 */

const THEMES = ['minimal', 'modern', 'elegant', 'retro'];
const STORAGE_KEY = 'portfolio-theme';
const DEFAULT_THEME = 'modern';

// DOM Elements
const themeLink = document.getElementById('theme-css');
const popupBtn = document.getElementById('theme-popup-btn');
const likeBtn = document.getElementById('theme-like-btn');
const modal = document.getElementById('theme-modal');
const modalClose = document.getElementById('theme-modal-close');
const themeList = document.getElementById('theme-list');

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
 * @param {string} themeName - Name of the theme
 * @param {boolean} trackAction - Whether to send analytics event (default: false to avoid init counting)
 */
export function applyTheme(themeName, trackAction = false) {
    if (!THEMES.includes(themeName)) {
        console.warn(`Invalid theme: ${themeName}`);
        return;
    }

    if (themeLink) {
        themeLink.href = `/css/theme-${themeName}.css`;
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, themeName);

    // Reset like button state when theme changes
    if (likeBtn) likeBtn.classList.remove('liked');

    // Update UI (active class in modal)
    updateActiveThemeUI(themeName);

    // Send analytics event if user triggered
    if (trackAction) {
        sendThemeAnalytics(themeName, 'switch');
    }
}

/**
 * Update UI state for active theme
 */
function updateActiveThemeUI(activeTheme) {
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === activeTheme);
        // We no longer have select buttons, but we can verify active indicator if used
        const indicator = option.querySelector('.active-indicator');
        if (indicator) {
            // Re-render handled by full list re-render usually, but for toggling class:
            // If we generated the list dynamically, this function might be redundant if we re-render list on every open.
            // But applyTheme is called also without opening modal (init).
        }
    });
    // Since we re-render the list every time the modal opens, this is mostly for immediate feedback if modal is open.
    // If the modal is closed, this doesn't matter much.
}

/**
 * Send theme analytics event (switch or like)
 */
async function sendThemeAnalytics(themeName, action) {
    try {
        await fetch('/api/theme-analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: themeName, action })
        });
    } catch (error) {
        console.debug('Failed to send theme analytics:', error);
    }
}

/**
 * Fetch theme stats for the modal
 */
async function fetchThemeStats() {
    try {
        const response = await fetch('/api/public-theme-stats');
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.error(e);
    }
    return null;
}

/**
 * Render the list of themes in the modal
 */
async function renderThemeList() {
    const currentTheme = getCurrentTheme();
    const stats = await fetchThemeStats() || {};

    // Calculate max values for badges based on LIKES
    let maxLikes = -1;
    let mostPopularTheme = '';

    THEMES.forEach(theme => {
        const s = stats[theme] || { switches: 0, likes: 0 };
        const likes = typeof s === 'number' ? 0 : (s.likes || 0);

        if (likes > maxLikes) {
            maxLikes = likes;
            mostPopularTheme = theme;
        }
    });

    themeList.innerHTML = THEMES.map(theme => {
        const isActive = theme === currentTheme;

        // Badges: "Most Popular" based on Likes
        let badges = '';
        if (theme === mostPopularTheme && maxLikes > 0) {
            badges += `<span class="badge badge-popular">🔥 Most Popular</span>`;
        }

        return `
            <div class="theme-option ${isActive ? 'active' : ''}" data-theme="${theme}" role="button" tabindex="0">
                <div class="theme-info">
                    <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: space-between; width: 100%;">
                        <span class="theme-name">${theme}</span>
                        <div class="theme-badges">${badges}</div>
                    </div>
                </div>
                ${isActive ? '<span class="active-indicator">✓</span>' : ''}
            </div>
        `;
    }).join('');

    // Add click handlers to new elements
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            applyTheme(theme, true);
            // Re-render to update the checkmark
            renderThemeList();
            // Automatically close modal
            toggleModal(false);
        });

        // Keyboard support
        option.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const theme = option.dataset.theme;
                applyTheme(theme, true);
                renderThemeList();
            }
        });
    });
}

/**
 * Toggle Modal
 */
function toggleModal(show) {
    if (show) {
        modal.classList.add('open');
        renderThemeList(); // Refresh stats when opening
    } else {
        modal.classList.remove('open');
    }
}

/**
 * Initialize
 */
function init() {
    // Initial theme apply
    applyTheme(getCurrentTheme(), false);

    // Event Listeners
    if (popupBtn) popupBtn.addEventListener('click', () => toggleModal(true));
    if (modalClose) modalClose.addEventListener('click', () => toggleModal(false));

    // Close modal on outside click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) toggleModal(false);
        });
    }

    // Like button
    if (likeBtn) {
        likeBtn.addEventListener('click', () => {
            // Visual feedback immediately
            likeBtn.classList.add('liked');
            likeBtn.style.transform = 'scale(1.4)';
            setTimeout(() => likeBtn.style.transform = 'scale(1)', 200);

            // Send API request
            sendThemeAnalytics(getCurrentTheme(), 'like');
        });
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
