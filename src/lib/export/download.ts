export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(name: string, fallback = 'padhai-export'): string {
  const cleaned = name
    .trim()
    .replace(/[^a-z0-9\-_ ]/gi, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return cleaned || fallback;
}