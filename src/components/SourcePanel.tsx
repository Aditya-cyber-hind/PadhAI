'use client';

import { useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { useCitation } from './CitationContext';

export interface UploadedFile {
  id: string;
  name: string;
  pages: number;
  chars: number;
  text?: string;
  status: 'success' | 'error';
  method?: 'text' | 'ocr' | 'web' | 'audio' | 'youtube';
}

interface Props {
  pastedText: string;
  setPastedText: (value: string) => void;
  files: UploadedFile[];
  setFiles: (value: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])) => void;
  notebookId: string;
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

async function ingestInBackground(
  text: string,
  sourceName: string,
  notebookId: string,
  sourceType: string,
  pageCount: number,
  method: string | null
) {
  try {
    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sourceName,
        notebookId,
        sourceType,
        pageCount,
        method,
      }),
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

function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

export default function SourcePanel({
  pastedText,
  setPastedText,
  files,
  setFiles,
  notebookId,
}: Props) {
  const { pendingScrollTarget, consumeScrollTarget } = useCitation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<{ name: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [loadingSources, setLoadingSources] = useState(true);

  // Load saved sources from DB on mount / when notebook changes
  useEffect(() => {
    if (!notebookId) {
      setLoadingSources(false);
      return;
    }
    let cancelled = false;
    setLoadingSources(true);
    (async () => {
      try {
        const res = await fetch(`/api/sources?notebookId=${notebookId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.sources)) {
          setFiles(
            data.sources.map((s: any) => ({
              id: s.id,
              name: s.source_name,
              pages: s.page_count ?? 0,
              chars: s.char_count ?? 0,
              status: 'success' as const,
              method: s.method ?? 'text',
            }))
          );
        }
      } catch (err) {
        console.error('[sources] load failed:', err);
      } finally {
        if (!cancelled) setLoadingSources(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notebookId, setFiles]);

  // Handle scroll-to-source requests from the citation drawer
  useEffect(() => {
    if (!pendingScrollTarget) return;

    const target = pendingScrollTarget;
    consumeScrollTarget();

    const cardEl = fileCardRefs.current.get(target);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPulsingId(target);
      setTimeout(() => setPulsingId(null), 2000);
      return;
    }

    if (pastedText && textareaRef.current) {
      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const ta = textareaRef.current;
      ta.style.transition = 'border-color 0.3s, box-shadow 0.3s';
      ta.style.borderColor = '#10b981';
      ta.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';
      setTimeout(() => {
        ta.style.borderColor = '';
        ta.style.boxShadow = '';
      }, 2000);
    }
  }, [pendingScrollTarget, consumeScrollTarget, pastedText]);

  const isFirstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!notebookId) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await fetch(`/api/notebooks/${notebookId}/pasted-text`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pasted_text: pastedText }),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch (err) {
        console.error('[pasted-text] auto-save failed:', err);
        setSaveStatus('idle');
      }
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [pastedText, notebookId]);

  useEffect(() => {
    isFirstRender.current = true;
  }, [notebookId]);

  const wordCount = pastedText.trim().split(/\s+/).filter(Boolean).length;

  const handlePastedBlur = async () => {
    if (!notebookId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    try {
      await fetch(`/api/notebooks/${notebookId}/pasted-text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasted_text: pastedText }),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[pasted-text] blur save failed:', err);
      setSaveStatus('idle');
    }
  };

  const handleUrlAdd = async () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!notebookId) {
      setStatus('✗ Open a notebook first');
      return;
    }

    // ---- YouTube branch ----
    if (isYoutubeUrl(url)) {
      setUrlLoading(true);
      setStatus('Fetching YouTube transcript...');
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
        const res = await fetch('/api/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        const rawText = await res.text();
        let data: any = {};
        try {
          data = rawText ? JSON.parse(rawText) : {};
        } catch {
          throw new Error(`Server error (${res.status})`);
        }

        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);

        const text = data.text as string;
        const sourceName = (data.sourceName as string) || url;

        if (!text || text.trim().length < 20) {
          throw new Error('Transcript is too short to be useful');
        }

        setFiles((prev) => [
          ...prev,
          {
            id: fileId,
            name: sourceName,
            pages: 0,
            chars: text.length,
            text,
            status: 'success',
            method: 'youtube',
          },
        ]);

        ingestInBackground(text, sourceName, notebookId, 'url', 0, 'youtube');
        setUrlInput('');
        setStatus('✓ YouTube transcript added');
        setTimeout(() => setStatus(''), 3000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Fetch failed';
        setStatus(`✗ ${msg}`);
      } finally {
        setUrlLoading(false);
      }
      return;
    }

    // ---- Regular article URL branch ----
    setUrlLoading(true);
    setStatus('');
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      setStatus('Fetching article...');
      const res = await fetch('/api/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(
          res.ok
            ? 'Server returned an unexpected response'
            : `Server error (${res.status}).`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed (${res.status})`);
      }

      const text = data.text as string;
      const sourceName = (data.sourceName as string) || url;
      if (!text || text.trim().length < 50) {
        throw new Error('Extracted content is too short to be useful');
      }

      setFiles((prev) => [
        ...prev,
        {
          id: fileId,
          name: sourceName,
          pages: 0,
          chars: text.length,
          text,
          status: 'success',
          method: 'web',
        },
      ]);

      ingestInBackground(text, sourceName, notebookId, 'url', 0, 'web');
      setUrlInput('');
      setStatus('✓ Article added');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fetch failed';
      setStatus(`✗ ${msg}`);
    } finally {
      setUrlLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUploading(true);
    setStatus('');
    setPendingFile({ name: file.name });

    try {
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        if (text.trim().length < 50) throw new Error('File is empty or too short');
        setFiles((prev) => [...prev, {
          id: fileId, name: file.name, pages: 1, chars: text.length,
          text, status: 'success', method: 'text',
        }]);
        ingestInBackground(text, file.name, notebookId, 'text', 1, 'text');
        return;
      }

      if (!file.name.endsWith('.pdf')) {
        throw new Error('Only PDF, TXT, or MD files are supported');
      }

      setStatus('Extracting text...');
      const fileSizeMB = file.size / (1024 * 1024);
      let extractData: { text: string; pages: number; filename: string } | null = null;

      if (fileSizeMB > 4) {
        setStatus(`Large PDF (${fileSizeMB.toFixed(1)}MB). Splitting...`);
        const chunks = await splitPdf(file, 3);
        let combinedText = '';
        let totalPages = 0;
        let extractedAny = false;

        for (let i = 0; i < chunks.length; i++) {
          setStatus(`Extracting chunk ${i + 1} of ${chunks.length}...`);
          const chunkBlob = new Blob([new Uint8Array(chunks[i])], { type: 'application/pdf' });
          const formData = new FormData();
          formData.append('file', chunkBlob, `chunk_${i + 1}.pdf`);
          try {
            const res = await fetch('/api/extract', { method: 'POST', body: formData });
            if (res.ok) {
              const chunkData = await res.json();
              if (chunkData.text && chunkData.text.trim().length >= 20) {
                combinedText += `\n\n--- Pages ${i * 3 + 1}–${i * 3 + (chunkData.pages || 3)} ---\n\n${chunkData.text}`;
                totalPages += chunkData.pages || 3;
                extractedAny = true;
              }
            }
          } catch (err) {
            console.warn(`[extract] chunk ${i + 1} failed:`, err);
          }
        }

        if (extractedAny && combinedText.trim().length >= 50) {
          extractData = { text: combinedText, pages: totalPages, filename: file.name };
        }
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const extractRes = await fetch('/api/extract', { method: 'POST', body: formData });
        if (extractRes.ok) {
          extractData = await extractRes.json();
        }
      }

      if (extractData && extractData.text && extractData.text.trim().length >= 50) {
        setFiles((prev) => [...prev, {
          id: fileId, name: file.name, pages: extractData!.pages || 1,
          chars: extractData!.text.length, text: extractData!.text,
          status: 'success', method: 'text',
        }]);
        ingestInBackground(extractData.text, file.name, notebookId, 'pdf',
          extractData.pages || 1, 'text');
        return;
      }

      setStatus('Scanned PDF detected. OCR...');
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
      ingestInBackground(combinedText, file.name, notebookId, 'pdf', totalPages, 'ocr');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setFiles((prev) => [...prev, {
        id: fileId, name: file.name, pages: 0, chars: 0, text: '',
        status: 'error',
      }]);
      setStatus(`✗ ${msg}`);
    } finally {
      setUploading(false);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = async (id: string) => {
    const target = files.find((f) => f.id === id);
    setFiles((prev) => prev.filter((f) => f.id !== id));

    if (target && target.status === 'success') {
      try {
        if (target.id && target.id.length === 36) {
          await fetch(`/api/sources/${target.id}`, { method: 'DELETE' });
        }
        await fetch('/api/clear-source', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notebookId, sourceName: target.name }),
        });
      } catch (err) {
        console.error('[removeFile] failed:', err);
      }
    }
  };

  const clearAll = async () => {
    setFiles([]);
    setPastedText('');
    setStatus('');
    try {
      await fetch('/api/clear-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId }),
      });
      await fetch(`/api/sources?notebookId=${notebookId}`, { method: 'DELETE' });
      await fetch(`/api/notebooks/${notebookId}/pasted-text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasted_text: '' }),
      });
    } catch (err) {
      console.error('[clear-session] failed:', err);
    }
  };

  const hasContent = files.length > 0 || pastedText.length > 0;

  const methodIcon = (m?: string) => {
    if (m === 'web') return '🌐';
    if (m === 'ocr') return '🔍';
    if (m === 'audio') return '🎙️';
    if (m === 'youtube') return '🎥';
    return '📄';
  };

  return (
    <aside className="h-full w-full md:w-1/3 md:min-w-[320px] border-r border-stone-200 p-3 sm:p-4 md:p-6 overflow-y-auto bg-white flex flex-col">
      <h2 className="text-base sm:text-lg font-semibold mb-0.5 sm:mb-1 text-stone-800">📚 Sources</h2>
      <p className="text-[11px] sm:text-xs text-stone-500 mb-3 sm:mb-4 hidden sm:block">
        Add PDFs, articles, YouTube videos, or paste text. PadhAI answers using only this content.
      </p>

      <div className="mb-2 sm:mb-3">
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && urlInput.trim() && !urlLoading) {
                e.preventDefault();
                handleUrlAdd();
              }
            }}
            placeholder="Article or YouTube URL"
            disabled={urlLoading}
            className="flex-1 min-w-0 px-2.5 py-1.5 sm:px-3 sm:py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:bg-stone-100"
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={handleUrlAdd}
            disabled={!urlInput.trim() || urlLoading}
            className="flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
          >
            {urlLoading ? '⏳' : 'Add'}
          </button>
        </div>
      </div>

      <div className="mb-2 sm:mb-3">
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
          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-dashed border-stone-300 rounded-lg text-xs sm:text-sm text-stone-600 hover:border-stone-500 hover:bg-stone-50 disabled:opacity-50 transition"
        >
          {uploading ? '⏳ Processing...' : '📄 Upload file'}
        </button>
        {status && <p className="text-[11px] sm:text-xs text-blue-700 mt-1.5 sm:mt-2 break-words">{status}</p>}
      </div>

      {(files.length > 0 || pendingFile || loadingSources) && (
        <div className="mb-2 sm:mb-3 space-y-1.5 sm:space-y-2">
          {loadingSources && files.length === 0 && (
            <div className="text-[11px] sm:text-xs text-stone-400 italic px-1 sm:px-2">Loading sources...</div>
          )}

          {pendingFile && (
            <div className="flex items-start gap-2 p-1.5 sm:p-2 rounded-lg border text-[11px] sm:text-xs bg-blue-50 border-blue-200 animate-pulse">
              <span className="text-sm sm:text-base leading-none mt-0.5">⏳</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-blue-900" title={pendingFile.name}>
                  {pendingFile.name}
                </p>
                <p className="text-blue-700">Processing...</p>
              </div>
            </div>
          )}

          {files.map((f) => (
            <div
              key={f.id}
              ref={(el) => {
                if (el) fileCardRefs.current.set(f.name, el);
                else fileCardRefs.current.delete(f.name);
              }}
              className={`flex items-start gap-2 p-1.5 sm:p-2 rounded-lg border text-[11px] sm:text-xs transition-all ${
                pulsingId === f.name
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                  : f.status === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <span className="text-sm sm:text-base leading-none mt-0.5">
                {f.status === 'success' ? methodIcon(f.method) : '✗'}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium truncate ${
                    f.status === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}
                  title={f.name}
                >
                  {f.name}
                </p>
                {f.status === 'success' && (
                  <p className="text-green-700">
                    {f.method === 'web'
                      ? 'Article · '
                      : f.method === 'youtube'
                      ? 'YouTube · '
                      : f.pages > 0
                      ? `${f.pages} page${f.pages > 1 ? 's' : ''} · `
                      : ''}
                    {f.chars.toLocaleString()} chars
                    {f.method === 'ocr' && ' · OCR'}
                  </p>
                )}
                {f.status === 'error' && <p className="text-red-700">Failed</p>}
              </div>
              <button
                onClick={() => removeFile(f.id)}
                className="text-stone-400 hover:text-stone-700 text-sm leading-none p-1"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] sm:text-xs text-stone-400 text-center my-1.5 sm:my-2">— or paste —</div>

      <textarea
        ref={textareaRef}
        className="w-full p-2.5 sm:p-3 border border-stone-300 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-stone-400 h-32 sm:h-40 md:flex-1 md:min-h-[120px]"
        placeholder="Paste text here..."
        value={pastedText}
        onChange={(e) => setPastedText(e.target.value)}
        onBlur={handlePastedBlur}
        style={{ fontSize: '16px' }}
      />

      <div className="mt-2 sm:mt-3 flex justify-between text-[11px] sm:text-xs text-stone-500">
        <span>{pastedText.length.toLocaleString()} chars</span>
        <span>{wordCount.toLocaleString()} words</span>
      </div>

      {saveStatus === 'saving' && (
        <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-stone-400 italic">Saving...</p>
      )}
      {saveStatus === 'saved' && (
        <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-green-600">✓ Saved</p>
      )}

      {hasContent && (
        <button
          onClick={clearAll}
          className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-red-600 hover:text-red-800 self-start"
        >
          Clear all sources
        </button>
      )}
    </aside>
  );
}