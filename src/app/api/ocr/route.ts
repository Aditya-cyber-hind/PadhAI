export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const ocrForm = new FormData();
    ocrForm.append('file', new Blob([buffer], { type: 'application/pdf' }), file.name);
    ocrForm.append('language', 'eng');
    ocrForm.append('isOverlayRequired', 'false');
    ocrForm.append('filetype', 'PDF');
    ocrForm.append('scale', 'true');
    ocrForm.append('OCREngine', '3');

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: process.env.OCR_SPACE_API_KEY! },
      body: ocrForm,
    });

    const data = await res.json();

    if (data.IsErroredOnProcessing) {
      return Response.json(
        { error: data.ErrorMessage?.[0] || 'OCR failed' },
        { status: 500 }
      );
    }

    const pages = data.ParsedResults || [];
    const fullText = pages.map((p: any) => p.ParsedText).join('\n\n');

    if (!fullText || fullText.trim().length < 20) {
      return Response.json(
        { error: 'OCR could not read this chunk' },
        { status: 400 }
      );
    }

    return Response.json({
      text: fullText.trim(),
      pages: pages.length,
      filename: file.name,
    });
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'OCR failed' },
      { status: 500 }
    );
  }
}