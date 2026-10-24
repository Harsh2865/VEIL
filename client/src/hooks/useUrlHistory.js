import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchHistory, deleteUrl } from '../api/urlApi.js';

const POLL_INTERVAL_MS = 5000;

export function useUrlHistory(clientId) {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'clicks'

  const inFlightRef = useRef(false);
  const abortControllerRef = useRef(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const loadHistory = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchHistory({ limit: 20 }, clientId);
      setItems(data.items || []);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load URL history.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  const loadMore = useCallback(async () => {
    if (!clientId || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await fetchHistory({ limit: 20, cursor: nextCursor }, clientId);
      setItems((prev) => [...prev, ...(data.items || [])]);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load more items.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [clientId, nextCursor, isLoadingMore]);

  const removeUrl = useCallback(async (id) => {
    if (!clientId) return;
    await deleteUrl(id, clientId);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [clientId]);

  const addUrlLocally = useCallback((newUrl) => {
    setItems((prev) => [newUrl, ...prev]);
  }, []);

  // Background silent polling without triggering full-page loading or flickering
  const pollHistory = useCallback(async () => {
    if (!clientId) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const currentCount = itemsRef.current.length;
      const limit = Math.min(Math.max(currentCount, 20), 50);

      const data = await fetchHistory(
        { limit },
        clientId,
        { signal: controller.signal }
      );

      if (data && Array.isArray(data.items)) {
        setItems((prevItems) => {
          if (prevItems.length === 0) {
            return data.items;
          }

          const freshMap = new Map(data.items.map((item) => [item.id, item]));
          const prevIds = new Set(prevItems.map((item) => item.id));
          const brandNew = data.items.filter((item) => !prevIds.has(item.id));

          let hasChanges = false;
          const updatedExisting = prevItems.map((item) => {
            const fresh = freshMap.get(item.id);
            if (!fresh) return item;
            if (
              item.clickCount === fresh.clickCount &&
              item.lastClickedAt === fresh.lastClickedAt &&
              item.label === fresh.label &&
              item.originalUrl === fresh.originalUrl
            ) {
              return item;
            }
            hasChanges = true;
            return { ...item, ...fresh };
          });

          if (brandNew.length === 0 && !hasChanges) {
            return prevItems;
          }

          return [...brandNew, ...updatedExisting];
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      // Background poll silently fails without disruptive error banners
    } finally {
      inFlightRef.current = false;
    }
  }, [clientId]);

  // Initial load
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Automatic refresh interval (every 5 seconds) & visibility listener
  useEffect(() => {
    if (!clientId) return;

    let intervalId = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
          pollHistory();
        }
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        pollHistory();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
      startPolling();
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clientId, pollHistory]);

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      result = result.filter((item) => {
        const matchesOriginal = item.originalUrl?.toLowerCase().includes(query);
        const matchesCode = item.shortCode?.toLowerCase().includes(query);
        const matchesLabel = item.label?.toLowerCase().includes(query);
        return matchesOriginal || matchesCode || matchesLabel;
      });
    }

    if (sortBy === 'clicks') {
      result.sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0));
    }

    return result;
  }, [items, searchTerm, sortBy]);

  return {
    items,
    filteredItems: filteredAndSortedItems,
    nextCursor,
    hasMore: Boolean(nextCursor),
    isLoading,
    isLoadingMore,
    error,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    loadHistory,
    loadMore,
    removeUrl,
    addUrlLocally,
  };
}
