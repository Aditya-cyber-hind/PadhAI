'use client';

import { useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';

export interface UploadedFile {
  id: string;
  name: string;
  pages: number;
  chars: number;
  text?: string;      // optional — may be stripped before localStorage save
  status: 'success' | 'error';
  method?: 'text' | 'ocr';
}

interface Props {
  pastedText: string;
  setPastedText: (value: string) => void;
  files: UploadedFile[];
  setFiles: (value: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  userId: string;
}

async function splitPdf(file: File, maxPagesPerChunk: number): Promise<Uint8Array[]> {
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const chunks: Uint8Array[] = [];
  for (let start = 0; start < totalPages; start += maxPagesPerChunk) {
    const end = Math.min(start + maxPagesPerChunk, totalPages);
    const chunkDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
    const pages = await chunkDoc.copyPages(srcDoc, pageIndices);
    pages.forEach((p) => chunkDoc.addPage(p));
    chunks.push(await chunkDoc.save());
  }
  return chunks;
}

async function ingestInBackground(text: string, sourceName: string, userId: string) {
  try {
    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceName, userId }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`[ingest bg] ${sourceName}: ${data.chunks} chunks stored`);
    } else {
      console.error(`[ingest bg] ${sourceName}: ${data.error}`);
    }
  } catch (err) {
    console.error('[ingest bg] failed:', err);
  }
}

export default function SourcePanel({
  pastedText,
  setPastedText,
  files,
  setFiles,
  userId,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const wordCount = pastedText.trim().split(/\s+/).filter(Boolean).length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUploading(true);
    setStatus('');

    try {
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        if (text.trim().length < 50) throw new Error('File is empty or too short');
        setFiles((prev) => [...prev, {
          id: fileId, name: file.name, pages: 1, chars: text.length,
          text, status: 'success', method: 'text',
        }]);
        ingestInBackground(text, file.name, userId);
        return;
      }

      if (!file.name.endsWith('.pdf')) {
        throw new Error('Only PDF, TXT, or MD files are supported');
      }

      setStatus('Extracting text...');
      const formData = new FormData();
      formData.append('file', file);
      const extractRes = await fetch('/api/extract', { method: 'POST', body: formData });
      const extractData = await extractRes.json();

      if (extractRes.ok && extractData.text && extractData.text.trim().length >= 50) {
        setFiles((prev) => [...prev, {
          id: fileId, name: file.name, pages: extractData.pages || 1,
          chars: extractData.text.length, text: extractData.text,
          status: 'success', method: 'text',
        }]);
        ingestInBackground(extractData.text, file.name, userId);
        return;
      }

      setStatus('Scanned PDF detected. Splitting + OCR...');
      const chunks = await splitPdf(file, 3);
      let combinedText = '';
      let totalPages = 0;

      for (let i = 0; i < chunks.length; i++) {
        setStatus(`Running OCR on chunk ${i + 1} of ${chunks.length}...`);
        const ocrForm = new FormData();
        const blob = new Blob([new Uint8Array(chunks[i])], { type: 'application/pdf' });
        ocrForm.append('file', blob, `chunk_${i + 1}.pdf`);
        const ocrRes = await fetch('/api/ocr', { method: 'POST', body: ocrForm });
        const ocrData = await ocrRes.json();
        if (!ocrRes.ok) throw new Error(ocrData.error || `OCR failed on chunk ${i + 1}`);
        combinedText += `\n\n--- Pages ${i * 3 + 1}–${i * 3 + ocrData.pages} ---\n\n${ocrData.text}`;
        totalPages += ocrData.pages;
      }

      if (combinedText.trim().length < 50) throw new Error('OCR could not extract readable text');

      setFiles((prev) => [...prev, {
        id: fileId, name: file.name, pages: totalPages,
        chars: combinedText.length, text: combinedText,
        status: 'success', method: 'ocr',
      }]);
      ingestInBackground(combinedText, file.name, userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setFiles((prev) => [...prev, {
        id: fileId, name: file.name, pages: 0, chars: 0, text: '',
        status: 'error',
      }]);
      setStatus(`✗ ${msg}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = async (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = async () => {
    setFiles([]);
    setPastedText('');
    setStatus('');
    try {
      await fetch('/api/clear-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      console.log('[clear-session] cleared vector store');
    } catch (err) {
      console.error('[clear-session] failed:', err);
    }
  };

  const hasContent = files.length > 0 || pastedText.length > 0;

  return (
    <aside className="w-1/3 min-w-[320px] border-r border-stone-200 p-6 overflow-y-auto bg-white flex flex-col">
      <h2 className="text-lg font-semibold mb-1 text-stone-800">📚 Sources</h2>
      <p className="text-xs text-stone-500 mb-4">
        Upload a PDF/TXT or paste text. PadhAI answers using only this content.
      </p>

      <div className="mb-3">
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain"
          onChange={handleFileUpload} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="w-full px-4 py-2 border-2 border-dashed border-stone-300 rounded-lg text-sm text-stone-600 hover:border-stone-500 hover:bg-stone-50 disabled:opacity-50 transition">
          {uploading ? '⏳ Processing...' : '📄 Upload PDF or TXT'}
        </button>
        {status && <p className="text-xs text-blue-700 mt-2 break-words">{status}</p>}
      </div>

      {files.length > 0 && (
        <div className="mb-3 space-y-2">
          {files.map((f) => (
            <div key={f.id}
              className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                f.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
              <span className="text-base leading-none mt-0.5">{f.status === 'success' ? '✓' : '✗'}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${f.status === 'success' ? 'text-green-900' : 'text-red-900'}`} title={f.name}>{f.name}</p>
                {f.status === 'success' && (
                  <p className="text-green-700">{f.pages} page{f.pages > 1 ? 's' : ''} · {f.chars.toLocaleString()} chars{f.method === 'ocr' && ' · OCR'}</p>
                )}
                {f.status === 'error' && <p className="text-red-700">Failed to extract</p>}
              </div>
              <button onClick={() => removeFile(f.id)} className="text-stone-400 hover:text-stone-700 text-sm leading-none" title="Remove">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-stone-400 text-center mb-2">— or paste —</div>

      <textarea
        className="flex-1 w-full p-3 border border-stone-300 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-stone-400"
        placeholder="Paste your document, article, notes, or any text here..."
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
      />

      <div className="mt-3 flex justify-between text-xs text-stone-500">
        <span>{pastedText.length.toLocaleString()} chars pasted</span>
        <span>{wordCount.toLocaleString()} words</span>
      </div>

      {hasContent && (
        <button onClick={clearAll} className="mt-3 text-xs text-red-600 hover:text-red-800 self-start">
          Clear all sources
        </button>
      )}
    </aside>
  );
}