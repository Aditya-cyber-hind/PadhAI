'use client';

import { useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';

interface Props {
  sources: string;
  setSources: (value: string | ((prev: string) => string)) => void;
}

// Split a PDF into chunks of max N pages, returns array of ArrayBuffers
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

    const bytes = await chunkDoc.save();
    chunks.push(bytes);
  }

  return chunks;
}

export default function SourcePanel({ sources, setSources }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string>('');
  const [error, setError] = useState<string>('');

  const wordCount = sources.trim().split(/\s+/).filter(Boolean).length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setUploadInfo('');

    try {
      // TXT / MD — no splitting needed
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        if (text.trim().length < 50) throw new Error('File is empty or too short');
        setSources((prev) => (prev ? prev + '\n\n' + text : text));
        setUploadInfo(`${file.name} · ${text.length.toLocaleString()} chars`);
        return;
      }

      if (!file.name.endsWith('.pdf')) {
        throw new Error('Only PDF, TXT, or MD files are supported');
      }

      // Try native text extraction first
      setUploadInfo('Extracting text...');
      const formData = new FormData();
      formData.append('file', file);

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });
      const extractData = await extractRes.json();

      if (extractRes.ok && extractData.text && extractData.text.trim().length >= 50) {
        setSources((prev) =>
          prev ? prev + '\n\n' + extractData.text : extractData.text
        );
        setUploadInfo(
          `${extractData.filename} · ${extractData.pages} page${
            extractData.pages > 1 ? 's' : ''
          }`
        );
        return;
      }

      // Fall back to OCR with client-side splitting
      setUploadInfo('Scanned PDF detected. Splitting + OCR...');

      const chunks = await splitPdf(file, 3);

      let combinedText = '';
      let totalPages = 0;

      for (let i = 0; i < chunks.length; i++) {
        setUploadInfo(`Running OCR on chunk ${i + 1} of ${chunks.length}...`);

        const ocrForm = new FormData();
        const blob = new Blob([new Uint8Array(chunks[i])], { type: 'application/pdf' });
        ocrForm.append('file', blob, `chunk_${i + 1}.pdf`);

        const ocrRes = await fetch('/api/ocr', {
          method: 'POST',
          body: ocrForm,
        });
        const ocrData = await ocrRes.json();

        if (!ocrRes.ok) {
          throw new Error(ocrData.error || `OCR failed on chunk ${i + 1}`);
        }

        combinedText += `\n\n--- Pages ${i * 3 + 1}–${i * 3 + ocrData.pages} ---\n\n${ocrData.text}`;
        totalPages += ocrData.pages;
      }

      if (combinedText.trim().length < 50) {
        throw new Error('OCR could not extract readable text from this PDF.');
      }

      setSources((prev) => (prev ? prev + '\n\n' + combinedText : combinedText));
      setUploadInfo(`${file.name} · ${totalPages} pages (OCR)`);
    } catch (err) {
      console.error('[upload] error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <aside className="w-1/3 min-w-[320px] border-r border-stone-200 p-6 overflow-y-auto bg-white flex flex-col">
      <h2 className="text-lg font-semibold mb-1 text-stone-800">📚 Sources</h2>
      <p className="text-xs text-stone-500 mb-4">
        Upload a PDF/TXT or paste text. PadhAI answers using only this content.
      </p>

      <div className="mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full px-4 py-2 border-2 border-dashed border-stone-300 rounded-lg text-sm text-stone-600 hover:border-stone-500 hover:bg-stone-50 disabled:opacity-50 transition"
        >
          {uploading ? '⏳ Processing...' : '📄 Upload PDF or TXT'}
        </button>
        {uploadInfo && <p className="text-xs text-blue-700 mt-2">{uploadInfo}</p>}
        {error && <p className="text-xs text-red-600 mt-2">✗ {error}</p>}
      </div>

      <div className="text-xs text-stone-400 text-center mb-2">— or paste —</div>

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
          onClick={() => {
            setSources('');
            setUploadInfo('');
            setError('');
          }}
          className="mt-3 text-xs text-red-600 hover:text-red-800 self-start"
        >
          Clear sources
        </button>
      )}
    </aside>
  );
}