import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'PadhAI — Your AI Study Workspace',
  description:
    'Upload PDFs, articles, and notes. Chat with citations, generate quizzes, build flashcards, export to PDF, and study smarter. Built by a student, for students.',
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <header className="h-16 border-b border-stone-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
        <span className="text-lg font-semibold text-stone-900">🧠 PadhAI</span>
        <Link
          href="/auth/sign-in"
          className="px-4 py-2 text-sm bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs text-stone-600 mb-6">
          Free · Open source · No installation
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-stone-900 leading-tight mb-6">
          Turn any document into a{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            study workspace
          </span>
          .
        </h1>

        <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-10">
          Upload a PDF, paste your notes, or drop in a textbook chapter. Ask
          questions. Generate quizzes. Build flashcards. Export to PDF. Every
          answer is grounded in <em>your</em> sources — with real citations you can
          verify.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/auth/sign-in"
            className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition font-medium"
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
      <section id="features" className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-stone-900 mb-3">
            Everything you need to study smarter
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto">
            Nine features. One workspace. Built from scratch by a 13-year-old
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
              desc: 'Active recall made easy. Flip cards, track known/unknown, and review only what you struggled with.',
            },
            {
              emoji: '🧠',
              title: 'Brain Map',
              desc: 'See how concepts connect. A force-directed graph of the key ideas extracted from your source.',
            },
            {
              emoji: '🎬',
              title: 'Slideshow',
              desc: 'Turn a document into a presentation-ready slide deck. Perfect for last-minute revision.',
            },
            {
              emoji: '📄',
              title: 'Report writer',
              desc: 'Get a structured report with executive summary, sections, key takeaways, and references.',
            },
            {
              emoji: '📤',
              title: 'Export anywhere',
              desc: 'Download quizzes and flashcards as PDF, Markdown, or Anki-compatible CSV — with real KaTeX math rendering.',
            },
            {
              emoji: '🌐',
              title: 'Add any source',
              desc: 'PDFs with OCR for scans, pasted text, or any web article URL. Everything persists across refreshes and devices.',
            },
            {
              emoji: '📚',
              title: 'Multi-notebook',
              desc: 'Keep every subject separate. Up to 15 notebooks per user, each with its own sources, quizzes, and chat history.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white p-6 rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-sm transition"
            >
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-semibold text-stone-900 mb-1">{f.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-t border-b border-stone-200 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-stone-900 text-center mb-3">
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
                desc: 'Upload a PDF, paste notes, or drop in an article URL. We handle text extraction and OCR automatically.',
              },
              {
                step: '2',
                title: 'Ask anything',
                desc: 'Get answers grounded in your sources. Every claim cites the exact passage it came from.',
              },
              {
                step: '3',
                title: 'Study your way',
                desc: 'Generate quizzes, flashcards, mind maps, and reports. Export them for offline review.',
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-900 text-white text-lg font-semibold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">{s.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer section */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            <div className="flex-shrink-0">
              <Image
                src="/aditya.jpg"
                alt="Aditya Choudhary"
                width={140}
                height={140}
                className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover border border-stone-200"
                priority
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                Built by
              </p>
              <h2 className="text-2xl font-bold text-stone-900 mb-1">
                Aditya Choudhary
              </h2>
              <p className="text-sm text-stone-600 mb-4">
                13-year-old developer from India
              </p>

              <p className="text-sm text-stone-700 leading-relaxed mb-5">
                I&apos;ve built a SQL engine in pure C (HeavenDB), a data pipeline
                language (Dapine), a social platform for readers (BookTok), and a
                GPT-style transformer from scratch (GehriSoch). PadhAI is my fifth
                project — and the one I actually use every day.
              </p>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-5">
                {['HeavenDB', 'Dapine', 'BookTok', 'GehriSoch'].map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs text-stone-600"
                  >
                    {p}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <a
                  href="https://github.com/Aditya-cyber-hind"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition"
                >
                  GitHub →
                </a>
                <a
                  href="https://github.com/Aditya-cyber-hind/PadhAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100 transition"
                >
                  View source
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <h2 className="text-3xl font-bold text-stone-900 mb-4">
          Ready to try it?
        </h2>
        <p className="text-stone-600 mb-8">
          Sign in with Google. Upload your first document. Ask your first question.
          It takes less than a minute.
        </p>
        <Link
          href="/auth/sign-in"
          className="inline-block px-8 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition font-medium"
        >
          Get started — it&apos;s free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500">
          <p>🧠 PadhAI — study workspace for the next generation.</p>
          <p>
            Built by{' '}
            <a
              href="https://github.com/Aditya-cyber-hind"
              className="text-stone-700 hover:text-stone-900 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Aditya Choudhary
            </a>
            {' · '}
            <a
              href="https://github.com/Aditya-cyber-hind/PadhAI"
              className="text-stone-700 hover:text-stone-900 underline"
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