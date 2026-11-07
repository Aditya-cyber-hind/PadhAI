# 🧠 PadhAI — Your Documents. Your Knowledge. Your AI Study Workspace.

> An open-source, AI-powered study workspace that transforms documents into interactive learning experiences. Chat with your sources, generate quizzes and flashcards, explore concept maps, create reports and presentations, and share notebooks with others.

<p align="center">
  <a href="https://padh-aiaditya.vercel.app"><strong>🚀 Live Demo</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Aditya-cyber-hind/PadhAI"><strong>💻 Source Code</strong></a>
</p>

---

## 📖 What is PadhAI?

PadhAI (पढ़ाई — Hindi for *studies*) is an open-source AI-powered learning and research workspace designed to make studying more interactive, organized, and effective.

Instead of switching between multiple tools, PadhAI brings your entire study workflow into one place.

Upload a PDF, import a YouTube video, paste a web article, or write your own notes. PadhAI transforms that material into an interactive notebook where you can:

- Ask questions and receive source-grounded AI answers.
- Generate quizzes and track your performance across attempts.
- Create flashcards with spaced repetition.
- Visualize relationships between concepts using Brain Maps.
- Generate structured reports and presentation slides.
- Export your study material into portable formats.
- Share notebooks through public, read-only links.

Unlike general-purpose AI chatbots, PadhAI focuses on your learning material. Its retrieval-augmented generation (RAG) system retrieves relevant passages from your sources and provides citations that let you verify answers.

**The goal:** Build a focused learning environment where AI helps you understand information rather than simply generate it.

---

## ✨ Highlights

| Feature | Description |
|---|---|
| 📚 Source-grounded AI | Chat with your documents using verifiable passage-level citations. |
| 🧠 Brain Map | Explore concepts through interactive, typed knowledge graphs. |
| 📊 Interactive Charts | Generate visualizations directly inside AI conversations. |
| 🎯 Weak-topic Analysis | Identify recurring knowledge gaps across quiz attempts. |
| 🔁 Spaced Repetition | Review flashcards using the SM-2 scheduling algorithm. |
| 📁 Notebook Folders | Organize notebooks using first-class folder cards. |
| 📄 Document Intelligence | Process PDFs, scanned documents, websites, and YouTube transcripts. |
| 🎨 Personalization | Six themes, four reading fonts, and notebook-specific instructions. |
| 📑 Report & Slide Generation | Transform study material into structured reports and presentations. |
| 📤 Multi-format Export | Export notebooks, quizzes, flashcards, Markdown, and Anki-compatible CSV files. |
| 🔗 Notebook Sharing | Generate public, read-only links for sharing notebooks. |
| ⚡ Model Resilience | Multi-provider LLM fallback architecture for improved availability. |

---

# 🚀 Features

## 1. 📚 Multiple Source Ingestion

Bring your learning material into one workspace.

- **PDF Upload:** Extract text from standard PDF documents.
- **Scanned PDF OCR:** Process image-based PDFs using OCR.space.
- **Web Articles:** Extract readable content from URLs using Mozilla Readability.
- **YouTube Transcripts:** Retrieve video transcripts through a multi-provider fallback pipeline.
- **Smart Paste:** Automatically convert large pasted text blocks (over 1,000 characters) into editable document cards.
- **AI-Suggested Sources:** Discover 4–6 candidate URLs for a topic, with verified suggestions cached per topic.
- **Persistent Storage:** Sources are stored in PostgreSQL and remain available across sessions and devices.

## 2. 💬 AI Chat with RAG and Citations

A conversational interface grounded in your uploaded learning material.

- **Retrieval-Augmented Generation:** Retrieve relevant passages from notebook sources before generating answers.
- **Upstash Vector:** Serverless vector storage with built-in embedding support.
- **Streaming Responses:** Receive responses incrementally.
- **Inline Citations:** Superscript citation markers link claims to their supporting passages.
- **Citation Drawer:** Hover over citations for previews or open the complete source passage.
- **Interactive Charts:** Generate bar, line, area, pie, donut, and scatter visualizations using Recharts.
- **Direct Answers:** Prompts encourage concise, question-focused answers and transparent handling of missing information.
- **Web Search:** Optionally retrieve live internet information.
- **Custom Instructions:** Configure notebook-specific AI behavior across supported features.
- **Model Fallback:** Multiple Groq model configurations and Gemini provide alternative generation paths.

