# JSON Portfolio Webapp (https://me.soloengine.in)

A lightweight, JSON-driven portfolio website with theme switching, demo mode, admin panel, and RAG-based chatbot.

## Features

- 📄 **JSON-Driven Content**: All portfolio data rendered from a single JSON file
- 🎨 **Theme System**: 4 beautiful themes (Minimal, Modern, Elegant, Retro) with localStorage persistence
- 🔧 **Demo Mode**: Live JSON editor with iframe preview using sessionStorage
- 🔐 **Admin Panel**: Protected dashboard for uploading new portfolio JSON
- 💬 **RAG Chatbot**: AI-powered chatbox that answers questions about the portfolio
- 📊 **Theme Analytics**: Track theme popularity with a simple dashboard

## Quick Start (Docker)

1. **Clone and configure:**
   ```bash
   # Copy example env file
   cp .env.example .env
   
   # Edit .env with your settings
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_secure_password
   
   # Choose your LLM provider
   LLM_PROVIDER=gemini  # openai | huggingface | gemini | openrouter
   GEMINI_API_KEY=your-api-key  # Or OPENAI_API_KEY, HUGGINGFACE_API_KEY, etc.
   ```

2. **Start with Docker Compose:**
   ```bash
   # Development (with hot reload)
   docker-compose -f docker-compose.dev.yml up --build
   
   # Production
   docker-compose up --build -d
   ```

3. **Open in browser:**
   - Portfolio: http://localhost:3000
   - Demo Mode: http://localhost:3000/demo
   - Admin Panel: http://localhost:3000/admin (default: admin/password123)

### Using Make (optional)

```bash
make dev      # Start development server
make prod     # Start production server
make stop     # Stop all containers
make logs     # View logs
make clean    # Remove containers and images
```

### Without Docker

```bash
npm install
npm run dev   # Development with auto-reload
npm start     # Production
```


## Folder Structure

```
root/
  server.js           # Express server with all API routes
  package.json
  .env                # Environment variables (not in git)
  
  data/
    portfolio.json    # Main portfolio data
    theme-analytics.json
    portfolio.backup-*.json  # Auto-generated backups
  
  public/
    index.html        # Main portfolio page
    demo.html         # Demo mode with JSON editor
    admin.html        # Admin panel
    
    css/
      base.css        # Structural layout
      theme-minimal.css
      theme-modern.css
      theme-elegant.css
      theme-retro.css
    
    js/
      render.js       # Portfolio rendering
      theme.js        # Theme switching
      demo.js         # Demo mode logic
      chatbox.js      # Chat interface
  
  rag/
    chunker.js        # Portfolio content chunking
    embed.js          # Embedding generation
    retriever.js      # Similarity search
    llm.js            # LLM response generation
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/portfolio` | No | Get portfolio JSON |
| POST | `/api/upload` | Yes | Upload new portfolio |
| POST | `/api/theme-analytics` | No | Track theme switch |
| POST | `/api/chat` | No | Send chat message |
| GET | `/api/llm/status` | No | Get current LLM provider status |
| GET | `/admin/theme-stats` | Yes | Get theme analytics |

## Portfolio JSON Structure

```json
{
  "profile": {
    "name": "Your Name",
    "title": "Job Title",
    "avatar": "URL",
    "location": "City, Country",
    "email": "email@example.com",
    "summary": "About you..."
  },
  "socials": [
    { "platform": "GitHub", "url": "...", "icon": "github" }
  ],
  "skills": [
    { "category": "Frontend", "items": ["React", "Vue"] }
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": "...",
      "technologies": ["Node.js"],
      "url": "...",
      "github": "..."
    }
  ],
  "experience": [
    {
      "company": "Company",
      "role": "Role",
      "period": "2020 - Present",
      "description": "..."
    }
  ],
  "education": [
    {
      "institution": "University",
      "degree": "B.S. Computer Science",
      "year": "2020"
    }
  ]
}
```

## Themes

- **Minimal**: Clean black and white with subtle grays
- **Modern**: Dark mode with vibrant purple/cyan gradients
- **Elegant**: Warm gold/cream tones with serif typography
- **Retro**: 80s/90s inspired with neon colors and CRT effects

## Security

- Admin routes protected with HTTP Basic Auth
- Credentials stored in environment variables
- OpenAI API key never exposed to frontend
- Input validation on all endpoints
- Automatic JSON backups before updates

## RAG Chatbot

The chatbot uses Retrieval-Augmented Generation with **multi-provider LLM support**:

### Supported Providers

| Provider | Env Variable | Default Model | Embeddings |
|----------|--------------|---------------|------------|
| **OpenAI** | `OPENAI_API_KEY` | gpt-4o-mini | ✅ text-embedding-3-small |
| **Hugging Face** | `HUGGINGFACE_API_KEY` | Mistral-7B-Instruct | ✅ MiniLM-L6-v2 |
| **Google Gemini** | `GEMINI_API_KEY` | gemini-1.5-flash | ✅ text-embedding-004 |
| **OpenRouter** | `OPENROUTER_API_KEY` | llama-3.1-8b:free | ❌ (keyword fallback) |

### Configuration

```bash
# In your .env file
LLM_PROVIDER=gemini          # openai | huggingface | gemini | openrouter
GEMINI_API_KEY=your-key-here

# Optional: Override default model
LLM_CHAT_MODEL=gemini-1.5-pro
```

### How It Works

1. Portfolio JSON is chunked into semantic blocks
2. Embeddings generated on server startup (if provider supports it)
3. User questions matched to relevant chunks via cosine similarity
4. LLM generates response using context

### Check Provider Status

```bash
curl http://localhost:3000/api/llm/status
```

**Without API Key**: Falls back to simple keyword matching - still functional but less intelligent.

## License

MIT
