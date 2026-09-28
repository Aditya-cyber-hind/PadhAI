# PadhAI 🧠📚

> An open-source, AI-powered study workspace — upload your documents, chat with them, generate quizzes and flashcards, build concept maps, export polished reports and slide decks, and share notebooks with your class.

**Live:** [padh-aiaditya.vercel.app](https://padh-aiaditya.vercel.app)
**Source:** [github.com/Aditya-cyber-hind/PadhAI](https://github.com/Aditya-cyber-hind/PadhAI)

---

## What is PadhAI?

PadhAI turns any document into an interactive study workspace. Upload a PDF, drop in a YouTube video, paste a web article, or write your own notes — then ask questions, generate quizzes, build flashcards, write structured reports, and share it all with your class. Every answer is grounded in **your** sources, with real citations you can verify.

Named after "पढ़ाई" (Hindi for "studies"), PadhAI is built for students, teachers, and anyone who wants a focused research tool without vendor lock-in.

---

## Features

### Sources — add anything

- **PDF upload** — text-based PDFs extracted instantly
- **Scanned PDF OCR** — image-only PDFs routed through OCR.space
- **Web articles** — paste any URL, extracted via Mozilla Readability
- **YouTube transcripts** — paste a video URL, transcript fetched automatically via a 4-provider fallback pipeline
- **Paste text** — drop in any article, notes, or excerpt
- **Persistent sources** — saved to Postgres, survive refresh and device switches

### Chat with citations

- **Production RAG** — retrieval-augmented generation over your documents
- **Upstash Vector** — serverless vector DB with automatic embeddings
- **Streaming responses** — answers appear word-by-word
- **Inline citations** — superscript pills on every claim, hover to preview, click to open a side drawer with the full passage, then jump to the source card
- **Web Search toggle** — pull live results from the internet when needed
- **7-layer model fallback** — Groq 120b / 20b / Qwen 3.8 across two accounts, plus Mistral as a final fallback

### Quiz generator (persistent)

- **Multiple choice** — 4 options per question
- **Adjustable difficulty** — Easy, Standard, Hard, Expert
- **Adjustable length** — 3, 5, 8, or 12 questions
- **Saved quizzes** — multiple quizzes per notebook, retake them anytime
- **Auto titles** — LLM names each quiz so you can find it later
- **Instant scoring** — see your score and per-question explanations

### Flashcards

- **Active recall** — flip cards to memorise terms and formulas
- **Adjustable deck size** — 8, 15, 25, or 40 cards
- **Persistent progress** — known/unknown state saved to the server
- **Results screen** — animated score ring + difficulty breakdown charts
- **Review mode** — jump back to cards you struggled with

### Slideshow

- **Presentation-ready decks** — turn any document into slides
- **Five designed slide types** — Title, Section, Bullets, Statement, Takeaway
- **Dark theme** — amber and orange accent gradients on a near-black canvas
- **Present mode** — fullscreen with arrow-key navigation, speaker notes toggle, and F for fullscreen

### Brain Map (persistent)

- **Concept extraction** — pull key ideas from your sources
- **Relationship graph** — visualize how concepts connect
- **Force-directed layout** — interactive, draggable graph
- **Saved per notebook** — reload and regenerate anytime

### Report writer (persistent)

- **Structured output** — title, executive summary, sections, key takeaways, references
- **Markdown rendering** — tables, headings, code blocks
- **Math rendering** — KaTeX support for equations and chemical formulas
- **Saved per notebook** — reload without regenerating

### Export

- **Whole-notebook PDF** — cover page, sources list, chat transcript, quizzes, flashcards, and optional slides in one document
- **Toggleable sections** — pick exactly what to include
- **Quiz & flashcard PDFs** — proper layouts with real KaTeX math rendering
- **Markdown export** — portable format for any editor
- **Anki-compatible CSV** — import flashcards directly into Anki

### Shareable notebooks

- **Public read-only links** — generate a share URL for any notebook
- **Friends view without signing in** — quizzes, flashcards, and slideshow are all visible
- **Chat stays private** — only the study material is exposed
- **Revocable** — disable any shared link from the Share modal

### Accounts & notebooks

- **Sign in with Google** — one-click auth via Neon Auth
- **Multi-notebook** — up to 15 notebooks per user
- **Per-notebook isolation** — sources, vectors, chats, and all study material stay separate
- **Auto-generated emojis** — each notebook gets an LLM-picked emoji based on its content, with a shuffle button
- **Dashboard** — time-aware greeting, recent notebooks, search, colored cards

### Design system

- **Inter + Fraunces** — clean UI text with editorial headlines
- **Warm amber accent** — a signature color used consistently across the entire app
- **Motion** — message entry, card stagger, tab cross-fade, modal springs, scroll reveals
- **Dark-themed slideshow** — with amber gradients on a near-black canvas
- **Mobile-first layout** — every surface is tuned for phones

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Fonts** | Inter + Fraunces via next/font |
| **Motion** | Motion (formerly Framer Motion) |
| **LLM** | Groq (gpt-oss-120b, gpt-oss-20b, qwen3.8-27b) + Mistral (mistral-small-latest) |
| **Vector Store** | Upstash Vector (built-in embeddings) |
| **Auth** | Neon Auth (Better Auth) |
| **Database** | Neon Postgres |
| **PDF parsing** | unpdf, pdf-lib |
| **PDF generation** | pdf-lib + html2canvas-pro |
| **OCR** | OCR.space API |
| **YouTube transcripts** | yTranscript + Supadata + youtubetranscriptdownload.com + Apify |
| **Web scraping** | Mozilla Readability + jsdom |
| **Markdown** | react-markdown + remark-gfm + remark-math + rehype-katex |
| **Charts** | recharts |
| **Deployment** | Vercel |

---

## Local Setup

### 1. Clone the repo

```
git clone https://github.com/Aditya-cyber-hind/PadhAI.git
cd PadhAI
```

### 2. Install dependencies

```
npm install --legacy-peer-deps
```

### 3. Get API keys

You'll need accounts on:

| Service | Free tier | Get key at |
|---------|-----------|-----------|
| **Groq** | 30 RPM, varies by model | console.groq.com |
| **Groq (backup)** | Same — different account | console.groq.com |
| **Mistral** | 1 RPS, 1B tokens/month | console.mistral.ai |
| **Upstash Vector** | 10K queries/day | console.upstash.com/vector |
| **OCR.space** | 25K requests/month | ocr.space/ocrapi/freekey |
| **Neon Postgres + Auth** | 0.5 GB | neon.tech |
| **yTranscript** | 50/month | ytranscript.com |
| **Supadata** | 100/month | supadata.ai |
| **youtubetranscriptdownload.com** | 25/month | youtubetranscriptdownload.com |
| **Apify** | $5 platform credit/month | console.apify.com |

All providers are free-tier, no credit card required.

### 4. Create .env.local

```
GROQ_API_KEY=gsk_...
GROQ_API_KEY_2=gsk_...
MISTRAL_API_KEY=...

DATABASE_URL=postgresql://...

NEON_AUTH_BASE_URL=https://...
NEON_AUTH_COOKIE_SECRET=<64-character hex string>

UPSTASH_VECTOR_REST_URL=https://...
UPSTASH_VECTOR_REST_TOKEN=...

OCR_SPACE_API_KEY=...

YTRANSCRIPT_API_KEY=yk_live_...
SUPADATA_API_KEY=...
YTDL_API_KEY=ytd_sk_...
APIFY_TOKEN=apify_api_...
```

Generate the auth cookie secret with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Run database migrations

In your Neon SQL Editor, create these tables:

```
CREATE TABLE IF NOT EXISTS notebooks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, name TEXT NOT NULL, emoji TEXT, share_token TEXT, pasted_text TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS idx_notebooks_share_token ON notebooks (share_token) WHERE share_token IS NOT NULL;
CREATE TABLE IF NOT EXISTS sources (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE, user_id TEXT NOT NULL, source_name TEXT NOT NULL, source_type TEXT NOT NULL, text TEXT NOT NULL, char_count INT NOT NULL, page_count INT NOT NULL DEFAULT 0, method TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_notebook_name ON sources (notebook_id, source_name);
CREATE TABLE IF NOT EXISTS chat_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS quizzes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE, user_id TEXT NOT NULL, title TEXT NOT NULL, difficulty TEXT NOT NULL, question_count INT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS quiz_questions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE, question TEXT NOT NULL, options JSONB NOT NULL, correct_index INT NOT NULL, explanation TEXT NOT NULL, position INT NOT NULL);
CREATE TABLE IF NOT EXISTS flashcards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE, user_id TEXT NOT NULL, term TEXT NOT NULL, definition TEXT NOT NULL, category TEXT NOT NULL, difficulty INT NOT NULL, known BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS slideshows (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE, user_id TEXT NOT NULL, title TEXT NOT NULL, subtitle TEXT NOT NULL, slides JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS idx_slideshows_notebook_user ON slideshows (notebook_id, user_id);
CREATE TABLE IF NOT EXISTS brainmaps (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE, user_id TEXT NOT NULL, nodes JSONB NOT NULL, edges JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS idx_brainmaps_notebook_user ON brainmaps (notebook_id, user_id);
CREATE TABLE IF NOT EXISTS reports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE, user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', markdown TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_notebook_user ON reports (notebook_id, user_id);
CREATE TABLE IF NOT EXISTS usage_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, model TEXT NOT NULL, tokens INT NOT NULL, action TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
```

### 6. Run the dev server

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
padh-ai/
├── src/
│   ├── app/
│   │   ├── api/                      # All API routes
│   │   ├── share/[token]/            # Public shared notebook view
│   │   ├── auth/[path]/              # Sign-in page
│   │   ├── account/[path]/           # Settings + security
│   │   ├── landing/                  # Marketing page
│   │   ├── layout.tsx                # Root layout (Inter + Fraunces)
│   │   ├── page.tsx                  # Workspace orchestration
│   │   ├── icon.svg                  # Favicon
│   │   └── globals.css
│   ├── components/                   # All React components
│   └── lib/                          # DB queries, RAG, exports, motion
├── package.json
├── next.config.ts
└── README.md
```

---

## How It Works

### Ingestion

1. User adds a source (PDF, URL, YouTube video, or pasted text)
2. Server extracts text (or runs OCR / web scraping / transcript fetch)
3. Text is split into ~500-token chunks with overlap
4. Each chunk is sent to Upstash Vector — embeddings handled server-side
5. Chunks stored in a namespace unique to that notebook
6. The full text is also saved to Postgres so the Sources panel survives refreshes

### Retrieval

1. User asks a question
2. Question embedded by Upstash
3. Cosine similarity finds the top 5 chunks in that notebook's namespace
4. Chunks injected into the LLM prompt as numbered context blocks
5. Model answers using only those chunks, citing them with [1], [2], etc.
6. Citations returned to the client via a base64-encoded response header

### Citations

- Client renders [N] markers as clickable superscript pills
- Hover shows a preview of the source passage
- Click opens a slide-in drawer with the full chunk text
- "Scroll to source" closes the drawer and highlights the matching card in the Sources panel

### Model Fallback

Each chat request tries 7 candidates in sequence:

1. Groq primary / gpt-oss-120b
2. Groq primary / gpt-oss-20b
3. Groq primary / qwen3.8-27b
4. Groq backup / gpt-oss-120b
5. Groq backup / gpt-oss-20b
6. Groq backup / qwen3.8-27b
7. Mistral / mistral-small-latest

The client retries with the next candidate on failure. When Web Search is on, only candidates that support the browser search tool are tried (Groq 120b and 20b).

### YouTube Transcript Pipeline

Each YouTube URL tries 4 providers:

1. **yTranscript** — primary
2. **Supadata** — backup
3. **youtubetranscriptdownload.com** — third fallback
4. **Apify** — final safety net (runs only if all three REST providers fail)

Total free quota: ~175 transcripts/month across the three fast providers, plus Apify buffer.

---

## Roadmap

### Shipped

- [x] Chat with streaming responses and inline citations
- [x] Citation drawer with hover previews and click-to-scroll
- [x] PDF upload (text + scanned OCR)
- [x] Web article ingestion via Mozilla Readability
- [x] YouTube transcript ingestion (4-provider pipeline)
- [x] Persistent sources across refresh and devices
- [x] Vector search with per-notebook isolation
- [x] Multi-quiz persistence with LLM-generated titles
- [x] Flashcards with results analytics
- [x] Slideshow with 5 designed slide types + present mode
- [x] Brain Map (persistent force-directed concept graph)
- [x] Report generation (persistent)
- [x] Whole-notebook PDF export with toggleable sections
- [x] Quiz / flashcard PDF export with real KaTeX math
- [x] Markdown and Anki-compatible CSV export
- [x] Shareable notebook links
- [x] Auto-generated notebook emojis with regeneration
- [x] Multi-notebook support (up to 15 per user)
- [x] Google sign-in via Neon Auth
- [x] 7-layer model fallback (Groq + Mistral)
- [x] Per-user and org-wide rate limits
- [x] Inter + Fraunces + amber design system
- [x] Motion design (message entry, card stagger, tab fade, modal springs, scroll reveal)
- [x] Mobile-first responsive layout
- [x] Landing page with showcase dev section
- [x] Custom SVG logo + branded loading states

### In Progress

- [ ] Public profiles (/u/username with DiceBear avatars)
- [ ] Discovery feed for shared notebooks
- [ ] Dark mode

### Planned

- [ ] Audio file ingestion (lecture recordings via Groq Whisper)
- [ ] Podcasts (Google TTS, 7/month limit)
- [ ] Collaborative notebooks
- [ ] Custom instructions per notebook
- [ ] Notebook folders

---

## Contributing

Contributions welcome. Open an issue or submit a PR.

---

## License

MIT

---

## Author

Built by [Aditya Choudhary](https://github.com/Aditya-cyber-hind) — 13-year-old developer from India.

Other projects:

- [**HeavenDB**](https://github.com/Aditya-cyber-hind/HeavenDB) — SQL database engine in pure C
- [**Dapine**](https://github.com/Aditya-cyber-hind/dapine) — data pipeline programming language
- [**BookTok**](https://github.com/Aditya-cyber-hind/BookTok) — social platform for readers
- [**GehriSoch**](https://github.com/Aditya-cyber-hind/GehriSoch) — GPT-style transformer from scratch

---

_"PadhAI — because reading shouldn't be passive."_ 📚✨