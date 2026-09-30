'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ConfirmModal from './ConfirmModal';

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
  python: '🐍', javascript: '⚡', typescript: '⚡', tsx: '⚡', jsx: '⚡',
  rust: '🦀', go: '🐹', java: '☕', c: '🔧', cpp: '🔧', csharp: '🎯',
  ruby: '💎', php: '🐘', swift: '🦅', kotlin: '🟣',
  html: '🌐', css: '🎨', sql: '🗄️', bash: '🖥️',
  json: '📦', yaml: '📄', markdown: '📝', xml: '📄', plaintext: '📄',
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

function hasOpenCodeFence(text: string): boolean {
  const fences = text.match(/```/g);
  return fences ? fences.length % 2 === 1 : false;
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
      body: JSON.stringify({ notebookId, role, content, channel: 'coder' }),
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

// ─── Icons (inline SVG, no dependency) ────────────────────────
function CodeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function SparkleIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z" />
    </svg>
  );
}

function CopyIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RefreshIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function ArrowDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function XIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ role, userName }: { role: 'user' | 'assistant'; userName?: string }) {
  if (role === 'assistant') {
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-sm flex-shrink-0">
        <span className="text-white text-[11px] font-bold font-display">P</span>
      </div>
    );
  }
  const initial = (userName || 'Y').charAt(0).toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center shadow-sm flex-shrink-0">
      <span className="text-white text-[11px] font-bold">{initial}</span>
    </div>
  );
}

// ─── Skeleton with shimmer ────────────────────────────────────
function ShimmerBar({ w = 'w-full' }: { w?: string }) {
  return (
    <div className={`h-3 rounded-md bg-stone-100 overflow-hidden ${w} relative`}>
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.15) 50%, transparent 100%)',
        }}
      />
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}

// ─── Message action button ────────────────────────────────────
function MsgAction({
  label,
  onClick,
  copied,
}: {
  label: 'Copy' | 'Regenerate' | 'Retry';
  onClick: () => void;
  copied?: boolean;
}) {
  const icon =
    label === 'Copy' ? (
      copied ? <CheckIcon /> : <CopyIcon />
    ) : label === 'Regenerate' ? (
      <RefreshIcon />
    ) : (
      <RefreshIcon />
    );
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-400 hover:text-accent-600 transition-colors px-1.5 py-0.5 rounded hover:bg-stone-50"
      title={label}
    >
      {icon}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

// ─── Main panel ───────────────────────────────────────────────
export default function CoderPanel({ notebookId, sourceNames }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [lastUserText, setLastUserText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    return () => { cancelled = true; };
  }, [notebookId]);

  // Auto-scroll on new messages, but only if near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom || !streaming) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, streaming]);

  // Show "jump to latest" button when user scrolls up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowJumpButton(distanceFromBottom > 200);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const jumpToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const sendMessage = async (text: string, command: CoderCommand = 'generate') => {
    if (!text.trim() || streaming) return;
    if (!notebookId) {
      setError('No notebook open');
      return;
    }
    setError('');
    setLastUserText(text);

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);
    void persistMessage(notebookId, 'user', text);

    try {
      // Send the last 8 prior messages as context so the AI remembers
      // which code we're refactoring / explaining / testing.
      // Exclude the message we're about to send (it's passed separately as `message`).
      const priorHistory = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Try up to 8 candidates (matches server chain length)
      const MAX_CANDIDATE_RETRIES = 8;
      let lastError: Error | null = null;
      let res: Response | null = null;

      for (let attempt = 0; attempt < MAX_CANDIDATE_RETRIES; attempt++) {
        try {
          const r = await fetch('/api/coder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              command,
              notebookId,
              sourceNames,
              history: priorHistory,
              candidateIndex: attempt,
            }),
          });

          if (r.ok) {
            res = r;
            break;
          }

          // Non-OK: check if it's a rate-limit / all-exhausted error
          const data = await r.json().catch(() => ({}));
          const errCode = String(data.error || '');

          if (errCode === 'ALL_MODELS_EXHAUSTED') {
            throw new Error(data.message || 'All models are busy. Try again soon.');
          }
          if (errCode === 'DAILY_LIMIT_REACHED') {
            throw new Error(data.message || 'Daily limit reached. Resets in 24 hours.');
          }

          // Otherwise try the next candidate
          console.warn(`[coder] candidate ${attempt + 1} failed:`, data.error);
          lastError = new Error(data.error || 'Coder request failed');
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Coder request failed');
          // If it's a hard-stop error (rate limit), rethrow immediately
          const msg = lastError.message.toLowerCase();
          if (msg.includes('daily limit') || msg.includes('all models')) {
            throw lastError;
          }
        }
      }

      if (!res) {
        throw lastError || new Error('All models are busy. Try again soon.');
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
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
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
          setError('Reply generated but could not be saved. It will disappear on refresh.');
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.trim();
      if (!text) return;
      setInput('');
      sendMessage(text, 'generate');
    }
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

  const onConfirmClear = async () => {
    setConfirmClear(false);
    setMessages([]);
    try {
      await fetch(`/api/chat/history?notebookId=${notebookId}&channel=coder`, {
        method: 'DELETE',
      });
    } catch {}
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const handleRegenerate = () => {
    if (!lastUserText || streaming) return;
    // Find the last user message and re-send it
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    sendMessage(lastUser.content, 'generate');
  };

  const handleRetry = (assistantMsg: Message) => {
    if (streaming) return;
    // Find the user message immediately before this assistant message
    const idx = messages.findIndex((m) => m.id === assistantMsg.id);
    if (idx <= 0) return;
    const prev = messages[idx - 1];
    if (prev.role !== 'user') return;
    sendMessage(prev.content, 'generate');
  };

  const handleInsertIntoInput = (code: string) => {
    setInput((prev) => (prev ? `${prev}\n\n${code}` : code));
    inputRef.current?.focus();
  };

  const quickActions: Array<{ label: string; prompt: string; icon: React.ReactNode }> = [
    { label: 'Explain', prompt: 'Explain how this code works step-by-step:\n\n', icon: <SparkleIcon /> },
    { label: 'Refactor', prompt: 'Refactor this code for readability and efficiency:\n\n', icon: <RefreshIcon /> },
    { label: 'Tests', prompt: 'Generate unit tests for this code:\n\n', icon: <CodeIcon className="w-3.5 h-3.5" /> },
    { label: 'Comment', prompt: 'Add clear comments to this code:\n\n', icon: <CodeIcon className="w-3.5 h-3.5" /> },
    { label: 'Debug', prompt: 'Help me debug this code:\n\n', icon: <CodeIcon className="w-3.5 h-3.5" /> },
  ];

  const promptSuggestions = [
    { title: 'Sort a list in Python', hint: 'Write a clean function with type hints', icon: '🐍' },
    { title: 'Explain a function', hint: 'Step-by-step walkthrough of any code', icon: '💡' },
    { title: 'TypeScript hook', hint: 'Debounced input with proper types', icon: '⚡' },
    { title: 'Debug a loop', hint: 'Off-by-one errors and boundary cases', icon: '🐞' },
  ];

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return null;
  }, [messages]);

  return (
    <>
      <div className="h-full w-full flex flex-col bg-stone-50/50">
        {/* Header */}
        <header className="sticky top-0 z-10 px-3 sm:px-4 py-3 bg-white/95 backdrop-blur border-b border-stone-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <CodeIcon />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold text-stone-900 leading-tight truncate">
                Coder Mode
              </h1>
              <p className="text-[11px] text-stone-500 truncate">
                Generate, explain, refactor, and test
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={streaming}
              className="text-[11px] text-stone-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 px-2 py-1 rounded-md transition-colors flex-shrink-0"
            >
              Clear
            </button>
          )}
        </header>

        {/* Scroll area */}
        <div className="flex-1 min-h-0 relative">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto px-3 py-4 sm:px-4 sm:py-5"
          >
            <div className="max-w-3xl mx-auto w-full space-y-5">
              {/* Empty state */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-12 h-12 rounded-xl bg-accent-50 border border-stone-200 flex items-center justify-center text-accent-600 mb-4 shadow-sm"
                  >
                    <CodeIcon className="w-6 h-6" />
                  </motion.div>

                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
                    What are we building?
                  </h2>
                  <p className="text-sm text-stone-500 max-w-md mb-6">
                    Ask for code, or paste existing code to explain, refactor, or test.
                  </p>

                  {/* Prompt cards (different from quick-action pills below) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                    {promptSuggestions.map((p, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i }}
                        onClick={() =>
                          sendMessage(
                            p.title === 'Sort a list in Python'
                              ? 'Write a Python function to sort a list'
                              : p.title === 'Explain a function'
                              ? 'Explain: def f(x): return x * 2'
                              : p.title === 'TypeScript hook'
                              ? 'Write TypeScript for a debounced input hook'
                              : 'Debug: my loop runs one too many times',
                            'generate'
                          )
                        }
                        className="group flex items-start gap-3 text-left bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm hover:border-accent-400 hover:bg-accent-50/40 hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-stone-800 group-hover:text-accent-700 truncate">
                            {p.title}
                          </span>
                          <span className="block text-[11px] text-stone-500 leading-snug mt-0.5">
                            {p.hint}
                          </span>
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, idx) => {
                const blocks = parseCodeBlocks(msg.content);
                const prose = extractTextOutsideBlocks(msg.content);
                const isUser = msg.role === 'user';
                const isLastAssistant =
                  msg.id === lastAssistantId && idx === messages.length - 1;
                const isStreamingThis =
                  streaming &&
                  msg.role === 'assistant' &&
                  idx === messages.length - 1;
                const isCopied = copiedId === msg.id;
                const showCursor = isStreamingThis && msg.content.length > 0;
                const isOpenFence = isStreamingThis && hasOpenCodeFence(msg.content);

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <Avatar role={msg.role} />

                    {/* Bubble column */}
                    <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
                      {isUser ? (
                        <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-stone-900 text-white text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                          {msg.content}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Prose with markdown */}
                          {prose && !isOpenFence && (
                            <div className="prose prose-stone prose-sm max-w-none text-stone-700 leading-relaxed prose-pre:bg-stone-900 prose-pre:rounded-lg prose-code:before:content-none prose-code:after:content-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                              >
                                {prose}
                              </ReactMarkdown>
                            </div>
                          )}

                          {/* Code cards */}
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
                              onInsertToInput={handleInsertIntoInput}
                              streaming={streaming}
                            />
                          ))}

                          {/* Streaming skeleton */}
                          {isStreamingThis && !prose && blocks.length === 0 && (
                            <div className="space-y-2 py-1">
                              <ShimmerBar w="w-11/12" />
                              <ShimmerBar w="w-9/12" />
                              <ShimmerBar w="w-7/12" />
                            </div>
                          )}

                          {/* Streaming cursor */}
                          {showCursor && !isOpenFence && prose && (
                            <span className="inline-block w-2 h-4 bg-accent-500 rounded-sm ml-0.5 align-middle animate-pulse" />
                          )}

                          {/* Message actions (hover) */}
                          {!isStreamingThis && msg.content.trim() && (
                            <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                              <MsgAction
                                label="Copy"
                                copied={isCopied}
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                              />
                              {isLastAssistant && (
                                <MsgAction
                                  label="Regenerate"
                                  onClick={handleRegenerate}
                                />
                              )}
                              <MsgAction
                                label="Retry"
                                onClick={() => handleRetry(msg)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Bottom padding so last message isn't glued to input */}
              <div className="h-4" />
            </div>
          </div>

          {/* Jump to latest */}
          <AnimatePresence>
            {showJumpButton && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={jumpToBottom}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors z-10"
                title="Jump to latest"
              >
                <ArrowDownIcon />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Input form */}
        <form
          onSubmit={handleSubmit}
          className="px-3 sm:px-4 py-3 bg-transparent flex-shrink-0"
        >
          <div className="max-w-3xl mx-auto w-full space-y-2">
            {/* Quick-action pills (visually distinct from prompt cards) */}
            <div className="flex flex-wrap items-center gap-1.5 px-1">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                Quick actions
              </span>
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={streaming}
                  onClick={() => {
                    setInput((prev) => (prev ? `${qa.prompt}${prev}` : qa.prompt));
                    inputRef.current?.focus();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] bg-white border border-stone-200 text-stone-600 hover:border-accent-400 hover:bg-accent-50 hover:text-accent-700 disabled:opacity-40 px-2 py-1 rounded-full shadow-sm transition-colors"
                >
                  {qa.icon}
                  <span>{qa.label}</span>
                </button>
              ))}
            </div>

            {/* Floating input */}
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-accent-500/20 focus-within:border-accent-400 transition-all p-1.5 flex items-end gap-1.5">
              <textarea
                ref={inputRef}
                rows={1}
                className="flex-1 min-w-0 px-3 py-2 bg-transparent border-0 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-0 disabled:opacity-50 resize-none leading-relaxed"
                style={{ fontSize: '16px', maxHeight: '160px' }}
                value={input}
                placeholder={
                  streaming
                    ? 'Generating...'
                    : 'Ask for code, or paste code to explain... (Shift+Enter for new line)'
                }
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
              />

              {input.length > 0 && !streaming && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors mb-0.5"
                  title="Clear input"
                >
                  <XIcon />
                </button>
              )}

              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium shadow-sm hover:bg-accent-600 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed disabled:shadow-none transition-all mb-0.5"
              >
                Send
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={confirmClear}
        title="Clear all coder conversations?"
        description="This will permanently delete every coder message in this notebook. This cannot be undone."
        confirmLabel="Clear"
        variant="danger"
        onConfirm={onConfirmClear}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}

// ─── CodeCard ─────────────────────────────────────────────────
function CodeCard({
  block,
  explanation,
  savingKey,
  saved,
  onAction,
  onSave,
  onInsertToInput,
  streaming,
}: {
  block: CodeBlock;
  explanation: string;
  savingKey: string | null;
  saved: boolean;
  onAction: (code: string, command: CoderCommand) => void;
  onSave: (block: CodeBlock, explanation: string) => void;
  onInsertToInput: (code: string) => void;
  streaming: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('padhai:line-numbers');
      if (saved !== null) setShowLineNumbers(saved === 'true');
    } catch {}
  }, []);

  const toggleLineNumbers = () => {
    setShowLineNumbers((prev) => {
      const next = !prev;
      try { localStorage.setItem('padhai:line-numbers', String(next)); } catch {}
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
    <div className="rounded-xl overflow-hidden border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md hover:border-accent-300 hover:shadow-accent-100/50">
      {/* Tab bar */}
      <div className="flex items-stretch bg-stone-100 border-b border-stone-200">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-r border-stone-200 border-t-2 border-t-accent-500 min-w-0">
          <span className="text-xs flex-shrink-0">{emoji}</span>
          <span className="text-[11px] font-mono text-stone-700 truncate">
            {displayName}
          </span>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-[10px] text-stone-400 hover:text-stone-800 flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <PlusIcon className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
          </button>
        </div>

        <button
          onClick={() => onInsertToInput(block.code)}
          className="flex items-center px-2 text-[11px] text-stone-400 hover:text-accent-600 hover:bg-white transition-colors select-none"
          title="Insert into input for follow-up"
        >
          <PlusIcon />
        </button>
        <div className="flex-1" />

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

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[10px] text-stone-500 hover:text-accent-600 px-2 py-1 my-0.5 mx-0.5 rounded hover:bg-white transition flex-shrink-0"
        >
          {copied ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        <button
          onClick={() => onSave(block, explanation)}
          disabled={saved || isSaving}
          className="text-[10px] text-stone-500 hover:text-accent-600 px-2 py-1 my-0.5 mr-1 rounded hover:bg-white transition disabled:text-accent-600 flex-shrink-0"
        >
          {saved ? '✓ Saved' : isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Code area (collapsible) */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
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
                  fontFamily: 'var(--font-mono)',
                }}
                codeTagProps={{
                  style: {
                    fontFamily: 'var(--font-mono)',
                  },
                }}
              >
                {block.code}
              </SyntaxHighlighter>
            </div>

            {/* Status bar */}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons (icon + label pills) */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-stone-50 border-t border-stone-200">
        {(
          [
            ['explain', 'Explain', <SparkleIcon key="e" className="w-3 h-3" />],
            ['refactor', 'Refactor', <RefreshIcon key="r" className="w-3 h-3" />],
            ['tests', 'Add tests', <CodeIcon key="t" className="w-3 h-3" />],
            ['comments', 'Comment', <CodeIcon key="c" className="w-3 h-3" />],
            ['debug', 'Debug', <CodeIcon key="d" className="w-3 h-3" />],
          ] as Array<[CoderCommand, string, React.ReactNode]>
        ).map(([cmd, label, icon]) => (
          <button
            key={cmd}
            onClick={() => onAction(block.code, cmd)}
            disabled={streaming}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border border-stone-200 bg-white text-stone-600 hover:text-accent-700 hover:border-accent-400 hover:bg-accent-50 disabled:opacity-40 transition-colors shadow-sm"
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}