## 3. 🎯 Cross-Attempt Weak-Topic Analysis

PadhAI doesn't just calculate quiz scores. It helps identify what needs more attention.

- **Study Focus Dashboard:** Aggregate incorrect answers across multiple attempts.
- **Topic-Level Tracking:** Analyze performance separately for each notebook.
- **Signal Filtering:** Surface topics with at least three recorded attempts and accuracy below 70%.
- **Visual Feedback:** Color-coded accuracy indicators highlight areas needing improvement.
- **Focused Retakes:** Generate targeted quizzes for individual weak topics.

## 4. 🗂️ Notebook Folders

Organize study material without cluttering the main workspace.

- **First-Class Folder Cards:** Folders appear alongside notebooks in the main grid.
- **Unified Creation:** Create study notebooks, coding notebooks, or folders from the same creation modal.
- **Move Notebooks:** Transfer notebooks into folders without duplicating data.
- **Scoped Views:** Open folders to view their notebooks, with scoped search and inline renaming.
- **Safe Folder Deletion:** Deleting a folder returns its notebooks to the workspace root instead of deleting them.

## 5. 🔁 Flashcards with SM-2 Spaced Repetition

A persistent flashcard system designed around active recall.

- **Automatic Scheduling:** Determine when cards should next be reviewed.
- **Four Review Ratings:** Again, Hard, Good, and Easy.
- **Adaptive Intervals:** Review intervals change according to performance.
- **Due-Today Tracking:** See how many flashcards need attention.
- **Session Analytics:** Track review activity and progress.
- **Persistent Scheduling:** Store `ease_factor`, `interval_days`, `repetitions`, and `next_review_at` for individual cards.
- **All Caught Up:** Dedicated completion screen when no cards are due.

## 6. 📝 Persistent Quiz Generator

Generate quizzes directly from your notebook sources.

- **Multiple Choice:** Four answer options per question.
- **Adjustable Difficulty:** Easy, Standard, Hard, and Expert.
- **Flexible Length:** Generate between 3 and 12 questions.
- **Topic Tagging:** Associate questions with concepts for performance analysis.
- **Persistent Quizzes:** Save multiple quizzes per notebook.
- **Attempt History:** Store completed attempts and individual answers.
- **Performance Tracking:** Record scores, duration, and correct/incorrect responses.

## 7. 🧠 Brain Map

Turn learning material into an interactive knowledge graph.

- **Typed Nodes:** Classify concepts as concepts, formulas, processes, terms, people, or events.
- **Importance-Based Sizing:** Give central concepts greater visual prominence.
- **Labeled Relationships:** Display relationship descriptions between connected concepts.
- **Interactive Exploration:** Select nodes to inspect summaries, references, and connections.
- **Search and Filtering:** Navigate complex concept maps.
- **Focus Mode:** Concentrate on selected concepts and their relationships.
- **Cross-Panel Actions:** Send concepts directly to Chat for explanations or add them to flashcards.
- **Export:** Save Brain Maps as PNG or Markdown.

## 8. 📊 Slideshow and Report Generation

Transform notebook content into structured learning and presentation material.

**Slideshow Generator**
- Generate presentation-ready decks from notebook sources.
- Five designed slide layouts.
- Dark presentation theme.
- Dedicated presentation mode.

**Report Writer**
- Generate structured reports.
- Include titles, executive summaries, sections, key takeaways, and references.
- Persist generated reports per notebook.
- Render mathematical expressions and chemical formulas using KaTeX.

## 9. 📤 Export System

Your study material shouldn't be locked inside one application.

Supported exports include:

- **Whole-notebook PDF:** Cover page, sources, chat transcript, quizzes, flashcards, and optional slides.
- **Quiz PDF:** Formatted questions and highlighted correct answers.
- **Flashcard PDF:** Printable flashcards with mathematical notation.
- **Markdown:** Portable, editable study notes.
- **Anki-compatible CSV:** Flashcard data ready for import into Anki.

PDF generation includes typography, mathematical rendering, and emoji-compatible output.

