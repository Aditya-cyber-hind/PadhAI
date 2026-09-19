import Link from 'next/link';

export const metadata = {
  title: 'PadhAI — Chat with your documents',
  description:
    'Upload a PDF, ask questions, generate quizzes, build concept maps, and write structured reports. Built for students.',
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <header className="h-16 border-b border-stone-200 bg-white flex items-center justify-between px-6">
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
          Free • No installation • Works in your browser
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 leading-tight mb-6">
          Chat with your documents.
        </h1>

        <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-10">
          Upload a PDF, paste your notes, or drop in a textbook chapter. Ask
          questions. Generate quizzes. Build concept maps. Write reports.
          PadhAI answers from <em>your</em> sources — not random internet text.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/auth/sign-in"
            className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition font-medium"
          >
            Get started — it&apos;s free
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100 transition"
          >
            I already have an account
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              emoji: '💬',
              title: 'Chat with sources',
              desc: 'Ask any question. Answers come only from what you uploaded — with citations.',
            },
            {
              emoji: '📝',
              title: 'Quiz generator',
              desc: 'Turn any chapter into a practice quiz. Pick difficulty and length.',
            },
            {
              emoji: '🧠',
              title: 'Brain Map',
              desc: 'See how concepts connect. A visual map of the key ideas in your source.',
            },
            {
              emoji: '📄',
              title: 'Report writer',
              desc: 'Get a structured report with summary, sections, and key takeaways.',
            },
            {
              emoji: '🌐',
              title: 'Web search',
              desc: 'Toggle on live web search when your sources don&apos;t have the answer.',
            },
            {
              emoji: '📚',
              title: 'Multiple notebooks',
              desc: 'Keep notes for each subject separate. Up to 15 notebooks per user.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white p-6 rounded-xl border border-stone-200 hover:border-stone-300 transition"
            >
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-semibold text-stone-900 mb-1">{f.title}</h3>
              <p className="text-sm text-stone-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-t border-b border-stone-200 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-stone-900 text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Upload or paste',
                desc: 'Any PDF, textbook chapter, article, or your own notes.',
              },
              {
                step: '2',
                title: 'Ask anything',
                desc: 'Get answers grounded in your sources. Ask follow-ups freely.',
              },
              {
                step: '3',
                title: 'Study smarter',
                desc: 'Generate quizzes, maps, and reports with one click each.',
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-900 text-white text-lg font-semibold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">{s.title}</h3>
                <p className="text-sm text-stone-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
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
          <p>🧠 PadhAI — chat with your documents.</p>
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
          </p>
        </div>
      </footer>
    </main>
  );
} 
