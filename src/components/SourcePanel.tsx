'use client';

interface Props {
  sources: string;
  setSources: (value: string) => void;
}

export default function SourcePanel({ sources, setSources }: Props) {
  const wordCount = sources.trim().split(/\s+/).filter(Boolean).length;

  return (
    <aside className="w-1/3 min-w-[320px] border-r border-stone-200 p-6 overflow-y-auto bg-white flex flex-col">
      <h2 className="text-lg font-semibold mb-1 text-stone-800">📚 Sources</h2>
      <p className="text-xs text-stone-500 mb-4">
        Paste text here. PadhAI will answer using only this content.
      </p>

      <textarea
        className="flex-1 w-full p-3 border border-stone-300 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-stone-400"
        placeholder="Paste your document, article, notes, or any text here..."
        value={sources}
        onChange={(e) => setSources(e.target.value)}
      />

      <div className="mt-3 flex justify-between text-xs text-stone-500">
        <span>{sources.length.toLocaleString()} chars</span>
        <span>{wordCount.toLocaleString()} words</span>
      </div>

      {sources.length > 0 && (
        <button
          onClick={() => setSources('')}
          className="mt-3 text-xs text-red-600 hover:text-red-800 self-start"
        >
          Clear sources
        </button>
      )}
    </aside>
  );
} 
