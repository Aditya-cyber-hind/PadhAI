import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';
import { MotionSection } from '@/components/MotionSection';

export const metadata = {
  title: 'PadhAI — Your AI Study Workspace',
  description:
    'Upload PDFs, articles, YouTube videos, and notes. Chat with citations, generate quizzes, build flashcards, export to PDF, and share notebooks with friends. Built by a student, for students.',
};

const PROJECTS = [
  {
    emoji: '🗄️',
    name: 'HeavenDB',
    desc: 'SQL database engine in pure C',
    url: 'https://github.com/Aditya-cyber-hind/HeavenDB',
  },
  {
    emoji: '🔧',
    name: 'Dapine',
    desc: 'Data pipeline programming language',
    url: 'https://github.com/Aditya-cyber-hind/dapine',
  },
  {
    emoji: '📚',
    name: 'BookTok',
    desc: 'Social platform for readers',
    url: 'https://github.com/Aditya-cyber-hind/BookTok',
  },
  {
    emoji: '🧠',
    name: 'GehriSoch',
    desc: 'GPT-style transformer from scratch',
    url: 'https://github.com/Aditya-cyber-hind/GehriSoch',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <header className="h-16 border-b border-stone-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
        <Logo size={28} />
        <Link
          href="/auth/sign-in"
          className="px-4 py-2 text-sm bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-accent-50 border border-accent-200 text-xs text-accent-800 mb-6">
          Free · Open source · No installation
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-stone-900 leading-[1.1] mb-6">
          Turn any document into a{' '}
          <span className="bg-gradient-to-r from-accent-500 to-accent-700 bg-clip-text text-transparent italic">
            study workspace
          </span>
          .
        </h1>

        <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-10">
          Upload a PDF, drop in a YouTube video, paste a web article, or write
          your own notes. Ask questions. Generate quizzes. Build flashcards.
          Share it with your class. Every answer is grounded in{' '}
          <em>your</em> sources — with real citations you can verify.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/auth/sign-in"
            className="px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition font-medium"
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="#features"
            className="px-6 py-3 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100 transition"
          >
            See what it does
          </Link>
        </div>
      </section>

      {/* Features */}
      <MotionSection id="features" className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 mb-3 leading-tight">
            Everything you need to study smarter
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto">
            Ten features. One workspace. Built from scratch by a 13-year-old
            developer who was tired of re-reading the same chapter five times.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              emoji: '💬',
              title: 'Chat with citations',
              desc: 'Ask anything. Answers come only from your sources — with clickable superscript citations that open the exact passage.',
            },
            {
              emoji: '📝',
              title: 'Quiz generator',
              desc: 'Turn any chapter into a practice quiz. Pick difficulty and length. Your quizzes are saved so you can retake them anytime.',
            },
            {
              emoji: '🃏',
              title: 'Flashcards',
              desc: 'Active recall made easy. Flip cards, track known/unknown, and see analytics on where you struggled.',
            },
            {
              emoji: '🎬',
              title: 'Slideshow',
              desc: 'Turn a document into a presentation-ready deck with five designed slide types — title, section, bullets, statement, and takeaway.',
            },
            {
              emoji: '🧠',
              title: 'Brain Map',
              desc: 'See how concepts connect. A force-directed graph of the key ideas extracted from your source.',
            },
            {
              emoji: '📄',
              title: 'Report writer',
              desc: 'Get a structured report with executive summary, sections, key takeaways, and references.',
            },
            {
              emoji: '📤',
              title: 'Export anywhere',
              desc: 'Whole-notebook PDF with toggleable sections, quiz and flashcard PDFs, plus Markdown and Anki-compatible CSV — all with real math rendering.',
            },
            {
              emoji: '🔗',
              title: 'Share notebooks',
              desc: 'Generate a public link to any notebook. Friends can view your quizzes, flashcards, and slideshow without signing up.',
            },
            {
              emoji: '🌐',
              title: 'Add any source',
              desc: 'PDFs with OCR for scans, web articles, YouTube video transcripts, or pasted text — everything persists across refreshes and devices.',
            },
            {
              emoji: '📚',
              title: 'Multi-notebook',
              desc: 'Keep every subject separate. Up to 15 notebooks per user, each with its own sources, quizzes, and chat history.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white p-6 rounded-xl border border-stone-200 hover:border-accent-300 hover:shadow-sm transition"
            >
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-semibold text-stone-900 mb-1">{f.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </MotionSection>

      {/* How it works */}
      <MotionSection className="bg-white border-t border-b border-stone-200 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 text-center mb-3 leading-tight">
            How it works
          </h2>
          <p className="text-stone-600 text-center mb-12">
            Three steps. No setup. Works in any browser.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Add your sources',
                desc: 'Upload a PDF, paste notes, drop in a YouTube video, or add a web article. We handle text extraction, OCR, and transcription automatically.',
              },
              {
                step: '2',
                title: 'Ask anything',
                desc: 'Get answers grounded in your sources. Every claim cites the exact passage it came from — click a citation to see the full quote.',
              },
              {
                step: '3',
                title: 'Study and share',
                desc: 'Generate quizzes, flashcards, mind maps, and slide decks. Export them for offline review, or share a link with your classmates.',
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent-500 text-white text-lg font-semibold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">{s.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* Developer section — Showcase */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-10">
          {/* Top: photo + name */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 mb-8 sm:mb-10">
            <div className="flex-shrink-0">
              <Image
                src="/aditya.jpg"
                alt="Aditya Choudhary"
                width={140}
                height={140}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border border-stone-200"
                priority
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Built by
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 mb-2 leading-tight">
                Aditya Choudhary
              </h2>
              <p className="text-sm text-stone-600 mb-3">
                13-year-old developer from India
              </p>
              <p className="text-sm text-stone-700 leading-relaxed max-w-lg mx-auto sm:mx-0">
                PadhAI is my fifth project. Earlier work spans systems programming,
                language design, and machine learning.
              </p>
            </div>
          </div>

          {/* Project cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10">
            {PROJECTS.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-stone-50 border border-stone-200 rounded-xl p-4 hover:border-accent-300 hover:bg-accent-50/30 hover:-translate-y-0.5 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl leading-none mt-0.5">{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-stone-900 text-sm mb-0.5 group-hover:text-accent-700 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-stone-600 leading-snug">
                      {p.desc}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-3 justify-center sm:justify-start pt-4 border-t border-stone-100">
            <a
              href="https://github.com/Aditya-cyber-hind"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition"
            >
              GitHub →
            </a>
            <a
              href="https://github.com/Aditya-cyber-hind/PadhAI"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100 transition"
            >
              View PadhAI source
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <MotionSection className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 mb-4 leading-tight">
          Ready to try it?
        </h2>
        <p className="text-stone-600 mb-8">
          Sign in with Google. Upload your first document. Ask your first question.
          It takes less than a minute.
        </p>
        <Link
          href="/auth/sign-in"
          className="inline-block px-8 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition font-medium"
        >
          Get started — it&apos;s free
        </Link>
      </MotionSection>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500">
          <p>🧠 PadhAI — study workspace for the next generation.</p>
          <p>
            Built by{' '}
            <a
              href="https://github.com/Aditya-cyber-hind"
              className="text-stone-700 hover:text-accent-600 underline transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              Aditya Choudhary
            </a>
            {' · '}
            <a
              href="https://github.com/Aditya-cyber-hind/PadhAI"
              className="text-stone-700 hover:text-accent-600 underline transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}