/**
 * Portfolio Renderer Module
 * Fetches and renders portfolio data from JSON
 */

// Social icons as SVG paths
const SOCIAL_ICONS = {
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
    website: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
};

/**
 * Get portfolio data - checks demo mode first
 */
async function getPortfolioData() {
    // Check for demo mode
    const urlParams = new URLSearchParams(window.location.search);
    const isDemo = urlParams.get('demo') === '1';

    if (isDemo) {
        const demoData = sessionStorage.getItem('demo-portfolio');
        if (demoData) {
            try {
                return JSON.parse(demoData);
            } catch (e) {
                console.error('Failed to parse demo data:', e);
            }
        }
    }

    // Fetch from API
    try {
        const response = await fetch('/api/portfolio');
        if (!response.ok) {
            throw new Error('Failed to fetch portfolio');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return null;
    }
}

/**
 * Render the hero section
 */
function renderHero(profile, socials) {
    if (!profile) return '';

    const socialLinks = socials ? socials.map(social => {
        const icon = SOCIAL_ICONS[social.icon] || SOCIAL_ICONS.website;
        return `
      <a href="${escapeHtml(social.url)}" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(social.platform)}">
        ${icon}
      </a>
    `;
    }).join('') : '';

    return `
    <section class="hero" id="about">
      <div class="container">
        <img src="${escapeHtml(profile.avatar)}" alt="${escapeHtml(profile.name)}" class="hero-avatar">
        <h1 class="hero-name">${escapeHtml(profile.name)}</h1>
        <p class="hero-title">${escapeHtml(profile.title)}</p>
        <p class="hero-location">
          📍 ${escapeHtml(profile.location)} • ✉️ ${escapeHtml(profile.email)}
        </p>
        <p class="hero-summary">${escapeHtml(profile.summary)}</p>
        <div class="social-links">
          ${socialLinks}
        </div>
      </div>
    </section>
  `;
}

/**
 * Render the skills section
 */
function renderSkills(skills) {
    if (!skills || skills.length === 0) return '';

    const skillCards = skills.map(category => {
        const tags = category.items.map(item =>
            `<span class="skill-tag">${escapeHtml(item)}</span>`
        ).join('');

        return `
      <div class="skill-card">
        <h3 class="skill-category">${escapeHtml(category.category)}</h3>
        <div class="skill-items">
          ${tags}
        </div>
      </div>
    `;
    }).join('');

    return `
    <section class="section" id="skills">
      <div class="container">
        <h2 class="section-title">Skills</h2>
        <div class="skills-grid">
          ${skillCards}
        </div>
      </div>
    </section>
  `;
}

/**
 * Render the projects section
 */
function renderProjects(projects) {
    if (!projects || projects.length === 0) return '';

    const projectCards = projects.map(project => {
        const techTags = project.technologies.map(tech =>
            `<span class="tech-tag">${escapeHtml(tech)}</span>`
        ).join('');

        const links = [];
        if (project.url) {
            links.push(`<a href="${escapeHtml(project.url)}" class="project-link" target="_blank" rel="noopener noreferrer">🔗 Live Demo</a>`);
        }
        if (project.github) {
            links.push(`<a href="${escapeHtml(project.github)}" class="project-link" target="_blank" rel="noopener noreferrer">📂 GitHub</a>`);
        }

        return `
      <div class="project-card">
        <h3 class="project-title">${escapeHtml(project.title)}</h3>
        <p class="project-description">${escapeHtml(project.description)}</p>
        <div class="project-tech">
          ${techTags}
        </div>
        <div class="project-links">
          ${links.join('')}
        </div>
      </div>
    `;
    }).join('');

    return `
    <section class="section" id="projects">
      <div class="container">
        <h2 class="section-title">Projects</h2>
        <div class="projects-grid">
          ${projectCards}
        </div>
      </div>
    </section>
  `;
}

/**
 * Render the experience section
 */
function renderExperience(experience) {
    if (!experience || experience.length === 0) return '';

    const experienceItems = experience.map(exp => `
    <div class="experience-item">
      <h3 class="experience-role">${escapeHtml(exp.role)}</h3>
      <p class="experience-company">${escapeHtml(exp.company)}</p>
      <p class="experience-period">${escapeHtml(exp.period)}</p>
      <p class="experience-description">${escapeHtml(exp.description)}</p>
    </div>
  `).join('');

    return `
    <section class="section" id="experience">
      <div class="container">
        <h2 class="section-title">Experience</h2>
        <div class="experience-timeline">
          ${experienceItems}
        </div>
      </div>
    </section>
  `;
}

/**
 * Render the education section
 */
function renderEducation(education) {
    if (!education || education.length === 0) return '';

    const educationCards = education.map(edu => `
    <div class="education-card">
      <h3 class="education-degree">${escapeHtml(edu.degree)}</h3>
      <p class="education-institution">${escapeHtml(edu.institution)}</p>
      <p class="education-year">${escapeHtml(edu.year)}</p>
    </div>
  `).join('');

    return `
    <section class="section" id="education">
      <div class="container">
        <h2 class="section-title">Education</h2>
        <div class="education-grid">
          ${educationCards}
        </div>
      </div>
    </section>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Render error state
 */
function renderError() {
    return `
    <section class="hero">
      <div class="container" style="text-align: center; padding: 4rem 0;">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">😕 Failed to Load Portfolio</h1>
        <p style="opacity: 0.7;">Please try refreshing the page or check back later.</p>
      </div>
    </section>
  `;
}

/**
 * Main render function
 */
async function renderPortfolio() {
    const contentEl = document.getElementById('portfolio-content');
    if (!contentEl) return;

    const data = await getPortfolioData();

    if (!data) {
        contentEl.innerHTML = renderError();
        return;
    }

    // Update page title
    if (data.profile?.name) {
        document.title = `${data.profile.name} | Portfolio`;
    }

    // Update logo
    const logo = document.querySelector('.logo');
    if (logo && data.profile?.name) {
        logo.textContent = data.profile.name.split(' ')[0];
    }

    // Render all sections
    const html = [
        renderHero(data.profile, data.socials),
        renderSkills(data.skills),
        renderProjects(data.projects),
        renderExperience(data.experience),
        renderEducation(data.education)
    ].join('');

    contentEl.innerHTML = html;
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderPortfolio);
} else {
    renderPortfolio();
}

// Export for use in demo mode
export { renderPortfolio, getPortfolioData };
