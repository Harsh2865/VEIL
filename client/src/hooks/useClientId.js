import { useState, useEffect } from 'react';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_KEY = 'url_shortener_client_id';

let memoryClientId = null;

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator if crypto.randomUUID is not present
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useClientId() {
  const [clientId, setClientId] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && UUID_V4_REGEX.test(stored)) {
        return stored;
      }
      const newId = generateUUID();
      localStorage.setItem(STORAGE_KEY, newId);
      return newId;
    } catch {
      // In private browsing mode or storage blocked
      if (!memoryClientId) {
        memoryClientId = generateUUID();
      }
      return memoryClientId;
    }
  });

  const [isPersistent, setIsPersistent] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored || !UUID_V4_REGEX.test(stored)) {
        localStorage.setItem(STORAGE_KEY, clientId);
      }
      setIsPersistent(true);
    } catch {
      setIsPersistent(false);
    }
  }, [clientId]);

  return { clientId, isPersistent, setClientId };
}
