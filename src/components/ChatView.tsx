import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, RunnerProfile, RunLog, Shoe } from '../types.ts';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  profile: RunnerProfile;
  lastRun: RunLog | null;
  shoes: Shoe[];
}

const QUICK_QUESTIONS = [
  'Czy moje tętno w Strefie 2 jest prawidłowe?',
  'Jak płynnie zwiększyć kadencję do 180 spm?',
  'Co zjeść 2h przed długim wybieganiem?',
  'Kiedy wymienić zużyte buty biegowe?',
  'Jak zapobiegać bólom piszczeli (shin splints)?',
];

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isLoading,
  profile,
  lastRun,
  shoes,
}) => {
  const [input, setInput] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput('');
    await onSendMessage(msg);
  };

  const handleChipClick = async (q: string) => {
    if (isLoading) return;
    await onSendMessage(q);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] px-4 pb-20">
      {/* Context banner */}
      <div className="liquid-glass p-3 mb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧑‍⚕️</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider accent-text">
                Fizjolog & Trener AI na żywo
              </span>
              <h2 className="text-xs font-bold txt-main leading-tight">
                Model Gemini 3 Flash • Pełen kontekst zawodnika
              </h2>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 live-pulse"></span>
        </div>

        <div className="mt-2 text-[10px] txt-muted flex flex-wrap gap-x-3 gap-y-1">
          <span>Waga: <strong className="txt-sub">{profile.weight} kg</strong></span>
          <span>VO2max: <strong className="txt-sub">{profile.vo2max}</strong></span>
          <span>HRmax: <strong className="txt-sub">{profile.hrMax} bpm</strong></span>
          {lastRun && (
            <span>Ostatni bieg: <strong className="txt-sub">{lastRun.distanceKm} km ({lastRun.avgHr} bpm)</strong></span>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-ios`}
            >
              <div className="text-[10px] txt-muted mb-1 px-1">
                {isUser ? profile.name : 'Fizjolog AI'} • {m.timestamp}
              </div>
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'accent-bg text-black font-semibold rounded-br-none shadow-md'
                    : 'liquid-glass txt-main rounded-bl-none border border-white/10'
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs txt-muted p-2 animate-pulse">
            <span className="animate-spin text-sm">⟳</span>
            <span>Fizjolog AI analizuje Twoją fizjologię i pisze odpowiedź...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleChipClick(q)}
            disabled={isLoading}
            className="liquid-pill px-2.5 py-1 text-[10px] font-bold txt-sub whitespace-nowrap hover:accent-text hover:border-[var(--accent)] transition-all shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input row */}
      <form onSubmit={handleSubmit} className="shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Zadaj pytanie fizjologowi biegania..."
          className="flex-1 liquid-pill px-4 py-2.5 txt-main font-medium outline-none text-xs focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          aria-label="Wyślij wiadomość do trenera"
          className="liquid-active px-4 py-2.5 text-xs font-bold shrink-0 disabled:opacity-40 hover:brightness-110"
        >
          Wyślij ›
        </button>
      </form>
    </div>
  );
};
