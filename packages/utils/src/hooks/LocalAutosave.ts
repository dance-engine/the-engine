import { EventType } from '@dance-engine/schemas/events'
import { useAutosave } from 'react-autosave';
import { useCallback, useState, useRef } from 'react';

interface AutoSaveOptions<T extends { ksuid: string, meta?: { updated_at?: string } }> {
  data: T;
  entityType: string;
  remoteUpdatedAt?: string; // ISO timestamp from the server
  isDirty?: boolean;
}

export function useLocalAutoSave<T extends { ksuid: string, meta?: { updated_at?: string } }>({
  data,
  entityType,
  remoteUpdatedAt,
  isDirty = true
}: AutoSaveOptions<T>) {
  const STORAGE_KEY = `${entityType}#${data?.ksuid}`;
  const STORAGE_LIST_KEY = `local:${entityType}`
  const [status, setStatus] = useState<
    'Idle' | 'Saving...' | 'Saved to server' | 'Draft saved locally' | 'Save failed' | 'Local save error'
  >('Idle');
  const [isStatusVisible, setIsStatusVisible] = useState(false);

  const resetTimer = useRef<NodeJS.Timeout | null>(null);

  const setStatusWithReset = useCallback((newStatus: typeof status) => {
    console.log("Changing Status to", newStatus)
    setStatus(newStatus);
    setIsStatusVisible(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    if (newStatus !== 'Idle') {
      console.log("PREP TO HIDE")
      // 
      resetTimer.current = setTimeout(() => {
        console.log("HIDE")
        
        setIsStatusVisible(false)
        resetTimer.current = setTimeout(() => { setStatus("Idle");},1000)
      }, 3000);
    } else {
      setIsStatusVisible(true)
    }
  }, []);

  // Auto-save to localStorage
  useAutosave({
    data,
    interval: 1500,
    onSave: (newData: T) => {
      if (!isDirty) return;
      try {
        const updated_at = new Date().toISOString();
        const updatedData: T = {
          ...newData,
          meta: {
            ...(newData.meta || {}),
            updated_at,
          },
        };
        const currentHistory = JSON.parse(localStorage.getItem(STORAGE_LIST_KEY) || "[]")
        const newHistory = [...new Set([...(currentHistory.flat()),STORAGE_KEY])]
        localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(newHistory));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
        setStatusWithReset('Draft saved locally');
      } catch (e) {
        console.error('Local save failed', e);
        setStatusWithReset('Local save error');
      }
    },
  });


  // Load draft if it's newer than remote version
  const loadFromStorage = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed: T = JSON.parse(raw);
      const localUpdated = parsed.meta?.updated_at;
      const remoteUpdated = remoteUpdatedAt;

      if (
        remoteUpdated &&
        localUpdated &&
        new Date(remoteUpdated) > new Date(localUpdated)
      ) {
        // Remote is newer, skip loading draft
        return null;
      }

      return parsed;
    } catch (e) {
      console.error('Failed to load local draft', e);
      return null;
    }
  }, [STORAGE_KEY, remoteUpdatedAt]);

  return { status, isStatusVisible, loadFromStorage };
}


  // useEffect(()=>{
  //   if(typeof window !== "undefined" && persistKey ) {
  //     const currentHistoryString = window.localStorage.getItem(persistKey?.type) || "[]"
  //     const currentHistory = JSON.parse(currentHistoryString)
  //     const newHistory = [...new Set([...(currentHistory.flat()),persistKey.ksuid])]
  //     window.localStorage.setItem(persistKey?.type,JSON.stringify(newHistory))
  //   }
  // },[])
