# PadhAI 🧠📚

> An open-source NotebookLM alternative — chat with your documents using Groq's `gpt-oss-120b`.

## What is PadhAI?

PadhAI is a lightweight, self-hostable research assistant. Paste any text into the source panel, ask questions, and get answers grounded **only** in what you provided — with proper Markdown formatting, tables, and citations.

Named after "पढ़ाई" (Hindi for "studies"), PadhAI is built for students, researchers, and anyone who wants a focused AI assistant without vendor lock-in.

## Features

- 📝 **Paste-based sources** — drop any text into the left panel
- 🤖 **Powered by Groq** — uses `openai/gpt-oss-120b` for fast, high-quality responses
- 📊 **Full Markdown rendering** — headings, tables, code blocks, lists
- 🔒 **Grounded answers** — the model only answers from your sources
- ⚡ **Streaming responses** — see answers appear word-by-word
- 🎨 **Clean two-panel UI** — sources on the left, chat on the right
- ☁️ **Deploy-ready** — one-click Vercel deployment

## Stack

- **Framework:** Next.js 16 (App Router)
- **LLM:** Groq (`openai/gpt-oss-120b`) via Vercel AI SDK v5
- **UI:** React + Tailwind CSS + React Markdown
- **Deployment:** Vercel

## Local Setup

1. Clone the repo:
   git clone https://github.com/YOUR_USERNAME/PadhAI.git
   cd PadhAI

2. Install dependencies:
   npm install

3. Create `.env.local` with your Groq API key:
   GROQ_API_KEY=gsk_your_key_here

   Get a free key at https://console.groq.com

4. Run the dev server:
   npm run dev

5. Open http://localhost:3000

## Deploy to Vercel

1. Push your fork to GitHub
2. Import the repo at https://vercel.com/new
3. Add GROQ_API_KEY as an environment variable
4. Deploy

## Roadmap

- [ ] File uploads (PDF, DOCX, TXT)
- [ ] Vector search for large documents
- [ ] Web search via Groq's browser tool
- [ ] Multi-notebook support
- [ ] Podcast/audio summary generation
- [ ] Source citations in responses

## License

MIT

## Author

Built by Aditya Choudhary (https://github.com/Aditya-cyber-hind) — 13-year-old systems programmer from India. Also built HeavenDB (https://github.com/Aditya-cyber-hind/HeavenDB) and Dapine (https://github.com/Aditya-cyber-hind/dapine).