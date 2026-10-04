# PadhAI 🧠📚

> An open-source, AI-powered study workspace — upload your documents, chat with them, generate quizzes and flashcards, build concept maps, export polished reports and slide decks, and share notebooks with your class.

**Live:** [padh-aiaditya.vercel.app](https://padh-aiaditya.vercel.app)
**Source:** [github.com/Aditya-cyber-hind/PadhAI](https://github.com/Aditya-cyber-hind/PadhAI)

---

## What is PadhAI?

PadhAI turns any document into an interactive study workspace. Upload a PDF, drop in a YouTube video, paste a web article, or write your own notes — then ask questions, generate quizzes, build flashcards, write structured reports, and share it all with your class. Every answer is grounded in **your** sources, with real citations you can verify.

Named after "पढ़ाई" (Hindi for "studies"), PadhAI is built for students, teachers, and anyone who wants a focused research tool without vendor lock-in.

---

## Highlights

- **Chat with citations you can verify** — every claim links back to the exact passage
- **Spaced repetition (SM-2)** — flashcards automatically schedule when you should review them
- **Six themes + four reading fonts** — Warm, Cool, Forest, Rose, Sky, Paper; Inter, Fraunces, Nunito, Mono
- **Custom instructions per notebook** — tell PadhAI how you want answers, applied across every AI feature
- **Brain Map** — typed concept graph you can search, filter, focus, and export
- **Polished PDF exports** — real typography, KaTeX math, emoji-safe, no `?` characters
- **7-layer model fallback** — Groq ×2 accounts + Qwen + Mistral for reliability
- **One-click sharing** — public read-only links to any notebook

---

## Features

### Sources — add anything

- **PDF upload** — text-based PDFs extracted instantly
- **Scanned PDF OCR** — image-only PDFs routed through OCR.space
- **Web articles** — paste any URL, extracted via Mozilla Readability
- **YouTube transcripts** — paste a video URL, transcript fetched via a 4-provider fallback pipeline
- **Paste text** — drop in any article, notes, or excerpt
- **AI-suggested sources** — type a topic, PadhAI finds 4-6 candidate URLs; verified results are cached per topic so repeat searches are instant
- **Persistent sources** — saved to Postgres, survive refresh and device switches

### Chat with citations

- **Production RAG** — retrieval-augmented generation over your documents
- **Upstash Vector** — serverless vector DB with automatic embeddings
- **Streaming responses** — answers appear word-by-word
- **Inline citations** — superscript pills on every claim; hover for a preview, click to open a drawer with the full passage, jump to the source card
- **Direct answers** — the system prompt leads with the answer, matches format to the question (prose / numbered steps / tables / causal bullets), and gets honest about gaps
- **Web Search toggle** — pull live results from the internet when needed
- **7-layer model fallback** — Groq 120b / 20b / Qwen across two accounts, plus Mistral as a final fallback

### Flashcard spaced repetition (SM-2)

- **Due-today scheduling** — the header shows exactly how many cards are due right now
- **Four-button rating** — Again / Hard / Good / Easy, each with its own scheduling rule
- **Adaptive intervals** — cards you know well disappear for weeks; ones you struggle with come back tomorrow
- **All caught up screen** — when nothing is due, the panel celebrates and offers extra practice
- **Persistent per-user state** — `ease_factor`, `interval_days`, `repetitions`, `next_review_at` tracked per card
- **Session analytics** — rating breakdown chart after each review session

### Quiz generator (persistent)

- **Multiple choice** — 4 options per question
- **Adjustable difficulty** — Easy, Standard, Hard, Expert
- **Adjustable length** — 3, 5, 8, or 12 questions
- **Saved quizzes** — multiple quizzes per notebook, retake them anytime
- **Auto titles** — LLM names each quiz so you can find it later
- **Instant scoring** — see your score and per-question explanations

### Brain Map (persistent)

- **Typed concepts** — every node classified as concept, formula, process, term, person, or event, with color-coded rendering
- **Sized by importance** — the most central ideas are physically larger
- **Labeled edges** — strong relationships show their relation text on the line ("causes", "uses", "part of")
- **Click to explore** — side panel with a one-sentence summary, source references, and clickable connections
- **Search + filter** — find any concept by name; toggle node types on/off
- **Focus mode** — dim the graph to just one node and its neighbors
- **Export** — download the graph as PNG, or the outline as Markdown
- **Cross-panel actions** — "Explain in Chat" sends the concept to Chat with a pre-filled question; "Add to flashcards" creates a single card from the node

### Slideshow

- **Presentation-ready decks** — turn any document into slides
- **Five designed slide types** — Title, Section, Bullets, Statement, Takeaway
- **Dark theme** — amber and orange accent gradients on a near-black canvas
- **Present mode** — fullscreen with arrow-key navigation, speaker notes toggle, and F for fullscreen

### Report writer (persistent)

- **Structured output** — title, executive summary, sections, key takeaways, references
- **Markdown rendering** — tables, headings, code blocks
- **Math rendering** — KaTeX support for equations and chemical formulas
- **Saved per notebook** — reload without regenerating

### Export

- **Whole-notebook PDF** — cover page, sources list, chat transcript, quizzes, flashcards, and optional slides in one document
- **Toggleable sections** — pick exactly what to include
- **Quiz & flashcard PDFs** — styled cards, correct answers highlighted, real KaTeX math
- **HTML-rendered** — proper typography via Fraunces + Inter, emoji and Hindi safe
- **Markdown export** — portable format for any editor
- **Anki-compatible CSV** — import flashcards directly into Anki

### Custom instructions per notebook

- **Settings modal** — click ⚙️ in the workspace header
- **Preset chips** — Simple language, Exam-focused, Analogies, Short answers, Step-by-step, Hindi-English mix
- **Applies everywhere** — Chat, Coder, Quiz, and Flashcards all respect the instructions
- **Safe by design** — instructions are treated as style preferences, not permission to break core rules
- **Visual indicator** — the header shows a "Custom" badge when a notebook has instructions

### Design system

- **Six themes** — Warm (stone + amber), Cool (slate + blue), Forest (sage + emerald), Rose (blush + rose), Sky (blue-grey + sky), Paper (cream + sepia)
- **Four reading fonts** — Default (Inter), Serif (Fraunces), Rounded (Nunito), Mono (JetBrains Mono), applied only to prose blocks
- **Inter + Fraunces + JetBrains Mono + Nunito** — self-hosted via `next/font`
- **Motion** — message entry, card stagger, tab cross-fade, modal springs, scroll reveals
- **Unified components** — EmptyState, PanelSkeleton, ErrorBoundary, ConfirmModal used consistently across every panel
- **Resizable + collapsible sources panel** — drag the divider, double-click to collapse, width persists
- **Zero-flash theme loading** — an inline script sets `data-theme` before first paint
- **Mobile-first layout** — every surface is tuned for phones

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

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Webpack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Fonts** | Inter + Fraunces + JetBrains Mono + Nunito via `next/font` |
| **Motion** | Motion (formerly Framer Motion) |
| **LLM** | Groq (gpt-oss-120b, gpt-oss-20b, qwen3.8-27b) + Mistral (mistral-small-latest) |
| **Vector Store** | Upstash Vector (built-in embeddings) |
| **Auth** | Neon Auth (Better Auth) |
| **Database** | Neon Postgres |
| **PDF parsing** | unpdf, pdf-lib |
| **PDF generation** | jspdf + html2canvas-pro |
| **OCR** | OCR.space API |
| **YouTube transcripts** | yTranscript + Supadata + youtubetranscriptdownload.com + Apify |
| **Web scraping** | Mozilla Readability + linkedom |
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

### 4. Create `.env.local`

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

In your Neon SQL Editor, run this SQL. It's idempotent — safe to re-run:

```sql
CREATE TABLE IF NOT EXISTS notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  share_token TEXT,
  pasted_text TEXT,
  notebook_type TEXT DEFAULT 'study',
  custom_instructions TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notebooks_share_token
  ON notebooks (share_token) WHERE share_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  text TEXT NOT NULL,
  char_count INT NOT NULL,
  page_count INT NOT NULL DEFAULT 0,
  method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_notebook_name
  ON sources (notebook_id, source_name);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  channel TEXT DEFAULT 'chat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question_count INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  explanation TEXT NOT NULL,
  position INT NOT NULL
);

CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty INT NOT NULL,
  known BOOLEAN DEFAULT FALSE,
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  interval_days INT NOT NULL DEFAULT 0,
  ease_factor FLOAT NOT NULL DEFAULT 2.5,
  repetitions INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flashcards_due
  ON flashcards (notebook_id, user_id, next_review_at);

CREATE TABLE IF NOT EXISTS slideshows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  slides JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_slideshows_notebook_user
  ON slideshows (notebook_id, user_id);

CREATE TABLE IF NOT EXISTS brainmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brainmaps_notebook_user
  ON brainmaps (notebook_id, user_id);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  markdown TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_notebook_user
  ON reports (notebook_id, user_id);

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens INT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggestion_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_normalized TEXT NOT NULL UNIQUE,
  sources JSONB NOT NULL,
  hits INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. Run the dev server

```
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

---

## Project Structure

```
padh-ai/
├── src/
│   ├── app/
│   │   ├── api/                        # All API routes
│   │   ├── share/[token]/              # Public shared notebook view
│   │   ├── auth/[path]/                # Sign-in page
│   │   ├── account/[path]/             # Settings + security
│   │   ├── landing/                    # Marketing page
│   │   ├── layout.tsx                  # Root layout — fonts + theme boot script
│   │   ├── opengraph-image.tsx         # Auto-generated OG image
│   │   ├── page.tsx                    # Workspace orchestration
│   │   └── globals.css                 # Design tokens + themes + reading modes
│   ├── components/
│   │   ├── ui/                         # Low-level primitives
│   │   ├── *Panel.tsx                  # Feature panels (Chat, Coder, Quiz, …)
│   │   ├── ConfirmModal.tsx            # Shared confirm dialog
│   │   ├── EmptyState.tsx              # Shared empty-state wrapper
│   │   ├── PanelSkeleton.tsx           # Shared loading skeleton
│   │   ├── ErrorBoundary.tsx           # Per-panel crash isolation
│   │   ├── PreferencesProvider.tsx     # Theme + reading mode context
│   │   ├── WorkspaceActionsContext.tsx # Cross-panel actions
│   │   └── Toast.tsx                   # Global toast system
│   └── lib/
│       ├── rag/                        # Chunking + retrieval
│       ├── export/                     # Markdown, CSV, LaTeX, PDF
│       ├── pdf/                        # Notebook export renderer
│       ├── flashcards/                 # DB + SM-2 scheduler
│       ├── notebooks/, quizzes/, …     # Per-feature data access
│       └── llm.ts, groq.ts             # Model clients
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
5. Model answers using only those chunks, citing them with `[1]`, `[2]`, etc.
6. Citations returned to the client via a base64-encoded response header

### Citations

- Client renders `[N]` markers as clickable superscript pills
- Hover shows a preview of the source passage
- Click opens a slide-in drawer with the full chunk text
- "Scroll to source" closes the drawer and highlights the matching card in the Sources panel

### SM-2 Spaced Repetition

Each flashcard tracks four state variables: `ease_factor` (default 2.5), `interval_days` (0 for new), `repetitions` (consecutive correct answers), and `next_review_at`.

When the user rates a card:

| Rating | Interval change | Ease change |
|---|---|---|
| **Again** | reset to 1 day | −0.2 |
| **Hard** | ×1.2 (min 1 day) | −0.15 |
| **Good** | ×ease (1 → 1 → 3 → ease×interval) | unchanged |
| **Easy** | ×ease×1.3 | +0.15 |

Ease is clamped to **[1.3, 2.8]**. A card marked `Again` resets `repetitions` to 0.

Over a month of use, well-known cards disappear for weeks or months; hard cards come back tomorrow. This is the same algorithm behind Anki.

### Model Fallback

Each chat / coder request tries candidates in sequence:

**Chat** (7 layers):
1. Groq primary / gpt-oss-120b
2. Groq primary / gpt-oss-20b
3. Groq primary / qwen3.8-27b
4. Groq backup / gpt-oss-120b
5. Groq backup / gpt-oss-20b
6. Groq backup / qwen3.8-27b
7. Mistral / mistral-small-latest

**Coder** (7 layers, same chain — no browser search).

The client retries with the next candidate on failure. When Web Search is on, only candidates that support the browser search tool are tried (Groq 120b and 20b).

### YouTube Transcript Pipeline

Each YouTube URL tries 4 providers:

1. **yTranscript** — primary
2. **Supadata** — backup
3. **youtubetranscriptdownload.com** — third fallback
4. **Apify** — final safety net (runs only if all three REST providers fail)

Total free quota: ~175 transcripts/month across the three fast providers, plus Apify buffer.

### Suggested Sources (cached)

1. User types a topic ("React hooks", "JEE Physics")
2. `/api/suggest-sources` checks a `suggestion_cache` table by normalized topic
3. On cache hit → returns instantly, zero tokens spent
4. On cache miss → LLM (Groq 20b, `reasoning_effort: low`) generates 4-6 candidate sources with title, URL, kind, and a one-line "why this helps"
5. JSON is validated (URL parse, kind whitelist) before returning
6. Result is written to cache so future requests are free

Popular topics warm the cache; effective cost per search approaches zero as usage grows.

### Theming

Tailwind v4 compiles `bg-stone-50` to `background-color: var(--color-stone-50)`. The theme system sets those CSS variables via `[data-theme]` on `<html>`:

```css
@theme {
  --color-stone-50: var(--padhai-stone-50);
}
[data-theme="cool"] {
  --padhai-stone-50: #f8fafc;
}
```

Five themes plus Paper each define their own `--padhai-stone-*` and `--padhai-accent-*` ramps. An inline script in `layout.tsx` reads the saved theme from `localStorage` and applies it before first paint — no flash.

Reading modes work the same way: `[data-reading="serif"]` changes only `.prose` blocks. UI stays Inter.

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
- [x] Flashcards with SM-2 spaced repetition + session analytics
- [x] Slideshow with 5 designed slide types + present mode
- [x] Brain Map with typed nodes, search, filters, focus mode, PNG/MD export
- [x] Cross-panel actions: Explain in Chat + Add to flashcards from Brain Map
- [x] Report generation (persistent)
- [x] Whole-notebook PDF export with toggleable sections
- [x] Quiz / flashcard PDFs with real KaTeX math
- [x] Markdown and Anki-compatible CSV export
- [x] Shareable notebook links
- [x] Auto-generated notebook emojis with regeneration
- [x] Multi-notebook support (up to 15 per user)
- [x] Google sign-in via Neon Auth
- [x] 7-layer model fallback (Groq + Mistral) in Chat and Coder
- [x] Per-user and org-wide rate limits
- [x] Suggest sources from a topic with per-topic cache
- [x] Custom instructions per notebook
- [x] Six themes (Warm / Cool / Forest / Rose / Sky / Paper)
- [x] Four reading fonts (Inter / Fraunces / Nunito / Mono)
- [x] Resizable + collapsible sources panel
- [x] Unified EmptyState, PanelSkeleton, ErrorBoundary, ConfirmModal
- [x] JetBrains Mono for code blocks
- [x] HTML-rendered PDFs with KaTeX math (notebook, quiz, flashcards)
- [x] Motion design across every surface
- [x] Mobile-first responsive layout
- [x] Landing page with dev showcase
- [x] Auto-generated OG image
- [x] Custom SVG logo + branded loading states

### In Progress

- [ ] Public profiles (`/u/username` with DiceBear avatars)
- [ ] Discovery feed for shared notebooks
- [ ] Weak-topic analysis for quizzes + targeted retake

### Planned

- [ ] Audio file ingestion (lecture recordings via Groq Whisper)
- [ ] Podcasts (Google TTS, 7/month limit)
- [ ] Collaborative notebooks
- [ ] Notebook folders
- [ ] Retention decay prediction (FSRS-style)
- [ ] Adaptive quiz difficulty

---

## Contributing

Contributions welcome. Open an issue or submit a PR.

---

## License

MIT

---

## Author

Built by [Aditya Choudhary](https://github.com/Aditya-cyber-hind) — a 13-year-old developer from India.

Other projects:

- [**HeavenDB**](https://github.com/Aditya-cyber-hind/HeavenDB) — SQL database engine in pure C
- [**Dapine**](https://github.com/Aditya-cyber-hind/dapine) — data pipeline programming language

---

_"PadhAI — because reading shouldn't be passive."_ 📚✨