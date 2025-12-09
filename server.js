import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, writeFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';

// RAG modules
import { initializeEmbeddings } from './rag/embed.js';
import { retrieveRelevantChunks } from './rag/retriever.js';
import { generateResponse } from './rag/llm.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const DATA_DIR = join(__dirname, 'data');
const PORTFOLIO_PATH = join(DATA_DIR, 'portfolio.json');
const ANALYTICS_PATH = join(DATA_DIR, 'theme-analytics.json');

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

// POST Theme Analytics
app.post('/api/theme-analytics', async (req, res) => {
    try {
        const { theme } = req.body;

        if (!theme || !['minimal', 'modern', 'elegant', 'retro'].includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme name' });
        }

        let analytics = { minimal: 0, modern: 0, elegant: 0, retro: 0 };

        try {
            const data = await readFile(ANALYTICS_PATH, 'utf8');
            analytics = JSON.parse(data);
        } catch {
            // File doesn't exist, use defaults
        }

        analytics[theme] = (analytics[theme] || 0) + 1;

        await writeFile(ANALYTICS_PATH, JSON.stringify(analytics, null, 2), 'utf8');

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating analytics:', error);
        res.status(500).json({ error: 'Failed to update analytics' });
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
