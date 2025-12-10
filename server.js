import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, writeFile, copyFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';

// RAG modules
import { initializeEmbeddings } from './rag/embed.js';
import { retrieveRelevantChunks } from './rag/retriever.js';
import { generateResponse } from './rag/llm.js';
import { getProviderStatus } from './rag/providers.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const DATA_DIR = join(__dirname, 'data');
const PORTFOLIO_PATH = join(DATA_DIR, 'portfolio.json');
const ANALYTICS_PATH = join(DATA_DIR, 'theme-analytics.json');
const UPLOADS_DIR = join(__dirname, 'public', 'uploads');

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Basic Auth Middleware
const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).json({ error: 'Authentication required' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = credentials.split(':');

    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPassword = process.env.ADMIN_PASSWORD || 'password';

    if (username === validUsername && password === validPassword) {
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).json({ error: 'Invalid credentials' });
    }
};

// ============ API Routes ============

// GET LLM Provider Status
app.get('/api/llm/status', basicAuth, (req, res) => {
    const status = getProviderStatus();
    res.json(status);
});

// GET Portfolio JSON
app.get('/api/portfolio', async (req, res) => {
    try {
        const data = await readFile(PORTFOLIO_PATH, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading portfolio:', error);
        res.status(500).json({ error: 'Failed to load portfolio data' });
    }
});

// POST Upload new Portfolio JSON (Auth Required)
app.post('/api/upload', basicAuth, upload.single('portfolio'), async (req, res) => {
    try {
        let jsonData;

        // Handle file upload or JSON body
        if (req.file) {
            const content = req.file.buffer.toString('utf8');
            jsonData = JSON.parse(content);
        } else if (req.body && Object.keys(req.body).length > 0) {
            jsonData = req.body;
        } else {
            return res.status(400).json({ error: 'No JSON data provided' });
        }

        // Validate required fields
        if (!jsonData.profile || !jsonData.profile.name) {
            return res.status(400).json({ error: 'Invalid portfolio structure: missing profile.name' });
        }

        // Create backup
        if (existsSync(PORTFOLIO_PATH)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = join(DATA_DIR, `portfolio.backup-${timestamp}.json`);
            await copyFile(PORTFOLIO_PATH, backupPath);
        }

        // Save new portfolio
        await writeFile(PORTFOLIO_PATH, JSON.stringify(jsonData, null, 2), 'utf8');

        // Reinitialize embeddings with new data
        await initializeEmbeddings();

        res.json({ success: true, message: 'Portfolio updated successfully' });
    } catch (error) {
        console.error('Error uploading portfolio:', error);
        if (error instanceof SyntaxError) {
            return res.status(400).json({ error: 'Invalid JSON format' });
        }
        res.status(500).json({ error: 'Failed to upload portfolio' });
    }
});

// POST Upload Profile Photo (Auth Required)
app.post('/api/upload-photo', basicAuth, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No photo file provided' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' });
        }

        // Limit file size (5MB)
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'File too large. Maximum size: 5MB' });
        }

        // Ensure uploads directory exists
        if (!existsSync(UPLOADS_DIR)) {
            await mkdir(UPLOADS_DIR, { recursive: true });
        }

        // Generate unique filename
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const filename = `profile-photo.${ext}`;
        const filePath = join(UPLOADS_DIR, filename);

        // Delete old profile photo if exists (different extension)
        const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        for (const oldExt of extensions) {
            const oldPath = join(UPLOADS_DIR, `profile-photo.${oldExt}`);
            if (existsSync(oldPath) && oldPath !== filePath) {
                try {
                    await unlink(oldPath);
                } catch (e) {
                    // Ignore errors deleting old files
                }
            }
        }

        // Save the file
        await writeFile(filePath, req.file.buffer);

        // Update portfolio.json with the new photo path
        const photoUrl = `/uploads/${filename}`;
        try {
            const portfolioData = JSON.parse(await readFile(PORTFOLIO_PATH, 'utf8'));
            portfolioData.profile.photo = photoUrl;
            await writeFile(PORTFOLIO_PATH, JSON.stringify(portfolioData, null, 2), 'utf8');
        } catch (e) {
            console.error('Failed to update portfolio with photo path:', e);
        }

        res.json({
            success: true,
            message: 'Profile photo uploaded successfully',
            photoUrl
        });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// DELETE Profile Photo (Auth Required)
