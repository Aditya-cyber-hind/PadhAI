'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdrop, modalDialog } from '@/lib/motion';

interface Props {
  open: boolean;
  notebookId: string;
  notebookName: string;
  currentInstructions: string | null;
  onClose: () => void;
  onSaved: (updates: {
    name?: string;
    custom_instructions?: string | null;
  }) => void;
}

const PRESET_CHIPS = [
  { label: 'Simple language', text: 'Use simple, clear language. Avoid jargon.' },
  { label: 'Exam-focused', text: 'Focus on exam-style explanations and key points.' },
  { label: 'Analogies', text: 'Explain using everyday analogies when possible.' },
  { label: 'Short answers', text: 'Keep answers short and to the point.' },
  { label: 'Step-by-step', text: 'Explain step by step with numbered points.' },
  { label: 'Hindi-English mix', text: 'Respond in a Hindi-English mix (Hinglish).' },
];

export default function NotebookSettingsModal({
  open,
  notebookId,
  notebookName,
  currentInstructions,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(notebookName);
  const [instructions, setInstructions] = useState(currentInstructions || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(notebookName);
      setInstructions(currentInstructions || '');
      setError('');
      setSaving(false);
    }
  }, [open, notebookName, currentInstructions]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload: { name?: string; custom_instructions?: string | null } = {};

      if (trimmedName !== notebookName) payload.name = trimmedName;

      const trimmedInstructions = instructions.trim();
      const currentTrimmed = (currentInstructions || '').trim();
      if (trimmedInstructions !== currentTrimmed) {
        payload.custom_instructions = trimmedInstructions || null;
      }

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`/api/notebooks/${notebookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      onSaved({
        name: data.notebook?.name,
        custom_instructions: data.notebook?.custom_instructions,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const appendChip = (text: string) => {
    setInstructions((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return text;
      if (trimmed.includes(text)) return prev;
      return `${trimmed}\n${text}`;
    });
  };

  const charCount = instructions.length;
  const overLimit = charCount > 2000;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalBackdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalDialog}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white rounded-2xl border border-stone-200 w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-stone-100 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-stone-900">
                    Notebook settings
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Customize how PadhAI works in this notebook
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                  title="Close"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-2">
                  Notebook name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Custom instructions */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Custom instructions
                </label>
                <p className="text-[11px] text-stone-500 mb-2 leading-snug">
                  These apply to every AI feature in this notebook — Chat, Coder,
                  Quiz, and Flashcards.
                </p>

                {/* Preset chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => appendChip(chip.text)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-stone-200 bg-white text-stone-600 hover:border-accent-400 hover:bg-accent-50 hover:text-accent-700 transition-colors"
                    >
                      + {chip.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={5}
                  placeholder={`e.g. Answer in simple language.\nFocus on exam-style explanations.\nUse analogies from daily life.`}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 resize-none leading-relaxed"
                  style={{ fontSize: '16px', maxHeight: '240px' }}
                />

                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-stone-400 italic">
                    Leave blank to reset
                  </p>
                  <p
                    className={`text-[10px] ${
                      overLimit ? 'text-red-600 font-medium' : 'text-stone-400'
                    }`}
                  >
                    {charCount} / 2000
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm font-medium hover:bg-stone-100 hover:border-stone-300 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || overLimit}
                className="px-4 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium shadow-sm hover:bg-accent-600 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}