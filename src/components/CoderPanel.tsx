'use client';

import { useEffect, useRef, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  notebookId: string;
  sourceNames: string[];
}

type CoderCommand = 'generate' | 'explain' | 'refactor' | 'tests' | 'comments' | 'debug';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface CodeBlock {
  language: string;
  filename: string | null;
  code: string;
}

const LANG_MAP: Record<string, string> = {
  py: 'python', python: 'python',
  js: 'javascript', javascript: 'javascript',
  ts: 'typescript', typescript: 'typescript',
  tsx: 'tsx', jsx: 'jsx',
  c: 'c', cpp: 'cpp', 'c++': 'cpp',
  cs: 'csharp', csharp: 'csharp',
  java: 'java', go: 'go',
  rust: 'rust', rs: 'rust',
  rb: 'ruby', ruby: 'ruby',
  php: 'php', swift: 'swift',
  kt: 'kotlin', kotlin: 'kotlin',
  sh: 'bash', bash: 'bash',
  sql: 'sql', html: 'html', css: 'css',
  json: 'json', yaml: 'yaml', yml: 'yaml',
  xml: 'xml', md: 'markdown', markdown: 'markdown',
};

const LANG_EMOJI: Record<string, string> = {
  python: '🐍',
  javascript: '⚡',
  typescript: '⚡',
  tsx: '⚡',
  jsx: '⚡',
  rust: '🦀',
  go: '🐹',
  java: '☕',
  c: '🔧',
  cpp: '🔧',
  csharp: '🎯',
  ruby: '💎',
  php: '🐘',
  swift: '🦅',
  kotlin: '🟣',
  html: '🌐',
  css: '🎨',
  sql: '🗄️',
  bash: '🖥️',
  json: '📦',
  yaml: '📄',
  markdown: '📝',
  xml: '📄',
  plaintext: '📄',
};

function getEmoji(lang: string): string {
  return LANG_EMOJI[lang] || '📄';
}

function parseCodeBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const rawLang = (match[1] || 'plaintext').toLowerCase();
    let code = match[2].trim();
    const language = LANG_MAP[rawLang] || rawLang;

    let filename: string | null = null;
    const filenameMatch =
      code.match(/^\/\/\s*filename:\s*(.+)$/m) ||
      code.match(/^#\s*filename:\s*(.+)$/m);
    if (filenameMatch) {
      filename = filenameMatch[1].trim();
      code = code.replace(filenameMatch[0], '').trim();
    }

    blocks.push({ language, filename, code });
  }

  return blocks;
}