app.delete('/api/upload-photo', basicAuth, async (req, res) => {
    try {
        // Remove photo from all possible extensions
        const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        let deleted = false;

        for (const ext of extensions) {
            const filePath = join(UPLOADS_DIR, `profile-photo.${ext}`);
            if (existsSync(filePath)) {
                await unlink(filePath);
                deleted = true;
            }
        }

        // Update portfolio.json to remove photo path
        try {
            const portfolioData = JSON.parse(await readFile(PORTFOLIO_PATH, 'utf8'));
            delete portfolioData.profile.photo;
            await writeFile(PORTFOLIO_PATH, JSON.stringify(portfolioData, null, 2), 'utf8');
        } catch (e) {
            console.error('Failed to update portfolio:', e);
        }

        res.json({
            success: true,
            message: deleted ? 'Profile photo deleted' : 'No photo to delete'
        });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

// POST Theme Analytics
app.post('/api/theme-analytics', async (req, res) => {
    try {
        const { theme, action = 'switch' } = req.body;

        if (!theme || !['minimal', 'modern', 'elegant', 'retro'].includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme name' });
        }

        let analytics = {
            minimal: { switches: 0, likes: 0 },
            modern: { switches: 0, likes: 0 },
            elegant: { switches: 0, likes: 0 },
            retro: { switches: 0, likes: 0 }
        };

        try {
            const data = await readFile(ANALYTICS_PATH, 'utf8');
            const parsed = JSON.parse(data);

            // Migration logic
            for (const [key, value] of Object.entries(parsed)) {
                if (typeof value === 'number') {
                    if (analytics[key]) analytics[key].switches = value;
                } else if (typeof value === 'object') {
                    if (analytics[key]) analytics[key] = { ...analytics[key], ...value };
                }
            }
        } catch {
            // File doesn't exist, use defaults
        }

        if (action === 'switch') {
            analytics[theme].switches++;
        } else if (action === 'like') {
            analytics[theme].likes++;
        }

        await writeFile(ANALYTICS_PATH, JSON.stringify(analytics, null, 2), 'utf8');

        res.json({ success: true, stats: analytics });
    } catch (error) {
        console.error('Error updating analytics:', error);
        res.status(500).json({ error: 'Failed to update analytics' });
    }
});

// GET Public Theme Stats (No Auth)
app.get('/api/public-theme-stats', async (req, res) => {
    try {
        const data = await readFile(ANALYTICS_PATH, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        // Return empty stats if file doesn't exist
        res.json({});
    }
});

// GET Theme Stats (Auth Required)
app.get('/admin/theme-stats', basicAuth, async (req, res) => {
    try {
        const data = await readFile(ANALYTICS_PATH, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading analytics:', error);
        res.status(500).json({ error: 'Failed to load analytics' });
    }
});

// POST Chat (RAG)
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Retrieve relevant chunks
        const relevantChunks = await retrieveRelevantChunks(message);

        // Generate response using LLM
        const response = await generateResponse(message, relevantChunks);

        res.json({ response });
    } catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/demo', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'demo.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'admin.html'));
});

// Initialize and Start Server
async function startServer() {
    try {
        // Initialize RAG embeddings on startup
        console.log('Initializing RAG embeddings...');
        await initializeEmbeddings();
        console.log('RAG embeddings initialized.');

        app.listen(PORT, () => {
            console.log(`🚀 Portfolio server running at http://localhost:${PORT}`);
            console.log(`📁 Admin panel: http://localhost:${PORT}/admin`);
            console.log(`🎨 Demo mode: http://localhost:${PORT}/demo`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
