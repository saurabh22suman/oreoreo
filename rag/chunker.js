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

        // Experience chunks - include highlights for detailed work history
        if (portfolio.experience && Array.isArray(portfolio.experience)) {
            portfolio.experience.forEach((exp, index) => {
                // Build text from highlights array if available, otherwise use description
                let experienceText = `Experience: ${exp.role} at ${exp.company} (${exp.period}).`;
                if (exp.highlights && Array.isArray(exp.highlights)) {
                    experienceText += ` Key achievements: ${exp.highlights.join('. ')}.`;
                } else if (exp.description) {
                    experienceText += ` ${exp.description}`;
                }
                chunks.push({
                    id: `experience-${index}`,
                    type: 'experience',
                    text: experienceText
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

        // Certifications chunks
        if (portfolio.certifications && Array.isArray(portfolio.certifications)) {
            portfolio.certifications.forEach((cert, index) => {
                chunks.push({
                    id: `certification-${index}`,
                    type: 'certification',
                    text: `Certification: ${cert.name} issued by ${cert.issuer}, obtained in ${cert.year}`
                });
            });
            // Also create a combined certifications summary chunk
            const certList = portfolio.certifications.map(c => `${c.name} (${c.issuer})`).join(', ');
            chunks.push({
                id: 'certifications-summary',
                type: 'certification',
                text: `All Certifications: ${certList}`
            });
        }

        // Interests chunk
        if (portfolio.interests && Array.isArray(portfolio.interests)) {
            chunks.push({
                id: 'interests',
                type: 'interests',
                text: `Interests and Hobbies: ${portfolio.interests.join(', ')}`
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
