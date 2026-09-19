# PadhAI 🧠📚

> An open-source, AI-powered research assistant — upload documents, chat with them, generate quizzes, build concept maps, and pull live web results. Built with Next.js, Groq, and Upstash Vector.

**Live:** [padh-aiaditya.vercel.app](https://padh-aiaditya.vercel.app)

---

## What is PadhAI?

PadhAI turns any document into an interactive workspace. Upload a PDF, paste text, and ask questions — the assistant answers using only that content. You can also generate quizzes, visualize concepts, and write structured reports from the same source.

Named after "पढ़ाई" (Hindi for "studies"), PadhAI is built for students, researchers, and anyone who wants a focused research tool without vendor lock-in.

---

## ✨ Features

### 📄 Document Understanding
- **PDF upload** — text-based PDFs extracted instantly
- **Scanned PDF OCR** — image-only PDFs routed through OCR
- **Large PDF support** — automatic client-side splitting for files over 4 MB
- **Paste text** — drop in any article, notes, or excerpt

### 💬 Chat with Vector Search
- **Production RAG** — retrieval-augmented generation over your documents
- **Upstash Vector** — serverless vector database with automatic embeddings
- **Streaming responses** — answers appear word-by-word
- **Source citations** — every answer references the chunks it used
- **Web Search toggle** — pull live results from the internet

### 📝 Quiz Generation
- **Multiple choice** — 4 options per question
- **Adjustable difficulty** — Easy, Standard, Hard, Expert
- **Adjustable length** — 3, 5, 8, or 12 questions
- **Instant scoring** — see your score and per-question explanations

### 🧠 Brain Map
- **Concept extraction** — pull out key ideas from your sources
- **Relationship graph** — visualize how concepts connect
- **Force-directed layout** — interactive, draggable graph
- **Importance weighting** — see which concepts are most central

### 📄 Report Generation
- **Structured output** — title, executive summary, sections, takeaways, references
- **Markdown rendering** — tables, headings, code blocks
- **Source-grounded** — every fact traced back to your document

### 🔐 Accounts & Notebooks
- **Sign in with Google** — one-click auth
- **Multi-notebook** — up to 15 notebooks per user
- **Per-notebook isolation** — sources, vectors, and chats stay separate
- **Persistent chat history** — conversations survive refreshes
- **Dashboard view** — time-aware greeting and notebook grid

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **LLM** | Groq (`openai/gpt-oss-120b`) |
| **Vector Store** | Upstash Vector |
| **Auth** | Neon Auth (Better Auth) |
| **Database** | Neon Postgres |
| **PDF parsing** | `unpdf`, `pdf-lib` |
| **OCR** | OCR.space API |
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
| **Groq** | 8K TPM | [console.groq.com](https://console.groq.com) |
| **Upstash Vector** | 10K queries/day | [console.upstash.com/vector](https://console.upstash.com/vector) |
| **OCR.space** | 25K requests/month | [ocr.space/ocrapi/freekey](https://ocr.space/ocrapi/freekey) |
| **Neon Postgres + Auth** | 0.5 GB | [neon.tech](https://neon.tech) |

### 4. Create `.env.local`

    GROQ_API_KEY=gsk_...
    UPSTASH_VECTOR_REST_URL=https://...
    UPSTASH_VECTOR_REST_TOKEN=...
    OCR_SPACE_API_KEY=...
    DATABASE_URL=postgresql://...
    NEON_AUTH_BASE_URL=https://...
    NEON_AUTH_COOKIE_SECRET=<64-character hex string>

Generate a cookie secret with:

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

### 5. Run database migrations

In your Neon SQL Editor:

    CREATE TABLE IF NOT EXISTS notebooks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS notebooks_user_idx ON notebooks(user_id);
    CREATE INDEX IF NOT EXISTS notebooks_user_updated_idx ON notebooks(user_id, updated_at DESC);

### 6. Run the dev server

    npm run dev

Open [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

    padh-ai/
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── auth/          # Neon Auth handler
    │   │   │   ├── notebooks/     # Notebook CRUD
    │   │   │   ├── chat/          # Streaming chat with RAG
    │   │   │   ├── ingest/        # Chunk + embed + upsert
    │   │   │   ├── extract/       # PDF text extraction
    │   │   │   ├── ocr/           # OCR.space integration
    │   │   │   ├── quiz/          # Structured quiz generation
    │   │   │   ├── brainmap/      # Concept extraction
    │   │   │   ├── report/        # Structured report generation
    │   │   │   ├── clear-session/ # Wipe notebook vectors
    │   │   │   ├── clear-source/  # Remove one source's vectors
    │   │   │   └── warmup/        # Runtime pre-warm
    │   │   ├── auth/[path]/       # Sign-in page
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── Dashboard.tsx      # Notebook grid + greeting
    │   │   ├── WorkspaceHeader.tsx # Back button + rename
    │   │   ├── UserMenu.tsx       # Avatar dropdown
    │   │   ├── SourcePanel.tsx    # Upload + paste UI
    │   │   ├── FeatureTabs.tsx    # Top-level tab navigation
    │   │   ├── ChatPanel.tsx      # Chat + web search toggle
    │   │   ├── QuizPanel.tsx      # Interactive quiz
    │   │   ├── BrainMapPanel.tsx  # Force-directed graph
    │   │   └── ReportPanel.tsx    # Markdown report
    │   └── lib/
    │       ├── groq.ts            # Groq client
    │       ├── auth/              # Auth server + client
    │       ├── notebooks/         # Notebook DB queries
    │       └── rag/
    │           ├── chunking.ts    # Recursive text chunking
    │           └── retrieve.ts    # Upstash namespace queries
    ├── package.json
    ├── next.config.ts
    └── README.md

---

## 🎯 How It Works

### Ingestion
1. User uploads PDF or pastes text into a notebook
2. Server extracts text (or runs OCR for scanned PDFs)
3. Text split into ~500-token chunks with overlap
4. Each chunk sent to Upstash Vector — embeddings handled server-side
5. Chunks stored in a namespace unique to that notebook

### Retrieval
1. User asks a question
2. Question embedded by Upstash
3. Cosine similarity finds the top 5 chunks in that notebook's namespace
4. Chunks injected into the LLM prompt as context
5. Model answers using only those chunks

### Web Search
- Toggle enabled → browser search runs server-side
- Results cited inline
- Works only in Chat (not structured outputs)

---

## 🧠 Design Decisions

**Why Upstash Vector over pgvector?**
Voyage AI's free tier rate-limits to 3 RPM, making ingestion painful. Upstash bundles embedding into the vector DB — one less external dependency.

**Why namespaces instead of metadata filtering?**
Each notebook gets its own vector namespace. Queries are faster, deletion is one call, and cross-notebook leaks are structurally impossible.

**Why client-side PDF splitting?**
OCR.space's free tier caps at 3 pages per PDF, and Vercel's function body limit is 4.5 MB. Splitting client-side before upload solves both.

**Why `localStorage` for chat history?**
Fast to ship, per-browser, no backend work. Server-side sync can come later.

---

## 🗺️ Roadmap

### ✅ Shipped
- [x] Chat with streaming responses
- [x] PDF upload (text + scanned OCR)
- [x] Vector search with per-notebook isolation
- [x] Quiz generation (difficulty + count)
- [x] Brain Map generation
- [x] Report generation
- [x] Web search
- [x] Google sign-in
- [x] Multi-notebook support
- [x] Per-notebook chat persistence

### 🚧 In Progress
- [ ] Mobile-responsive layout
- [ ] Account settings page

### 🔮 Planned
- [ ] Voice input (Web Speech API)
- [ ] Shareable notebook links
- [ ] Export to PDF
- [ ] Source annotations
- [ ] Collaborative notebooks

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

---

_"PadhAI — because reading shouldn't be passive."_ 📚✨