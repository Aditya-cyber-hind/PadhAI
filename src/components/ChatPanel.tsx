'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  sources: string;
  notebookId: string;
  sourceNames: string[];
}

const CHAT_KEY_PREFIX = 'padh-ai-chat::';

function loadChat(notebookId: string): UIMessage[] {
  if (typeof window === 'undefined' || !notebookId) return [];
  try {
    const raw = localStorage.getItem(CHAT_KEY_PREFIX + notebookId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[chat] load failed:', err);
    return [];
  }
}

function saveChat(notebookId: string, messages: UIMessage[]) {
  if (!notebookId) return;
  try {
    localStorage.setItem(CHAT_KEY_PREFIX + notebookId, JSON.stringify(messages));
  } catch (err) {
    console.error('[chat] save failed:', err);
  }
}

export default function ChatPanel({ sources, notebookId, sourceNames }: Props) {
  const [input, setInput] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Thinking...');
  const [initialMessages] = useState<UIMessage[]>(() => loadChat(notebookId));

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { sources, notebookId, sourceNames, useWebSearch },
    }),
    messages: initialMessages,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length === 0 && initialMessages.length === 0) return;
    saveChat(notebookId, messages);
  }, [messages, notebookId]);

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (!isLoading) {
      setStatusMessage('Thinking...');
      return;
    }

    const stages = useWebSearch
      ? ['Searching the web...', 'Reading results...', 'Synthesizing...', 'Writing...']
      : ['Thinking...', 'Reading your sources...', 'Finding relevant chunks...', 'Composing...'];

    let i = 0;
    setStatusMessage(stages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % stages.length;
      setStatusMessage(stages[i]);
    }, 700);

    return () => clearInterval(interval);
  }, [isLoading, useWebSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  const handleClear = () => {
    if (!confirm('Clear this conversation? Messages will be permanently deleted.')) return;
    setMessages([]);
    try {
      localStorage.removeItem(CHAT_KEY_PREFIX + notebookId);
    } catch (err) {
      console.error('[chat] clear failed:', err);
    }
  };

  const renderMessageText = (m: UIMessage) => {
    if (!m.parts) return '';
    return m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  };

  const lastMessage = messages[messages.length - 1];
  const showSkeleton = isLoading && lastMessage?.role === 'user';

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-stone-400 mt-20">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-sm">
              Paste sources on the left, then ask a question below.
            </p>
          </div>
        )}

        {messages.map((m) => (
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
                {renderMessageText(m)}
              </p>
            ) : (
              <div className="prose prose-stone prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {renderMessageText(m)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}

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
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-stone-200 p-4 bg-white flex-shrink-0"
      >
        <div className="flex items-center justify-between gap-3 mb-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
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
              <span
                className={`ml-1 inline-block w-2 h-2 rounded-full ${
                  useWebSearch ? 'bg-blue-600' : 'bg-stone-300'
                }`}
              />
            </button>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              className="text-xs text-stone-500 hover:text-red-600 disabled:opacity-40 transition"
              title="Clear this conversation"
            >
              🗑️ Clear chat
            </button>
          )}
        </div>

        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            className="flex-1 p-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400"
            value={input}
            placeholder="Ask a question..."
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}