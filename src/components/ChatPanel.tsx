'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSessionId } from '@/lib/rag/session';

interface Props {
  sources: string;
}

export default function ChatPanel({ sources }: Props) {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { sources, sessionId: getSessionId() },
    }),
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  const renderMessageText = (m: UIMessage) => {
    if (!m.parts) return '';
    return m.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  };

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

        {isLoading && (
          <div className="p-4 rounded-lg bg-white border border-stone-200 max-w-3xl">
            <p className="text-xs font-semibold text-stone-500 mb-1">PadhAI</p>
            <p className="text-stone-400 italic">Thinking...</p>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-stone-200 p-4 bg-white flex-shrink-0"
      >
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