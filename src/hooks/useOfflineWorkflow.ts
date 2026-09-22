import { useCallback, useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { supabase } from '../lib/supabase';

export interface WorkflowQueueItem {
  id: string;
  table: 'workflow_processes' | 'workflow_movements';
  payload: Record<string, unknown>;
  createdAt: string;
}

const QUEUE_KEY = 'pending-workflow-operations';
const CACHE_KEY = 'workflow-process-cache';
const STUDENT_CACHE_KEY = 'workflow-student-cache';

const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function useOfflineWorkflow() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState<WorkflowQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadQueue = useCallback(async () => {
    setPending(await get<WorkflowQueueItem[]>(QUEUE_KEY) || []);
  }, []);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    loadQueue();
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [loadQueue]);

  const cacheProcesses = useCallback(async (processes: unknown[]) => {
    await set(CACHE_KEY, processes);
  }, []);

  const getCachedProcesses = useCallback(async <T,>() => get<T[]>(CACHE_KEY) || [], []);
  const cacheStudents = useCallback(async (students: unknown[]) => {
    await set(STUDENT_CACHE_KEY, students);
  }, []);
  const getCachedStudents = useCallback(async <T,>() => get<T[]>(STUDENT_CACHE_KEY) || [], []);

  const enqueue = useCallback(async (table: WorkflowQueueItem['table'], payload: Record<string, unknown>) => {
    const item = { id: generateId(), table, payload, createdAt: new Date().toISOString() };
    const next = [...(await get<WorkflowQueueItem[]>(QUEUE_KEY) || []), item];
    await set(QUEUE_KEY, next);
    setPending(next);
    return item;
  }, []);

  const sync = useCallback(async () => {
    if (!isOnline || syncing || pending.length === 0) return;
    setSyncing(true);
    const remaining: WorkflowQueueItem[] = [];
    for (const item of pending) {
      const { error } = await supabase.from(item.table).upsert(item.payload);
      if (error) remaining.push(item);
    }
    await set(QUEUE_KEY, remaining);
    setPending(remaining);
    setSyncing(false);
  }, [isOnline, pending, syncing]);

  useEffect(() => {
    if (isOnline) sync();
  }, [isOnline, sync]);

  return { isOnline, pending, syncing, enqueue, sync, cacheProcesses, getCachedProcesses, cacheStudents, getCachedStudents };
}
