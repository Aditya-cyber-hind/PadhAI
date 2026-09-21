import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface Slide {
  heading: string;
  bullets: string[];
  notes: string;
  math?: string;
}

export interface Slideshow {
  id: string;
  notebook_id: string;
  user_id: string;
  title: string;
  subtitle: string;
  slides: Slide[];
  created_at: string;
  updated_at: string;
}

export async function getSlideshow(
  notebookId: string,
  userId: string
): Promise<Slideshow | null> {
  const rows = await sql`
    SELECT id, notebook_id, user_id, title, subtitle, slides, created_at, updated_at
    FROM slideshows
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return (rows[0] as Slideshow) ?? null;
}

export async function replaceSlideshow(
  notebookId: string,
  userId: string,
  title: string,
  subtitle: string,
  slides: Slide[]
): Promise<void> {
  await sql`
    DELETE FROM slideshows
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `;

  await sql`
    INSERT INTO slideshows (notebook_id, user_id, title, subtitle, slides)
    VALUES (${notebookId}, ${userId}, ${title}, ${subtitle}, ${JSON.stringify(slides)}::jsonb)
  `;
}

export async function clearSlideshow(
  notebookId: string,
  userId: string
): Promise<void> {
  await sql`
    DELETE FROM slideshows
    WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `;
} 
