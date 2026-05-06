import { useState, useEffect, useCallback } from 'react';
import { get, set } from 'idb-keyval';
import { supabase } from '../lib/supabase';

export interface OfflineLog {
  id: string; // uuid v4 local
  student_id: string;
  type: 'IN' | 'OUT';
  gatekeeper_id?: string;
  notes: string;
  timestamp: string; // ISO string when it was actually scanned
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingLogs, setPendingLogs] = useState<OfflineLog[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Helper to generate local IDs since crypto.randomUUID might not be available everywhere
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load of pending logs
    loadPendingLogs();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingLogs = async () => {
    try {
      const logs = await get<OfflineLog[]>('pending-access-logs') || [];
      setPendingLogs(logs);
    } catch (err) {
      console.error('Failed to load pending logs from IndexedDB', err);
    }
  };

  const saveLogOffline = async (logData: Omit<OfflineLog, 'id' | 'timestamp'>) => {
    try {
      const newLog: OfflineLog = {
        ...logData,
        id: generateUUID(),
        timestamp: new Date().toISOString()
      };
      
      const currentLogs = await get<OfflineLog[]>('pending-access-logs') || [];
      const updatedLogs = [...currentLogs, newLog];
      
      await set('pending-access-logs', updatedLogs);
      setPendingLogs(updatedLogs);
      return true;
    } catch (err) {
      console.error('Failed to save log offline', err);
      return false;
    }
  };

  const syncLogs = useCallback(async () => {
    if (!isOnline || pendingLogs.length === 0 || syncing) return;

    setSyncing(true);
    let logsRemaining = [...pendingLogs];
    let hasError = false;

    for (const log of pendingLogs) {
      try {
        const { error } = await supabase.from('access_logs').insert({
          student_id: log.student_id,
          type: log.type,
          gatekeeper_id: log.gatekeeper_id,
          notes: log.notes + ' (Sincronizado Offline)',
          timestamp: log.timestamp // Keep original time!
        });

        if (error) {
          console.error(`Error syncing log ${log.id}:`, error);
          hasError = true;
          // Keep it in logsRemaining if it failed so we can retry later
        } else {
          // Remove from list if successful
          logsRemaining = logsRemaining.filter(l => l.id !== log.id);
        }
      } catch (err) {
         console.error(`Unexpected error syncing log ${log.id}:`, err);
         hasError = true;
      }
    }

    try {
      await set('pending-access-logs', logsRemaining);
      setPendingLogs(logsRemaining);
    } catch (err) {
      console.error('Failed to update IndexedDB after sync', err);
    }

    setSyncing(false);
    
    if (!hasError && pendingLogs.length > 0 && logsRemaining.length === 0) {
      console.log('All offline logs synced successfully!');
    }
  }, [isOnline, pendingLogs, syncing]);

  // Try to sync whenever we come online
  useEffect(() => {
    if (isOnline && pendingLogs.length > 0) {
      syncLogs();
    }
  }, [isOnline, pendingLogs.length, syncLogs]);

  return {
    isOnline,
    pendingLogs,
    saveLogOffline,
    syncLogs,
    syncing
  };
}
