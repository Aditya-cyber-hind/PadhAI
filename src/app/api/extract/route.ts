import { extractText, getDocumentProxy } from 'unpdf';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.type === 'text/plain'
    ) {
      return Response.json({
        text: buffer.toString('utf-8'),
        pages: 1,
        filename: file.name,
      });
    }

    if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { totalPages, text } = await extractText(pdf, { mergePages: true });

      return Response.json({
        text,
        pages: totalPages,
        filename: file.name,
      });
    }

    return Response.json(
      { error: 'Unsupported file type. Use PDF, TXT, or MD.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Extract error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}