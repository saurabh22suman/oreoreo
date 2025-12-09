import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Chunk the portfolio JSON into logical text blocks for RAG retrieval
 * @returns {Promise<Array<{id: string, text: string, type: string}>>}
 */
export async function chunkPortfolio() {
    const portfolioPath = join(__dirname, '..', 'data', 'portfolio.json');

    try {
        const data = await readFile(portfolioPath, 'utf8');
        const portfolio = JSON.parse(data);
        const chunks = [];

        // Profile chunk
        if (portfolio.profile) {
            const { name, title, location, email, summary } = portfolio.profile;
            chunks.push({
                id: 'profile',
                type: 'profile',
                text: `Profile: ${name} is a ${title} based in ${location}. Email: ${email}. ${summary}`
            });
        }

        // Skills chunks
        if (portfolio.skills && Array.isArray(portfolio.skills)) {
            portfolio.skills.forEach((skillCategory, index) => {
                chunks.push({
                    id: `skill-${index}`,
                    type: 'skill',
                    text: `Skills - ${skillCategory.category}: ${skillCategory.items.join(', ')}`
                });
            });
        }

        // Project chunks
        if (portfolio.projects && Array.isArray(portfolio.projects)) {
            portfolio.projects.forEach((project, index) => {
                chunks.push({
                    id: `project-${index}`,
                    type: 'project',
                    text: `Project: ${project.title}. ${project.description}. Technologies used: ${project.technologies.join(', ')}.`
                });
            });
        }

        // Experience chunks
        if (portfolio.experience && Array.isArray(portfolio.experience)) {
            portfolio.experience.forEach((exp, index) => {
                chunks.push({
                    id: `experience-${index}`,
                    type: 'experience',
                    text: `Experience: ${exp.role} at ${exp.company} (${exp.period}). ${exp.description}`
                });
            });
        }

        // Education chunks
        if (portfolio.education && Array.isArray(portfolio.education)) {
            portfolio.education.forEach((edu, index) => {
                chunks.push({
                    id: `education-${index}`,
                    type: 'education',
                    text: `Education: ${edu.degree} from ${edu.institution} (${edu.year})`
                });
            });
        }

        // Socials chunk
        if (portfolio.socials && Array.isArray(portfolio.socials)) {
            const socialLinks = portfolio.socials.map(s => `${s.platform}: ${s.url}`).join(', ');
            chunks.push({
                id: 'socials',
                type: 'social',
                text: `Social Links: ${socialLinks}`
            });
        }

        return chunks;
    } catch (error) {
        console.error('Error chunking portfolio:', error);
        return [];
    }
}
