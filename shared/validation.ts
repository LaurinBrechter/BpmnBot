import { z } from 'zod';

const date = z.string().datetime();
const id = z.string().min(1).max(100);
const drawing = z.object({ elements: z.array(z.record(z.string(), z.unknown())).max(10000), appState: z.record(z.string(), z.unknown()), files: z.record(z.string(), z.unknown()) });
export const diagramSchema = z.object({
  id, type: z.enum(['bpmn', 'excalidraw']), name: z.string().min(1).max(300),
  bpmnXml: z.string().max(2000000), excalidrawData: drawing.optional(),
  messages: z.array(z.object({ id, role: z.enum(['user', 'assistant']), content: z.string().max(200000), timestamp: date })).max(10000),
  versions: z.array(z.object({ id, bpmnXml: z.string().max(2000000).optional(), excalidrawData: drawing.optional(), timestamp: date, label: z.string().max(300).optional() })).max(1000),
  createdAt: date, updatedAt: date,
});
export const workspaceSchema = z.object({ revision: z.number().int().nonnegative(), sessions: z.array(diagramSchema).max(200) }).refine(v => new Set(v.sessions.map(s => s.id)).size === v.sessions.length);
export type StoredDiagram = z.infer<typeof diagramSchema>;
export type SharedDiagram = Pick<StoredDiagram, 'name' | 'type' | 'bpmnXml' | 'excalidrawData'>;
