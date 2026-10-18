import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import Viewer from 'bpmn-js/lib/NavigatedViewer';
import { Excalidraw } from '@excalidraw/excalidraw';
import { api } from '../auth-client';
import type { Session } from '../hooks/useSessionStorage';

function BpmnView({ xml }: { xml: string }) {
  const element = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!element.current) return;
    const viewer = new Viewer({ container: element.current });
    let disposed = false;
    void viewer.importXML(xml).then(() => { if (!disposed) viewer.get<{ zoom: (value: string) => void }>('canvas').zoom('fit-viewport'); }).catch(() => { if (!disposed) setError(true); });
    return () => { disposed = true; viewer.destroy(); };
  }, [xml]);
  return <div className="relative flex-1 bg-white"><div ref={element} className="absolute inset-0" />{error && <p role="alert" className="relative p-6 text-red-700">This diagram could not be rendered.</p>}</div>;
}
export default function SharedDiagramView({ token, owner }: { token: string; owner: string }) {
  const { data, error } = useSWR<Pick<Session, 'name' | 'type' | 'bpmnXml' | 'excalidrawData'>>(`/api/shared?token=${encodeURIComponent(token)}&owner=${encodeURIComponent(owner)}`, api, { shouldRetryOnError: false });
  return <main className="h-screen flex flex-col bg-slate-950 text-white">
    <header className="flex flex-wrap items-center gap-4 justify-between p-5 border-b border-slate-800"><div><h1 className="font-semibold">{data?.name || 'Shared diagram'}</h1><p className="text-sm text-slate-400">Read-only snapshot · Diagram Studio</p></div><a className="text-indigo-300" href="/">Open your workspace</a></header>
    {error ? <p role="alert" className="p-8">This link is unavailable or has been revoked.</p> : !data ? <p role="status" className="p-8">Loading diagram…</p> : data.type === 'bpmn' ? <BpmnView xml={data.bpmnXml} /> : <div className="flex-1"><Excalidraw initialData={{ ...data.excalidrawData, appState: { viewBackgroundColor: data.excalidrawData?.appState.viewBackgroundColor || '#ffffff', viewModeEnabled: true } }} viewModeEnabled UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false } }} /></div>}
  </main>;
}