## 10. 🎨 Design System

PadhAI combines a customizable interface with a responsive design system.

**Six visual themes:**
- Warm
- Cool
- Forest
- Rose
- Sky
- Paper

**Four reading fonts:**
- Inter
- Fraunces
- Nunito
- JetBrains Mono

**Interface features:**
- Animated message entry and card transitions.
- Modal springs and hover interactions.
- Unified empty states and loading skeletons.
- Error boundaries and confirmation dialogs.
- Resizable and collapsible sources panel.
- Persistent panel width preferences.
- Responsive layouts optimized for mobile and desktop.
- Custom SVG branding and branded loading states.

---

# 🛠️ Tech Stack

PadhAI is built using a modern full-stack architecture.

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Webpack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Fonts | Inter, Fraunces, Nunito, JetBrains Mono |
| Animation | Motion (formerly Framer Motion) |
| LLM Providers | Groq, Google Gemini |
| Models | gpt-oss-120b, gpt-oss-20b, Qwen, Gemini 2.5 Flash |
| Vector Database | Upstash Vector |
| Authentication | Neon Auth (Better Auth) |
| Relational Database | Neon PostgreSQL |
| PDF Parsing | unpdf, pdf-lib |
| PDF Generation | jsPDF, html2canvas-pro |
| OCR | OCR.space API |
| YouTube Transcripts | yTranscript, Supadata, youtubetranscriptdownload.com, Apify |
| Markdown | react-markdown, remark-gfm, remark-math, rehype-katex |
| Charts | Recharts |
| Deployment | Vercel |
| CI | GitHub Actions |

---

# ⚙️ Getting Started

Follow these steps to run PadhAI locally.

## Prerequisites

Make sure you have:

- Node.js (compatible with your Next.js version).
- npm.
- A Neon PostgreSQL database.
- API credentials for the services you intend to use.

## 1. Clone the Repository

```bash
git clone https://github.com/Aditya-cyber-hind/PadhAI.git

cd PadhAI
```

## 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

## 3. Configure API Services

PadhAI integrates with several external services.

