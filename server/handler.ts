import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { verifyToken } from '@clerk/backend';
import { and, eq, notInArray } from 'drizzle-orm';
import { db, workspaces, shares } from './db.js';

const trustedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
  ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []),
  ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []),
  ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : []),
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
];
import { workspaceSchema } from '../shared/validation.js';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
async function body(req: IncomingMessage) {
  const parsed = (req as IncomingMessage & { body?: unknown }).body;
  if (parsed !== undefined) {
    if (Buffer.byteLength(typeof parsed === 'string' ? parsed : JSON.stringify(parsed)) > 3000000) throw new HttpError(413, 'Workspace exceeds the 3 MB limit. Export a backup and remove old snapshots.');
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  }
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > 3000000) throw new HttpError(413, 'Workspace exceeds the 3 MB limit. Export a backup and remove old snapshots.');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new HttpError(400, 'Invalid JSON'); }
}
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status: number, value: unknown) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname;
    if (path.startsWith('/api/auth/')) throw new HttpError(404, 'Not found');
    if (path === '/api/shared' && req.method === 'GET') {
      const token = url.searchParams.get('token') || '';
      const owner = url.searchParams.get('owner') || '';
      if (!/^[a-f0-9]{64}$/.test(token) || !owner || owner.length > 100) throw new HttpError(404, 'This link is unavailable or has been revoked.');
      // Explicit public capability: the owner's ID alone never grants access; a 256-bit token is also required.
      const [share] = await db.select({ snapshot: shares.snapshot }).from(shares).where(and(eq(shares.userId, owner), eq(shares.tokenHash, hash(token))));
      if (!share) throw new HttpError(404, 'This link is unavailable or has been revoked.');
      return send(200, share.snapshot);
    }
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) throw new HttpError(401, 'Please sign in again.');
    let userId: string;
    try {
      const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      userId = claims.sub;
    } catch {
      throw new HttpError(401, 'Please sign in again.');
    }
    if (req.method !== 'GET') {
      if (!req.headers.origin || !trustedOrigins.includes(req.headers.origin)) throw new HttpError(403, 'Invalid request origin');
      if (req.method !== 'DELETE' && !req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'JSON required');
    }
    if (path === '/api/workspace' && req.method === 'GET') {
      const [row] = await db.select({ sessions: workspaces.sessions, revision: workspaces.revision }).from(workspaces).where(eq(workspaces.userId, userId));
      return send(200, row || { sessions: [], revision: 0 });
    }
    if (path === '/api/workspace' && req.method === 'PUT') {
      const result = workspaceSchema.safeParse(await body(req));
      if (!result.success) throw new HttpError(400, 'Invalid diagram data. Check names, dates, and workspace limits.');
      const { sessions, revision } = result.data;
      await db.transaction(async tx => {
        await tx.insert(workspaces).values({ userId, sessions: [], revision: 0 }).onConflictDoNothing();
        const updated = await tx.update(workspaces).set({ sessions, revision: revision + 1, updatedAt: new Date() }).where(and(eq(workspaces.userId, userId), eq(workspaces.revision, revision))).returning({ revision: workspaces.revision });
        if (!updated.length) throw new HttpError(409, 'Another tab or device changed this workspace. Export your backup before reloading.');
        await tx.delete(shares).where(and(eq(shares.userId, userId), sessions.length ? notInArray(shares.diagramId, sessions.map(s => s.id)) : undefined));
      });
      return send(200, { revision: revision + 1 });
    }
    if (path === '/api/share' && req.method === 'POST') {
      const input = await body(req) as { diagramId?: unknown };
      if (typeof input.diagramId !== 'string') throw new HttpError(400, 'Diagram ID required');
      const token = randomBytes(32).toString('hex');
      await db.transaction(async tx => {
        const [workspace] = await tx.select().from(workspaces).where(eq(workspaces.userId, userId)).for('update');
        const diagram = workspace?.sessions.find(s => s.id === input.diagramId);
        if (!diagram) throw new HttpError(404, 'Save this diagram before sharing.');
        const snapshot = { name: diagram.name, type: diagram.type, bpmnXml: diagram.bpmnXml, excalidrawData: diagram.excalidrawData };
        await tx.insert(shares).values({ userId, diagramId: diagram.id, tokenHash: hash(token), snapshot }).onConflictDoUpdate({ target: [shares.userId, shares.diagramId], set: { tokenHash: hash(token), snapshot, createdAt: new Date() } });
      });
      return send(200, { token, owner: userId });
    }
    if (path === '/api/share' && req.method === 'DELETE') {
      await db.delete(shares).where(and(eq(shares.userId, userId), eq(shares.diagramId, url.searchParams.get('id') || '')));
      return send(200, { ok: true });
    }
    throw new HttpError(404, 'Not found');
  } catch (error) {
    if (error instanceof HttpError) return send(error.status, { error: error.message });
    console.error('API request failed', error instanceof Error ? error.message : 'Unknown error');
    return send(500, { error: 'Unable to complete this request. Please retry.' });
  }
}
