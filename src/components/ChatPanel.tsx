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

interface Props {
  sources: string;
  notebookId: string;
  sourceNames: string[];
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

export default function ChatPanel({ sources, notebookId, sourceNames }: Props) {
  const [input, setInput] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Thinking...');
  const [initialMessages] = useState<UIMessage[]>(() => loadFromLocal(notebookId));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [dailyLimitHit, setDailyLimitHit] = useState(false);
  const [pendingCandidateIndex, setPendingCandidateIndex] = useState(0);
  const [lastUserText, setLastUserText] = useState('');
  // Track the ID of the user message that was retried, so we can dedupe
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);

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
    }),
    messages: initialMessages,
    onError: (err) => {
      console.error('[chat] error:', err);

      // Try next candidate automatically
      if (pendingCandidateIndex < MAX_CANDIDATE_RETRIES) {
        const nextIndex = pendingCandidateIndex + 1;
        console.log(`[chat] retrying with candidate ${nextIndex}`);

        // Find the last user message and remove it — we'll re-add on retry
        setMessages((prev) => {
          // Remove the last user message (and any partial assistant response)
          const trimmed = [...prev];
          for (let i = trimmed.length - 1; i >= 0; i--) {
            if (trimmed[i].role === 'user') {
              // Mark this message for dedup tracking
              setRetryingMessageId(trimmed[i].id);
              trimmed.splice(i, 1);
              break;
            }
          }
          return trimmed;
        });

        setPendingCandidateIndex(nextIndex);
        setStatusMessage(`Switching to fallback model...`);

        setTimeout(() => {
          if (lastUserText) {
            sendMessage({ text: lastUserText });
          }
        }, 100);
        return;
      }

      // All candidates exhausted
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

  // Reset candidate index when a response succeeds
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
      ? [
          'Searching the web...',
          'Reading results...',
          'This can take up to 5 minutes...',
          'Still working...',
        ]
      : ['Thinking...', 'Reading your sources...', 'Finding relevant chunks...', 'Composing...'];
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

    if (pendingCandidateIndex !== 0) {
      setPendingCandidateIndex(0);
    }
    setRetryingMessageId(null);
    setLastUserText(input);
    sendMessage({ text: input });
    setInput('');
  };

  const handleClear = async () => {
    if (!confirm('Clear this conversation? Messages will be permanently deleted.')) return;
    setMessages([]);
    lastSavedCount.current = 0;
    setRetryingMessageId(null);
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

    // Normalize narrow no-break spaces (KaTeX hates them)
    text = text.replace(/\u202F/g, ' ');

    // Convert \( ... \) inline math → $ ... $
    text = text.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, '$$$1$$');

    // Convert \[ ... \] display math → $$ ... $$
    text = text.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '$$$$$1$$$$');

    // Convert bare [ ... ] on its own line (that contains LaTeX commands) → $$ ... $$
    text = text.replace(
      /^\[\s*([^\]\n]+(?:\\[a-zA-Z]+|\^|_)[^\]\n]*)\s*\]$/gm,
      '$$$$$1$$$$'
    );

    return text;
  };

  // Dedupe: remove consecutive identical user messages (retry artifacts)
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

  return (
    <>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="h-full flex flex-col">
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          {dedupedMessages.length === 0 && (
            <div className="text-center text-stone-400 mt-20">
              <p className="text-4xl mb-3">📖</p>
              <p className="text-sm">Paste sources on the left, then ask a question below.</p>
            </div>
          )}

          {dedupedMessages.map((m, idx) => {
            const text = renderMessageText(m);
            const isLastMessage = idx === dedupedMessages.length - 1;
            const isEmptyAssistant =
              m.role === 'assistant' && !text.trim() && isLastMessage && !isLoading;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-lg max-w-3xl ${
                  m.role === 'user'
                    ? 'bg-blue-50 ml-auto border border-blue-100'
                    : 'bg-white border border-stone-200'
                }`}
              >
                <p className="text-xs font-semibold text-stone-500 mb-2">
                  {m.role === 'user' ? 'You' : 'PadhAI'}
                </p>
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap text-stone-800 leading-relaxed">
                    {text}
                  </p>
                ) : isEmptyAssistant ? (
                  <p className="text-sm text-stone-400 italic">
                    No response received. Try asking again.
                  </p>
                ) : text.trim() ? (
                  <div className="prose prose-stone prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                    >
                      {text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 italic">Composing...</p>
                )}
              </div>
            );
          })}

          {showSkeleton && (
            <div className="p-4 rounded-lg bg-white border border-stone-200 max-w-3xl">
              <p className="text-xs font-semibold text-stone-500 mb-2">PadhAI</p>
              <div className="space-y-2">
                <div className="h-3 bg-stone-100 rounded w-full animate-pulse" />
                <div className="h-3 bg-stone-100 rounded w-5/6 animate-pulse" />
                <div className="h-3 bg-stone-100 rounded w-4/6 animate-pulse" />
              </div>
              <p className="text-stone-400 italic text-xs mt-3">{statusMessage}</p>
            </div>
          )}

          {isLoading && !showSkeleton && (
            <div className="pl-4 text-xs text-stone-400 italic animate-pulse">
              {statusMessage}
            </div>
          )}

          {dailyLimitHit && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 max-w-3xl">
              <p className="text-xs font-semibold text-red-600 mb-1">Daily limit reached</p>
              <p className="text-sm text-red-700">
                You've used your daily token budget. It resets in 24 hours.
              </p>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-stone-200 p-4 bg-white flex-shrink-0"
        >
          <div className="flex items-center justify-between gap-3 mb-3 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => setUseWebSearch((v) => !v)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                useWebSearch
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white border-stone-300 text-stone-600 hover:border-stone-400'
              } disabled:opacity-50`}
            >
              <span className="text-sm">🌐</span>
              <span>Web Search</span>
              <span className={`ml-1 inline-block w-2 h-2 rounded-full ${useWebSearch ? 'bg-blue-600' : 'bg-stone-300'}`} />
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="text-xs text-stone-500 hover:text-red-600 disabled:opacity-40 transition"
              >
                🗑️ Clear chat
              </button>
            )}
          </div>

          {useWebSearch && (
            <div className="max-w-4xl mx-auto mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                ⚠️ <strong>Web Search is on.</strong> Live searches can take 30 seconds
                to 5 minutes depending on the query.
              </p>
            </div>
          )}

          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              className="flex-1 p-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:bg-stone-100"
              value={input}
              placeholder={dailyLimitHit ? 'Daily limit reached' : 'Ask a question...'}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || dailyLimitHit}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || dailyLimitHit}
              className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Ask
            </button>
          </div>
        </form>
      </div>
    </>
  );
}