function extractTextOutsideBlocks(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function persistMessage(
  notebookId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<boolean> {
  if (!notebookId || !content.trim()) return false;
  try {
    const res = await fetch('/api/chat/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notebookId,
        role,
        content,
        channel: 'coder',
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error(`[coder] persist ${role} failed:`, res.status, data);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[coder] persist ${role} threw:`, err);
    return false;
  }
}

export default function CoderPanel({ notebookId, sourceNames }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/chat/history?notebookId=${notebookId}&channel=coder`
        );
        if (!res.ok) {
          console.error('[coder] history load failed:', res.status);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            }))
          );
        }
      } catch (err) {
        console.error('[coder] history load threw:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, streaming]);

  const sendMessage = async (text: string, command: CoderCommand = 'generate') => {
    if (!text.trim() || streaming) return;
    if (!notebookId) {
      setError('No notebook open');
      return;
    }
    setError('');

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    void persistMessage(notebookId, 'user', text);

    try {
      const res = await fetch('/api/coder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          command,
          notebookId,
          sourceNames,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Coder request failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        }
      }

      const blocks = parseCodeBlocks(accumulated);
      const textOutside = extractTextOutsideBlocks(accumulated);
      for (const block of blocks) {
        try {
          await fetch('/api/snippets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notebookId,
              language: block.language,
              filename: block.filename,
              code: block.code,
              explanation: textOutside.slice(0, 500) || null,
            }),
          });
        } catch {}
      }

      if (accumulated.trim()) {
        const ok = await persistMessage(notebookId, 'assistant', accumulated);
        if (!ok) {
          setError(
            'Reply generated but could not be saved. It will disappear on refresh.'
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(text, 'generate');
  };

  const handleBlockAction = (code: string, command: CoderCommand) => {
    sendMessage(code, command);
  };

  const handleSaveSnippet = async (block: CodeBlock, explanation: string) => {
    const key = `${block.language}::${block.code.slice(0, 60)}`;
    if (savedKeys.has(key)) return;
    setSavingKey(key);
    try {
      await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookId,
          language: block.language,
          filename: block.filename,
          code: block.code,
          explanation: explanation.slice(0, 500) || null,
        }),
      });
      setSavedKeys((prev) => new Set(prev).add(key));
    } catch {}
    setSavingKey(null);
  };

  const clearChat = async () => {
    if (!confirm('Clear all coder conversations for this notebook?')) return;
    setMessages([]);
    try {
      await fetch(`/api/chat/history?notebookId=${notebookId}&channel=coder`, {
        method: 'DELETE',
      });
    } catch {}
  };

  return (
    <div className="h-full w-full flex flex-col bg-stone-50">
      <header className="px-4 py-3 border-b border-stone-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-base shadow-sm">
            ⌨️
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-stone-900">
              Coder Mode
            </h1>
            <p className="text-[11px] text-stone-500">
              Generate, explain, refactor, test
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-[11px] text-stone-500 hover:text-red-600 transition"
          >
            Clear
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-stone-400 mt-16">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-3xl shadow-sm mb-4">
              ⌨️
            </div>
            <p className="text-sm font-medium text-stone-600 mb-1">
              What are we building?
            </p>
            <p className="text-xs text-stone-500 mb-6">
              Ask for code, or paste code to explain, refactor, or test.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {[
                'Write a Python function to sort a list',
                'Explain: def f(x): return x * 2',
                'Write TypeScript for a debounced input hook',
                'Debug: my loop runs one too many times',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s, 'generate')}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-stone-200 hover:border-accent-400 hover:text-accent-700 hover:bg-accent-50 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const blocks = parseCodeBlocks(msg.content);
          const prose = extractTextOutsideBlocks(msg.content);

          return (
            <div key={msg.id} className="max-w-3xl mx-auto">
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="px-3 py-2 rounded-lg bg-accent-50 border border-accent-200 text-sm text-stone-800 max-w-xl whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {prose && (
                    <div className="bg-white border border-stone-200 rounded-lg p-3 sm:p-4">
                      <p className="text-[10px] font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">
                        PadhAI
                      </p>
                      <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                        {prose}
                      </p>
                    </div>
                  )}
                  {blocks.map((block, i) => (
                    <CodeCard
                      key={i}
                      block={block}
                      explanation={prose}
                      savingKey={savingKey}
                      saved={savedKeys.has(
                        `${block.language}::${block.code.slice(0, 60)}`
                      )}
                      onAction={handleBlockAction}
                      onSave={handleSaveSnippet}
                      streaming={streaming}
                    />
                  ))}
                  {streaming && !prose && blocks.length === 0 && (
                    <div className="bg-white border border-stone-200 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-stone-500 mb-2 uppercase tracking-wide">
                        PadhAI
                      </p>
                      <p className="text-xs text-stone-400 italic animate-pulse">
                        Generating...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {error && (
          <div className="max-w-3xl mx-auto p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-stone-200 p-3 bg-white flex-shrink-0"
      >
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
            style={{ fontSize: '16px' }}
            value={input}
            placeholder={
              streaming ? 'Generating...' : 'Ask for code, or paste code to explain...'
            }
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CodeCard — IDE-style (Direction 3)
//  - Tab bar at top (filename tab + close icon + greyed-out +)
//  - Toggleable line numbers (persisted to localStorage)
//  - Language emoji + status bar with lang / lines / chars
//  - Copy + Save in the tab bar
//  - Amber hover glow on the whole card
// ─────────────────────────────────────────────────────────────
function CodeCard({
  block,
  explanation,
  savingKey,
  saved,
  onAction,
  onSave,
  streaming,
}: {
  block: CodeBlock;
  explanation: string;
  savingKey: string | null;
  saved: boolean;
  onAction: (code: string, command: CoderCommand) => void;
  onSave: (block: CodeBlock, explanation: string) => void;
  streaming: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Load the line-number preference once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('padhai:line-numbers');
      if (saved !== null) setShowLineNumbers(saved === 'true');
    } catch {}
  }, []);

  const toggleLineNumbers = () => {
    setShowLineNumbers((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('padhai:line-numbers', String(next));
      } catch {}
      return next;
    });
  };

  const key = `${block.language}::${block.code.slice(0, 60)}`;
  const isSaving = savingKey === key;

  const lineCount = block.code.split('\n').length;
  const charCount = block.code.length;
  const emoji = getEmoji(block.language);
  const displayName = block.filename || `untitled.${block.language}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="rounded-lg overflow-hidden border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md hover:border-accent-300 hover:shadow-accent-100/50">
      {/* ── Tab bar (VS Code style) ─────────────────────────── */}
      <div className="flex items-stretch bg-stone-100 border-b border-stone-200">
        {/* Active tab */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-r border-stone-200 border-t-2 border-t-accent-500 min-w-0">
          <span className="text-xs flex-shrink-0">{emoji}</span>
          <span className="text-[11px] font-mono text-stone-700 truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-stone-400 hover:text-stone-700 flex-shrink-0 cursor-default">
            ×
          </span>
        </div>

        {/* Greyed-out + (decorative) */}
        <div className="flex items-center px-2 text-[11px] text-stone-300 select-none">
          +
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Toggle line numbers */}
        <button
          onClick={toggleLineNumbers}
          title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
          className={`text-[10px] px-2 py-1 my-0.5 mx-0.5 rounded transition flex-shrink-0 ${
            showLineNumbers
              ? 'text-accent-700 bg-accent-50 border border-accent-200'
              : 'text-stone-400 hover:text-stone-700 hover:bg-white border border-transparent'
          }`}
        >
          #
        </button>

        {/* Copy */}
        <button
          onClick={handleCopy}
          className="text-[10px] text-stone-500 hover:text-accent-600 px-2 py-1 my-0.5 mx-0.5 rounded hover:bg-white transition flex-shrink-0"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>

        {/* Save */}
        <button
          onClick={() => onSave(block, explanation)}
          disabled={saved || isSaving}
          className="text-[10px] text-stone-500 hover:text-accent-600 px-2 py-1 my-0.5 mr-1 rounded hover:bg-white transition disabled:text-accent-600 flex-shrink-0"
        >
          {saved ? '✓ Saved' : isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* ── Code area ───────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={block.language}
          style={oneDark}
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: '#5c6370',
            userSelect: 'none',
            textAlign: 'right',
          }}
          customStyle={{
            margin: 0,
            padding: '12px 16px',
            fontSize: '13px',
            background: '#282c34',
            lineHeight: 1.55,
            overflowX: 'auto',
          }}
          codeTagProps={{
            style: {
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            },
          }}
        >
          {block.code}
        </SyntaxHighlighter>
      </div>

      {/* ── Status bar (VS Code style) ──────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1 bg-stone-800 text-[10px] font-mono text-stone-400 border-t border-stone-700">
        <span className="flex items-center gap-1">
          <span>{emoji}</span>
          <span className="text-stone-300 capitalize">{block.language}</span>
        </span>
        <span className="text-stone-600">·</span>
        <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
        <span className="text-stone-600">·</span>
        <span>{charCount} {charCount === 1 ? 'char' : 'chars'}</span>
      </div>

      {/* ── Action buttons ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-stone-50 border-t border-stone-200">
        {(
          [
            ['explain', '✨ Explain'],
            ['refactor', '♻️ Refactor'],
            ['tests', '🧪 Add tests'],
            ['comments', '📝 Comment'],
            ['debug', '🐞 Debug'],
          ] as Array<[CoderCommand, string]>
        ).map(([cmd, label]) => (
          <button
            key={cmd}
            onClick={() => onAction(block.code, cmd)}
            disabled={streaming}
            className="text-[11px] px-2 py-1 rounded border border-stone-300 bg-white text-stone-600 hover:text-accent-700 hover:border-accent-400 hover:bg-accent-50 disabled:opacity-40 transition"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}