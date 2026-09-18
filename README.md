# PadhAI 🧠📚

> An open-source, AI-powered research assistant — chat with your documents, generate quizzes, build concept maps, and pull live web results. Built from scratch with Next.js and Groq.

**Live:** [padh-aiaditya.vercel.app](https://padh-aiaditya.vercel.app)

---

## What is PadhAI?

PadhAI is a self-hostable research assistant that turns any document into an interactive workspace. Paste text or upload a PDF — even scanned ones — and PadhAI answers your questions using only that content, generates quizzes from it, builds concept maps, and writes structured reports.

Flip on Web Search and it also pulls live information from the internet with citations.

Named after "पढ़ाई" (Hindi for "studies"), PadhAI is built for students, researchers, and anyone who wants a focused AI assistant without vendor lock-in.

---

## ✨ Features

### 📄 Document Understanding
- **PDF upload** — text-based PDFs are extracted instantly
- **Scanned PDF OCR** — image-only PDFs are automatically routed through OCR
- **Client-side PDF splitting** — large PDFs are split into chunks so they work with free OCR tiers
- **Paste text** — anything you copy, from articles to notes
- **Session isolation** — every browser tab has its own vector space; no data leaks between users

### 💬 Chat with Vector Search
- **Production RAG** — retrieval-augmented generation over your documents
- **Upstash Vector** — serverless vector DB with automatic embedding
- **Streaming responses** — see answers appear word-by-word
- **Source citations** — every answer references the chunks it used
- **Web Search toggle** — pull live results from the internet with Groq's browser tool

### 📝 Quiz Generation
- **Multiple choice** — 4 options per question
- **Adjustable difficulty** — Easy, Standard, Hard, Expert
- **Adjustable length** — 3, 5, 8, or 12 questions
- **Instant scoring** — see your score and explanations for each answer

### 🧠 Brain Map
- **Concept extraction** — pull out key ideas from your sources
- **Relationship graph** — visualize how concepts connect
- **Force-directed layout** — interactive, draggable graph
- **Importance weighting** — see which concepts are most central

### 📄 Report Generation
- **Structured output** — title, executive summary, sections, takeaways, references
- **Markdown rendering** — tables, headings, code blocks
- **Source-grounded** — every fact traced back to your document
- **One click** — no prompt engineering needed

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **LLM** | Groq (`openai/gpt-oss-120b`) |
| **Vector Store** | Upstash Vector (built-in embeddings) |
| **PDF parsing** | `unpdf`, `pdf-lib` |
| **OCR** | OCR.space API |
| **Auth (ready)** | Neon Auth |
| **Deployment** | Vercel |

---

## 🚀 Local Setup

### 1. Clone the repo

    git clone https://github.com/Aditya-cyber-hind/PadhAI.git
    cd PadhAI

### 2. Install dependencies

    npm install

### 3. Get API keys

You'll need four free accounts:

| Service | Free tier | Get key at |
|---------|-----------|-----------|
| **Groq** | 8K TPM | [console.groq.com](https://console.groq.com) |
| **Upstash Vector** | 10K queries/day | [console.upstash.com/vector](https://console.upstash.com/vector) |
| **OCR.space** | 25K requests/month | [ocr.space/ocrapi/freekey](https://ocr.space/ocrapi/freekey) |
| **Neon Postgres** | 0.5 GB | [neon.tech](https://neon.tech) (optional) |

### 4. Create `.env.local`

    GROQ_API_KEY=gsk_...
    UPSTASH_VECTOR_REST_URL=https://...
    UPSTASH_VECTOR_REST_TOKEN=...
    OCR_SPACE_API_KEY=...

### 5. Run the dev server

    npm run dev

Open [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

    padh-ai/
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── chat/           # Streaming chat with RAG + web search
    │   │   │   ├── ingest/         # Chunk + embed + upsert to Upstash
    │   │   │   ├── extract/        # PDF text extraction
    │   │   │   ├── ocr/            # OCR.space integration
    │   │   │   ├── quiz/           # Structured quiz generation
    │   │   │   ├── brainmap/       # Concept extraction
    │   │   │   ├── report/         # Structured report generation
    │   │   │   └── clear-session/  # Wipe session vectors
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── SourcePanel.tsx     # Upload + paste UI
    │   │   ├── FeatureTabs.tsx     # Top-level tab navigation
    │   │   ├── ChatPanel.tsx       # Chat + web search toggle
    │   │   ├── QuizPanel.tsx       # Interactive quiz
    │   │   ├── BrainMapPanel.tsx   # Force-directed graph
    │   │   └── ReportPanel.tsx     # Markdown report
    │   └── lib/
    │       ├── groq.ts             # Groq client + model constants
    │       └── rag/
    │           ├── chunking.ts     # Recursive text chunking
    │           ├── retrieve.ts     # Upstash query
    │           └── session.ts      # Per-tab session IDs
    ├── package.json
    ├── next.config.ts
    └── README.md

---

## 🎯 How It Works

### Ingestion Pipeline
1. User uploads PDF or pastes text
2. Server extracts text (or runs OCR for scanned PDFs)
3. Text is split into ~500-token chunks with overlap
4. Each chunk is sent to Upstash Vector — Upstash handles embedding server-side
5. Chunks are stored with `sessionId` metadata for isolation

### Retrieval Pipeline
1. User asks a question
2. Question is embedded by Upstash (same model as ingestion)
3. Cosine similarity finds the top 5 matching chunks
4. Chunks are injected into the Groq prompt as context
5. Model answers using only those chunks

### Web Search
- Toggle enabled → Groq's browser search runs server-side
- Results are cited inline with citation markers
- Works only in Chat (not compatible with structured outputs like Quiz)

---

## 🧠 Design Decisions

**Why Upstash Vector over pgvector?**
Voyage AI's free tier rate-limits to 3 RPM, which makes ingestion painful. Upstash bundles embedding into the vector DB, eliminating a separate API dependency entirely.

**Why `sessionStorage` for session IDs?**
Each browser tab gets its own isolated workspace. No auth needed, no cross-user leaks. When auth ships, we'll swap `sessionId` for `userId`.

**Why Groq `gpt-oss-120b`?**
Best free-tier model for structured output. Fast (LPU inference), supports browser search, and handles reasoning/JSON modes cleanly.

**Why client-side PDF splitting?**
OCR.space's free tier caps at 3 pages per PDF. Splitting client-side means users can upload 100-page documents without hitting the limit.

---

## 🗺️ Roadmap

### ✅ Shipped
- [x] Chat with streaming responses
- [x] PDF upload (text + scanned OCR)
- [x] Vector search with session isolation
- [x] Quiz generation with difficulty + count settings
- [x] Brain Map generation
- [x] Report generation
- [x] Web search via Groq browser tool
- [x] Deployed on Vercel

### 🚧 In Progress
- [ ] Mobile-responsive layout
- [ ] User accounts (Neon Auth)

### 🔮 Planned
- [ ] Multi-notebook support
- [ ] Persistent chat history
- [ ] Export to PDF
- [ ] Voice input (Web Speech API)
- [ ] Shareable notebook links
- [ ] Collaborative notebooks

---

## 🤝 Contributing

Contributions welcome. Open an issue or submit a PR.

---

## 📄 License

MIT

---

## 🧑‍💻 Author

Built by [Aditya Choudhary](https://github.com/Aditya-cyber-hind) — 13-year-old systems programmer from India.

Also built:
- [HeavenDB](https://github.com/Aditya-cyber-hind/HeavenDB) — a SQL database engine in pure C
- [Dapine](https://github.com/Aditya-cyber-hind/dapine) — a data pipeline programming language
- [BookTok](https://github.com/Aditya-cyber-hind/BookTok) — a social platform for bookworms

---

_"PadhAI — because reading shouldn't be passive."_ 📚✨