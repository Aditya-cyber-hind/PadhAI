'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import ToastStack, { ToastMessage } from './Toast';
import { sanitizeCitations } from '@/lib/chat/sanitizeCitations';
import { useCitation } from './CitationContext';

interface Props {
  sources: string;
  notebookId: string;
  sourceNames: string[];
}

interface Citation {
  id: number;
  sourceName: string;
  content: string;
}

const CHAT_KEY_PREFIX = 'padh-ai-chat::';
const MAX_CANDIDATE_RETRIES = 8;

function loadFromLocal(notebookId: string): UIMessage[] {
  if (typeof window === 'undefined' || !notebookId) return [];
  try {
    const raw = localStorage.getItem(CHAT_KEY_PREFIX + notebookId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToLocal(notebookId: string, messages: UIMessage[]) {
  if (!notebookId) return;
  try {
    localStorage.setItem(CHAT_KEY_PREFIX + notebookId, JSON.stringify(messages));
  } catch {}
}

function decodeCitationsHeader(b64: string): Citation[] | null {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder('utf-8').decode(bytes);
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.error('[chat] failed to decode citations header:', err);
    return null;
  }
}

function classifyError(err: unknown): { code: string | null; message: string } {
  const raw = String((err as any)?.message ?? err ?? '');
  const codeMatch = raw.match(/"error"\s*:\s*"([A-Z_]+)"/);
  const code = codeMatch ? codeMatch[1] : null;
  const msgMatch = raw.match(/"message"\s*:\s*"([^"]+)"/);
  const message = msgMatch ? msgMatch[1] : raw;
  return { code, message };
}

export default function ChatPanel({ sources, notebookId, sourceNames }: Props) {
  const { showCitation } = useCitation();

  const [input, setInput] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Thinking...');
  const [initialMessages] = useState<UIMessage[]>(() => loadFromLocal(notebookId));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);
  const [pendingCandidateIndex, setPendingCandidateIndex] = useState(0);
  const [lastUserText, setLastUserText] = useState('');
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);

  const pushToast = (type: ToastMessage['type'], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        sources,
        notebookId,
        sourceNames,
        useWebSearch,
        candidateIndex: pendingCandidateIndex,
      },
      fetch: async (url, options) => {
        const res = await fetch(url as string, options as RequestInit);
        const citationsHeader = res.headers.get('X-Citations');
        if (citationsHeader) {
          const parsed = decodeCitationsHeader(citationsHeader);
          if (parsed && parsed.length > 0) {
            setCitations(parsed);
          }
        }
        return res;
      },
    }),
    messages: initialMessages,
    onError: (err) => {
      console.error('[chat] error:', err);
      const { code, message } = classifyError(err);

      if (code === 'DAILY_LIMIT_REACHED' || code === 'ORG_LIMIT_REACHED') {
        setDailyLimitHit(true);
        pushToast('error', message || 'Daily token limit reached.');
        return;
      }
      if (code === 'ALL_MODELS_EXHAUSTED') {
        pushToast('error', message || 'All models are busy. Try again soon.');
        return;
      }

      if (pendingCandidateIndex < MAX_CANDIDATE_RETRIES) {
        const nextIndex = pendingCandidateIndex + 1;
        setMessages((prev) => {
          const trimmed = [...prev];
          for (let i = trimmed.length - 1; i >= 0; i--) {
            if (trimmed[i].role === 'user') {
              setRetryingMessageId(trimmed[i].id);
              trimmed.splice(i, 1);
              break;
            }
          }
          return trimmed;
        });
        setPendingCandidateIndex(nextIndex);
        setStatusMessage('Switching to fallback model...');
        setTimeout(() => {
          if (lastUserText) sendMessage({ text: lastUserText });
        }, 100);
        return;
      }

      pushToast('error', 'All models are busy. Try again in a few minutes.');
      setDailyLimitHit(false);
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSavedCount = useRef(initialMessages.length);

  useEffect(() => {
    if (!notebookId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/chat/history?notebookId=${notebookId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const restored: UIMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            parts: [{ type: 'text', text: m.content }],
          }));
          setMessages(restored);
          lastSavedCount.current = restored.length;
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [notebookId, setMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0 && initialMessages.length === 0) return;
    saveToLocal(notebookId, messages);
    const isStreaming = status === 'streaming' || status === 'submitted';
    if (isStreaming) return;
    const newMessages = messages.slice(lastSavedCount.current);
    if (newMessages.length === 0) return;
    (async () => {
      for (const m of newMessages) {
        const text = m.parts
          ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('') ?? '';
        if (!text) continue;
        try {
          await fetch('/api/chat/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notebookId, role: m.role, content: text }),
          });
        } catch {}
      }
      lastSavedCount.current = messages.length;
    })();
  }, [messages, notebookId, initialMessages.length, status]);

  useEffect(() => {
    if (status === 'ready' && messages.length > 0) {
      const last = messages[messages.length - 1];
      const hasText = last.parts?.some((p: any) => p.type === 'text' && p.text?.trim());
      if (hasText) {
        setPendingCandidateIndex(0);
        setRetryingMessageId(null);
      }
    }
  }, [status, messages]);

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (!isLoading) {
      setStatusMessage('Thinking...');
      return;
    }
    const stages = useWebSearch
      ? ['Searching the web...', 'Reading results...', 'Still working...']
      : ['Thinking...', 'Reading your sources...', 'Composing...'];
    let i = 0;
    setStatusMessage(stages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % stages.length;
      setStatusMessage(stages[i]);
    }, useWebSearch ? 3000 : 700);
    return () => clearInterval(interval);
  }, [isLoading, useWebSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || dailyLimitHit) return;
    if (pendingCandidateIndex !== 0) setPendingCandidateIndex(0);
    setRetryingMessageId(null);
    setLastUserText(input);
    setCitations([]);
    sendMessage({ text: input });
    setInput('');
  };

  const handleClear = async () => {
    if (!confirm('Clear this conversation?')) return;
    setMessages([]);
    lastSavedCount.current = 0;
    setRetryingMessageId(null);
    setCitations([]);
    setDailyLimitHit(false);
    try {
      localStorage.removeItem(CHAT_KEY_PREFIX + notebookId);
      await fetch(`/api/chat/history?notebookId=${notebookId}`, { method: 'DELETE' });
      pushToast('success', 'Conversation cleared');
    } catch {}
  };

  const renderMessageText = (m: UIMessage) => {
    if (!m.parts) return '';
    let text = m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
    text = sanitizeCitations(text);
    text = text.replace(/\u202F/g, ' ');
    text = text.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, '$$$1$$');
    text = text.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '$$$$$1$$$$');
    text = text.replace(
      /^\[\s*([^\]\n]+(?:\\[a-zA-Z]+|\^|_)[^\]\n]*)\s*\]$/gm,
      '$$$$$1$$$$'
    );
    return text;
  };

  const injectCitationMarkers = (text: string): string => {
    if (citations.length === 0) return text;
    const validIds = new Set(citations.map((c) => c.id));
    return text.replace(/\[(\d+)\]/g, (match, numStr) => {
      const id = parseInt(numStr, 10);
      if (validIds.has(id)) {
        return `<cite-ref data-id="${id}">${id}</cite-ref>`;
      }
      return match;
    });
  };

  const dedupedMessages = messages.filter((m, idx) => {
    if (m.role !== 'user') return true;
    const next = messages[idx + 1];
    if (!next || next.role !== 'user') return true;
    const a = renderMessageText(m).trim();
    const b = renderMessageText(next).trim();
    return a !== b;
  });

  const lastMessage = dedupedMessages[dedupedMessages.length - 1];
  const showSkeleton = isLoading && lastMessage?.role === 'user';
  const citationMap = new Map(citations.map((c) => [c.id, c]));

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="h-full w-full min-w-0 flex flex-col">
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 w-full overflow-y-auto px-3 py-3 sm:px-4 sm:py-5 md:p-6 space-y-2.5 sm:space-y-4"
        >
          {dedupedMessages.length === 0 && (
            <div className="text-center text-stone-400 mt-12 sm:mt-20">
              <p className="text-3xl sm:text-4xl mb-2 sm:mb-3">📖</p>
              <p className="text-sm">Paste sources, then ask a question below.</p>
            </div>
          )}

          {dedupedMessages.map((m, idx) => {
            const text = renderMessageText(m);
            const isLastMessage = idx === dedupedMessages.length - 1;
            const isEmptyAssistant =
              m.role === 'assistant' && !text.trim() && isLastMessage && !isLoading;

            const withCitations =
              m.role === 'assistant' ? injectCitationMarkers(text) : text;

            return (
              <div
                key={m.id}
                className={`p-2.5 sm:p-4 rounded-lg max-w-full sm:max-w-4xl ${
                  m.role === 'user'
                    ? 'bg-blue-50 ml-auto border border-blue-100'
                    : 'bg-white border border-stone-200'
                }`}
              >
                <p className="text-[10px] sm:text-xs font-semibold text-stone-500 mb-1 sm:mb-2 uppercase tracking-wide">
                  {m.role === 'user' ? 'You' : 'PadhAI'}
                </p>
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-stone-800 leading-relaxed">
                    {text}
                  </p>
                ) : isEmptyAssistant ? (
                  <p className="text-sm text-stone-400 italic">
                    No response received. Try asking again.
                  </p>
                ) : text.trim() ? (
                  <div className="prose prose-stone prose-sm sm:prose-base max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                      components={{
                        // @ts-ignore custom tag
                        'cite-ref': (props: any) => {
                          const id = parseInt(String(props['data-id']), 10);
                          const citation = citationMap.get(id);
                          if (!citation) return <span>[{id}]</span>;
                          return (
                            <CitationPill
                              id={id}
                              sourceName={citation.sourceName}
                              content={citation.content}
                              onOpen={() =>
                                showCitation({
                                  id,
                                  sourceName: citation.sourceName,
                                  content: citation.content,
                                })
                              }
                            />
                          );
                        },
                      }}
                    >
                      {withCitations}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 italic">Composing...</p>
                )}
              </div>
            );
          })}

          {showSkeleton && (
            <div className="p-2.5 sm:p-4 rounded-lg bg-white border border-stone-200 max-w-full sm:max-w-4xl">
              <p className="text-[10px] sm:text-xs font-semibold text-stone-500 mb-1 sm:mb-2 uppercase tracking-wide">
                PadhAI
              </p>
              <div className="space-y-2">
                <div className="h-3 bg-stone-100 rounded w-full animate-pulse" />
                <div className="h-3 bg-stone-100 rounded w-5/6 animate-pulse" />
                <div className="h-3 bg-stone-100 rounded w-4/6 animate-pulse" />
              </div>
              <p className="text-stone-400 italic text-xs mt-2">{statusMessage}</p>
            </div>
          )}

          {isLoading && !showSkeleton && (
            <div className="pl-2 sm:pl-4 text-xs text-stone-400 italic animate-pulse">
              {statusMessage}
            </div>
          )}

          {dailyLimitHit && (
            <div className="p-2.5 sm:p-4 rounded-lg bg-red-50 border border-red-200 max-w-full sm:max-w-4xl">
              <p className="text-xs font-semibold text-red-600 mb-1">Daily limit reached</p>
              <p className="text-sm text-red-700">Resets in 24 hours.</p>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-stone-200 px-2 py-1.5 sm:px-4 sm:py-3 bg-white flex-shrink-0 w-full"
        >
          {useWebSearch && (
            <div className="max-w-4xl mx-auto mb-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800">
              ⚠️ Web Search on
            </div>
          )}

          <div className="flex items-center gap-1.5 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => setUseWebSearch((v) => !v)}
              disabled={isLoading}
              className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border text-base transition ${
                useWebSearch
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-stone-300 hover:border-stone-400'
              } disabled:opacity-50`}
              title={useWebSearch ? 'Web Search: On' : 'Web Search: Off'}
            >
              🌐
            </button>

            <input
              className="flex-1 min-w-0 px-2.5 py-2 sm:px-3 sm:py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:bg-stone-100"
              style={{ fontSize: '16px' }}
              value={input}
              placeholder={dailyLimitHit ? 'Limit reached' : 'Ask...'}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || dailyLimitHit}
            />

            <button
              type="submit"
              disabled={isLoading || !input.trim() || dailyLimitHit}
              className="flex-shrink-0 px-3 py-2 sm:px-5 sm:py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium text-sm"
            >
              Ask
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-600 hover:bg-stone-100 disabled:opacity-40 transition text-base"
                title="Clear chat"
              >
                🗑️
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}

function CitationPill({
  id,
  sourceName,
  content,
  onOpen,
}: {
  id: number;
  sourceName: string;
  content: string;
  onOpen: () => void;
}) {
  const [showPopover, setShowPopover] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPopover(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setShowPopover(false), 150);
  };

  const handleClick = () => {
    setShowPopover(false);
    onOpen();
  };

  const preview = content.length > 300 ? content.slice(0, 300) + '…' : content;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <sup
        className="inline-flex items-center justify-center min-w-[1.25em] h-[1.25em] px-[0.35em] mx-[0.15em] rounded-full text-[0.7em] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer select-none"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        onFocus={handleEnter}
        onBlur={handleLeave}
        style={{ lineHeight: 1 }}
        role="button"
        aria-label={`View source ${id}`}
      >
        {id}
      </sup>
      {showPopover && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 sm:w-72 p-2.5 sm:p-3 rounded-lg bg-stone-900 text-white text-xs shadow-xl pointer-events-none">
          <span className="block font-semibold mb-1 text-stone-200">
            Source {id} · {sourceName}
          </span>
          <span className="block text-stone-300 leading-relaxed">{preview}</span>
          <span className="block mt-2 text-[0.65rem] text-stone-400 italic">
            Tap to see full passage
          </span>
        </span>
      )}
    </span>
  );
}