| Service | Purpose | Dashboard |
|---|---|---|
| Groq | LLM inference | [console.groq.com](https://console.groq.com) |
| Google Gemini | LLM fallback | [aistudio.google.com](https://aistudio.google.com) |
| Upstash Vector | Vector search | [console.upstash.com](https://console.upstash.com) |
| Neon | PostgreSQL and authentication | [neon.tech](https://neon.tech) |
| OCR.space | Scanned document OCR | [ocr.space](https://ocr.space/ocrapi/freekey) |
| yTranscript | YouTube transcripts | [ytranscript.com](https://ytranscript.com) |
| Supadata | YouTube transcript fallback | [supadata.ai](https://supadata.ai) |
| Apify | Transcript retrieval fallback | [console.apify.com](https://console.apify.com) |

Some integrations may require separate subscriptions or API quotas. Refer to their respective provider documentation.

## 4. Configure Environment Variables

Create a `.env.local` file in the project root.

Copy the variables from `.env.example` and provide the credentials required by your configuration.

```env
# LLM Providers
GROQ_API_KEY=gsk_...
GROQ_API_KEY_2=gsk_...
GEMINI_API_KEY=AIza...

# Database
DATABASE_URL=postgresql://...

# Neon Authentication
NEON_AUTH_BASE_URL=https://...
NEON_AUTH_COOKIE_SECRET=...

# Vector Database
UPSTASH_VECTOR_REST_URL=https://...
UPSTASH_VECTOR_REST_TOKEN=...

# OCR
OCR_SPACE_API_KEY=...

# YouTube Transcript Providers
YTRANSCRIPT_API_KEY=...
SUPADATA_API_KEY=...
YTDL_API_KEY=...
APIFY_TOKEN=...
```

Generate a secure authentication cookie secret using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:** Never commit `.env.local` or expose API keys in client-side code.

Some environment variables may be optional depending on which integrations you enable. Check `.env.example` and the application configuration for the exact requirements.

## 5. Set Up the Database

PadhAI uses Neon PostgreSQL for persistent storage.

The database schema includes:

| Table | Purpose |
|---|---|
| `notebooks` | Notebook metadata and ownership |
| `sources` | Uploaded and imported learning material |
| `folders` | Notebook organization |
| `chat_messages` | Conversation history |
| `quizzes` | Generated quizzes |
| `quiz_questions` | Quiz questions and answers |
| `quiz_attempts` | Completed quiz attempts |
| `quiz_answers` | Individual question responses |
| `flashcards` | Flashcards and SM-2 scheduling |
| `slideshows` | Generated presentations |
| `brainmaps` | Persistent concept maps |
| `reports` | Generated reports |
| `usage_logs` | Model usage tracking |
| `suggestion_cache` | Cached AI-suggested sources |

**Database migration:** Execute the SQL schema provided in the repository's database setup instructions using the Neon SQL Editor.

If you're setting up a fresh database, ensure all required tables, indexes, and foreign-key constraints have been created before starting the application.

## 6. Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3001
```

Your local PadhAI instance should now be running.

---

# 🗺️ Roadmap

## ✅ Shipped

- [x] Streaming AI chat with inline citations.
- [x] Citation previews and interactive citation drawer.
- [x] PDF ingestion and scanned-document OCR.
- [x] Web article extraction using Mozilla Readability.
- [x] YouTube transcript ingestion with provider fallbacks.
- [x] Persistent sources and vector search.
- [x] Multi-quiz persistence and attempt tracking.
- [x] Cross-attempt weak-topic analysis.
- [x] Notebook folders and workspace organization.
- [x] AI-generated charts in conversations.
- [x] Smart Paste and document cards.
- [x] Flashcards with SM-2 spaced repetition.
- [x] Slideshow generation with five slide layouts.
- [x] Brain Maps with typed nodes and relationships.
- [x] Brain Map search, filters, focus mode, and exports.
- [x] Cross-panel concept exploration.
- [x] Persistent report generation.
- [x] Whole-notebook PDF export.
- [x] Quiz and flashcard PDF exports.
- [x] Markdown and Anki-compatible CSV exports.
- [x] Shareable read-only notebook links.
- [x] Google sign-in through Neon Auth.
- [x] Custom instructions per notebook.
- [x] Multi-provider LLM fallback.
- [x] Per-user and organization-wide rate limits.
- [x] AI-suggested sources with caching.
- [x] Six interface themes and four reading fonts.
- [x] Responsive mobile-first interface.
- [x] Resizable and collapsible sources panel.
- [x] Unified component and error-handling system.
- [x] Landing page and developer showcase.
- [x] Custom SVG branding and OG image.
- [x] GitHub Actions CI.
- [x] `.env.example` and MIT License.

## 🚧 In Progress

- [ ] Audio file ingestion using Groq Whisper for lecture recordings.
- [ ] Podcast support and audio generation.

*Both features are being developed for Cosmo Hacks 2026.*

## 🔮 Planned

- [ ] Public user profiles with DiceBear avatars.
- [ ] Discovery feed for shared notebooks.
- [ ] Collaborative notebooks.
- [ ] FSRS-style retention decay prediction.
- [ ] Adaptive quiz difficulty.
- [ ] Drag-and-drop notebook organization.

---

# 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome!

If you have an idea that could improve PadhAI, feel free to open an issue or submit a pull request.

### Before submitting a pull request

Run the following checks:

```bash
# TypeScript validation
npx tsc --noEmit

# Production build
npm run build
```

Both commands should complete successfully before submitting your changes.

GitHub Actions runs the same checks through the project's CI pipeline.

---

# 📄 License

PadhAI is released under the **MIT License**.

See the [LICENSE](LICENSE) file for details.

---

# 👨‍💻 Author

**Aditya Choudhary**

Student developer and creator of PadhAI.

Interested in AI systems, full-stack development, databases, and embedded hardware.

### Other Projects

- **[HeavenDB](https://github.com/Aditya-cyber-hind)** — A SQL database engine written in C.
- **[Dapine](https://github.com/Aditya-cyber-hind/dapine)** — A data pipeline programming language.

---

<p align="center">
  <strong>🧠 PadhAI — Because reading shouldn't be passive.</strong>
  <br/>
  <sub>Made with curiosity, code, and a love for learning. 📚✨</sub>
</p>