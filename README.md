# PadhAI 🧠📚

> An open-source, AI-powered research assistant — upload your documents, chat with them, generate quizzes, build concept maps, write structured reports, and memorise everything with flashcards.

**Live:** [padh-aiaditya.vercel.app](https://padh-aiaditya.vercel.app)

---

## What is PadhAI?

PadhAI turns any document into an interactive study workspace. Upload a PDF, paste your notes, or drop in a textbook chapter — then ask questions, generate quizzes, build concept maps, write reports, and drill flashcards. Every answer is grounded in your sources, not random internet text.

Named after "पढ़ाई" (Hindi for "studies"), PadhAI is built for students, teachers, and anyone who wants a focused research tool without vendor lock-in.

---

## ✨ Features

### 📄 Document Understanding
- **PDF upload** — text-based PDFs extracted instantly
- **Scanned PDF OCR** — image-only PDFs routed through OCR
- **Large PDF support** — automatic client-side splitting for files over 4 MB
- **Paste text** — drop in any article, notes, or excerpt
- **Persistent sources** — saved to the server, survives refreshes and device switches

### 💬 Chat with Vector Search
- **Production RAG** — retrieval-augmented generation over your documents
- **Upstash Vector** — serverless vector DB with automatic embeddings
- **Streaming responses** — answers appear word-by-word
- **Source citations** — every answer references the chunks it used
- **Web Search toggle** — pull live results from the internet when needed
- **8-layer model fallback** — gpt-oss-120b → 20b → Qwen 3.6 → Qwen 3.8, across two Groq accounts

### 📝 Quiz Generation
- **Multiple choice** — 4 options per question
- **Adjustable difficulty** — Easy, Standard, Hard, Expert
- **Adjustable length** — 3, 5, 8, or 12 questions
- **Instant scoring** — see your score and per-question explanations

### 🃏 Flashcards
- **Active recall** — flip cards to memorise terms and formulas
- **Adjustable deck size** — 8, 15, 25, or 40 cards
- **Persistent progress** — known/unknown state saved to the server
- **Results screen** — animated score ring + difficulty breakdown charts
- **Review mode** — jump back to cards you struggled with

### 🧠 Brain Map
- **Concept extraction** — pull out key ideas from your sources
- **Relationship graph** — visualize how concepts connect
- **Force-directed layout** — interactive, draggable graph

### 📄 Report Generation
- **Structured output** — title, executive summary, sections, takeaways, references
- **Markdown rendering** — tables, headings, code blocks
- **Math rendering** — KaTeX support for equations and chemical formulas

### 🔐 Accounts & Notebooks
- **Sign in with Google** — one-click auth via Neon Auth
- **Multi-notebook** — up to 15 notebooks per user
- **Per-notebook isolation** — sources, vectors, and chats stay separate
- **Server-persisted everything** — chats, pasted text, flashcards
- **Dashboard** — time-aware greeting, recent notebooks, search, colored cards

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **LLM** | Groq — openai/gpt-oss-120b, gpt-oss-20b, qwen/qwen3.6-27b, qwen/qwen3.8-27b |
| **Vector Store** | Upstash Vector (built-in embeddings) |
| **Auth** | Neon Auth (Better Auth) |
| **Database** | Neon Postgres |
| **PDF parsing** | unpdf, pdf-lib |
| **OCR** | OCR.space API |
| **Markdown** | react-markdown + remark-gfm + remark-math + rehype-katex |
| **Charts** | recharts |
| **Deployment** | Vercel |

---

## 🚀 Local Setup

### 1. Clone the repo

    git clone https://github.com/Aditya-cyber-hind/PadhAI.git
    cd PadhAI

### 2. Install dependencies

    npm install

### 3. Get API keys

You'll need accounts on:

| Service | Free tier | Get key at |
|---------|-----------|-----------|
| **Groq** | 8K TPM / 200K TPD | console.groq.com |
| **Groq (backup)** | Same — different email | console.groq.com |
| **Upstash Vector** | 10K queries/day | console.upstash.com/vector |
| **OCR.space** | 25K requests/month | ocr.space/ocrapi/freekey |
| **Neon Postgres + Auth** | 0.5 GB | neon.tech |

### 4. Create .env.local

    GROQ_API_KEY=gsk_...
    GROQ_API_KEY_2=gsk_...
    UPSTASH_VECTOR_REST_URL=https://...
    UPSTASH_VECTOR_REST_TOKEN=...
    OCR_SPACE_API_KEY=...
    DATABASE_URL=postgresql://...
    NEON_AUTH_BASE_URL=https://...
    NEON_AUTH_COOKIE_SECRET=<64-character hex string>

Generate a cookie secret with:

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

### 5. Run database migrations

In your Neon SQL Editor, run the SQL from the repo's `migrations/` folder or paste the CREATE TABLE statements shown in the setup docs.

### 6. Run the dev server

    npm run dev

Open http://localhost:3000

---

## 📂 Project Structure

    padh-ai/
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── auth/              # Neon Auth handler
    │   │   │   ├── notebooks/         # Notebook CRUD + pasted-text
    │   │   │   ├── chat/              # Streaming chat with RAG + 8-layer fallback
    │   │   │   ├── chat/history/      # Persisted chat messages
    │   │   │   ├── ingest/            # Chunk + embed + upsert to Upstash
    │   │   │   ├── extract/           # PDF text extraction
    │   │   │   ├── ocr/               # OCR.space integration
    │   │   │   ├── quiz/              # Quiz generation
    │   │   │   ├── flashcards/        # Flashcard generation + progress
    │   │   │   ├── brainmap/          # Concept extraction
    │   │   │   ├── report/            # Structured report generation
    │   │   │   ├── clear-session/     # Reset notebook vectors
    │   │   │   ├── clear-source/      # Remove one source
    │   │   │   ├── usage/             # Usage status endpoint
    │   │   │   └── warmup/            # Runtime pre-warm
    │   │   ├── auth/[path]/           # Sign-in page
    │   │   ├── account/[path]/        # Settings + security
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── Dashboard.tsx          # Notebook grid + greeting
    │   │   ├── WorkspaceHeader.tsx    # Back button + rename
    │   │   ├── UserMenu.tsx           # Avatar dropdown
    │   │   ├── SourcePanel.tsx        # Upload + paste UI
    │   │   ├── FeatureTabs.tsx        # Top-level tab navigation
    │   │   ├── ChatPanel.tsx          # Chat + web search toggle
    │   │   ├── QuizPanel.tsx          # Interactive quiz
    │   │   ├── FlashcardPanel.tsx     # Flashcards + results screen
    │   │   ├── BrainMapPanel.tsx      # Force-directed concept graph
    │   │   ├── ReportPanel.tsx        # Markdown report
    │   │   └── Toast.tsx              # Notifications
    │   └── lib/
    │       ├── groq.ts                # Groq clients + model constants
    │       ├── auth/                  # Neon Auth server + client
    │       ├── notebooks/             # Notebook DB queries
    │       ├── flashcards/            # Flashcard DB queries
    │       ├── chat/                  # Chat history DB queries
    │       ├── usage/                 # Usage tracking
    │       └── rag/
    │           ├── chunking.ts        # Recursive text chunking
    │           └── retrieve.ts        # Upstash namespace queries
    ├── package.json
    ├── next.config.ts
    └── README.md

---

## 🎯 How It Works

### Ingestion
1. User uploads PDF or pastes text into a notebook
2. Server extracts text (or runs OCR for scanned PDFs)
3. Text is split into ~500-token chunks with overlap
4. Each chunk is sent to Upstash Vector — embeddings handled server-side
5. Chunks stored in a namespace unique to that notebook

### Retrieval
1. User asks a question
2. Question embedded by Upstash
3. Cosine similarity finds the top 5 chunks in that notebook's namespace
4. Chunks injected into the LLM prompt as context
5. Model answers using only those chunks

### Model Fallback
Each chat request tries 8 candidates in sequence:
1. primary/120b
2. primary/20b
3. primary/qwen3.6
4. primary/qwen3.8
5. backup/120b
6. backup/20b
7. backup/qwen3.6
8. backup/qwen3.8

The client retries with the next candidate on failure — the user just sees the final answer.

### Web Search
- Toggle enabled → Groq's browser search runs server-side
- Only gpt-oss models support it — Qwen candidates skip it
- Results cited inline

---

## 🗺️ Roadmap

### ✅ Shipped
- [x] Chat with streaming responses
- [x] PDF upload (text + scanned OCR)
- [x] Vector search with per-notebook isolation
- [x] Quiz generation (difficulty + count)
- [x] Flashcards with results analytics
- [x] Brain Map generation
- [x] Report generation
- [x] Web search
- [x] Google sign-in
- [x] Multi-notebook support
- [x] Chat + pasted text + flashcards persistence
- [x] 8-layer model fallback
- [x] Per-user rate limits
- [x] Dashboard redesign with search + colors
- [x] KaTeX math rendering
- [x] Mobile-responsive layout
- [x] Landing page

### 🚧 In Progress
- [ ] Persistent student memory (per-user learning profile)
- [ ] Shareable notebook links
- [ ] Voice input

### 🔮 Planned
- [ ] Export quiz / flashcards as PDF
- [ ] Anki export
- [ ] Multi-user collaboration
- [ ] Custom instructions per notebook
- [ ] Dark mode

---

## 🤝 Contributing

Contributions welcome. Open an issue or submit a PR.

---

## 📄 License

MIT

---

## 🧑‍💻 Author

Built by [Aditya Choudhary](https://github.com/Aditya-cyber-hind) — 13-year-old developer from India.

Other projects:
- [HeavenDB](https://github.com/Aditya-cyber-hind/HeavenDB) — SQL database engine in pure C
- [Dapine](https://github.com/Aditya-cyber-hind/dapine) — data pipeline programming language
- [BookTok](https://github.com/Aditya-cyber-hind/BookTok) — social platform for readers
- [GehriSoch](https://github.com/Aditya-cyber-hind/GehriSoch) (archived) — GPT-style transformer from scratch

---

_"PadhAI — because reading shouldn't be passive."_ 📚✨