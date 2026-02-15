import { Hono } from 'hono';
import { getDatabase, generateId } from '../lib/database.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const documentsRouter = new Hono();

const UPLOADS_DIR = path.join(os.homedir(), '.yoyo-ai', 'workspace', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

documentsRouter.get('/', (c) => {
  const db = getDatabase();
  const documents = db.prepare('SELECT * FROM documents ORDER BY modified_at DESC').all();

  return c.json({
    documents: documents.map((d: any) => ({
      id: d.id,
      name: d.name,
      source: d.source,
      connectionId: d.connection_id,
      path: d.path,
      size: d.size,
      mimeType: d.mime_type,
      summary: d.summary,
      createdAt: new Date(d.created_at).toISOString(),
      modifiedAt: new Date(d.modified_at).toISOString(),
    })),
  });
});

documentsRouter.get('/:id', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');
  const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;

  if (!document) {
    return c.json({ error: 'Document not found' }, 404);
  }

  return c.json({
    document: {
      id: document.id,
      name: document.name,
      source: document.source,
      connectionId: document.connection_id,
      path: document.path,
      size: document.size,
      mimeType: document.mime_type,
      summary: document.summary,
      createdAt: new Date(document.created_at).toISOString(),
      modifiedAt: new Date(document.modified_at).toISOString(),
    },
  });
});

documentsRouter.post('/upload', async (c) => {
  const db = getDatabase();
  const formData = await c.req.formData();
  const files = formData.getAll('files') as File[];

  const uploadedDocs: any[] = [];
  const now = Date.now();

  for (const file of files) {
    const id = generateId('doc_');
    const filePath = path.join(UPLOADS_DIR, `${id}_${file.name}`);

    // Save file
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    // Insert into database
    db.prepare(`
      INSERT INTO documents (id, name, source, path, size, mime_type, created_at, modified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, file.name, 'upload', filePath, file.size, file.type, now, now);

    uploadedDocs.push({
      id,
      name: file.name,
      source: 'upload',
      size: file.size,
      mimeType: file.type,
      createdAt: new Date(now).toISOString(),
      modifiedAt: new Date(now).toISOString(),
    });
  }

  return c.json({ documents: uploadedDocs }, 201);
});

documentsRouter.post('/:id/summarize', async (c) => {
  return c.json({ error: 'AI summarization is not available. Connect an AI provider to enable this feature.' }, 501);
});

documentsRouter.post('/:id/ask', async (c) => {
  return c.json({ error: 'Document Q&A is not available. Connect an AI provider to enable this feature.' }, 501);
});

documentsRouter.delete('/:id', (c) => {
  const db = getDatabase();
  const id = c.req.param('id');

  // Get document to delete file
  const document = db.prepare('SELECT path FROM documents WHERE id = ?').get(id) as any;

  if (document?.path && fs.existsSync(document.path)) {
    fs.unlinkSync(document.path);
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  return c.json({ success: true });
});
