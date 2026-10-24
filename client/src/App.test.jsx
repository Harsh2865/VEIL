import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App.jsx';
import * as urlApi from './api/urlApi.js';
import { CopyButton } from './components/CopyButton.jsx';
import { DeleteButton } from './components/DeleteButton.jsx';

describe('Phase 4 Frontend Components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('App Component and Create URL Flow', () => {
    it('renders heading and main form inputs', async () => {
      vi.spyOn(urlApi, 'fetchHistory').mockResolvedValue({ items: [], nextCursor: null });

      render(<App />);

      expect(screen.getByRole('heading', { name: /URL Shortener/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Destination URL/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Custom Alias/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Shorten URL/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(urlApi.fetchHistory).toHaveBeenCalled();
      });
    });

    it('shows inline validation error when submitting blank or invalid URL', async () => {
      vi.spyOn(urlApi, 'fetchHistory').mockResolvedValue({ items: [], nextCursor: null });

      render(<App />);

      const submitButton = screen.getByRole('button', { name: /Shorten URL/i });
      fireEvent.click(submitButton);

      expect(await screen.findByText(/Enter a valid HTTP or HTTPS URL/i)).toBeInTheDocument();

      // Enter disallowed scheme
      const urlInput = screen.getByLabelText(/Destination URL/i);
      fireEvent.change(urlInput, { target: { value: 'javascript:alert(1)' } });
      fireEvent.click(submitButton);

      expect(await screen.findByText(/Only HTTP and HTTPS URLs are supported/i)).toBeInTheDocument();
    });

    it('successfully creates a short URL and shows the result card', async () => {
      vi.spyOn(urlApi, 'fetchHistory').mockResolvedValue({ items: [], nextCursor: null });
      vi.spyOn(urlApi, 'shortenUrl').mockResolvedValue({
        id: '12345',
        originalUrl: 'https://example.com/test-article',
        shortCode: 'abc1234',
        label: 'My Article',
        shortUrl: 'http://localhost:5000/s/abc1234',
        clickCount: 0,
        createdAt: new Date().toISOString(),
        lastClickedAt: null,
      });

      render(<App />);

      const urlInput = screen.getByLabelText(/Destination URL/i);
      const submitButton = screen.getByRole('button', { name: /Shorten URL/i });

      fireEvent.change(urlInput, { target: { value: 'https://example.com/test-article' } });
      fireEvent.click(submitButton);

      // Result card should appear
      expect(await screen.findByText(/Link Ready/i)).toBeInTheDocument();
      expect(screen.getAllByText('http://localhost:5000/s/abc1234').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('https://example.com/test-article').length).toBeGreaterThanOrEqual(1);

      // Reset button clears result card
      const resetButton = screen.getByRole('button', { name: /Shorten Another Link/i });
      fireEvent.click(resetButton);
      expect(screen.queryByText(/Link Ready/i)).not.toBeInTheDocument();
    });

    it('displays error message when server returns code conflict (409 CODE_TAKEN)', async () => {
      vi.spyOn(urlApi, 'fetchHistory').mockResolvedValue({ items: [], nextCursor: null });
      const conflictError = new Error('The custom code is already taken.');
      conflictError.code = 'CODE_TAKEN';
      conflictError.status = 409;
      vi.spyOn(urlApi, 'shortenUrl').mockRejectedValue(conflictError);

      render(<App />);

      const urlInput = screen.getByLabelText(/Destination URL/i);
      const codeInput = screen.getByLabelText(/Custom Alias/i);
      const submitButton = screen.getByRole('button', { name: /Shorten URL/i });

      fireEvent.change(urlInput, { target: { value: 'https://example.com/test' } });
      fireEvent.change(codeInput, { target: { value: 'taken-slug' } });
      fireEvent.click(submitButton);

      expect(await screen.findByText(/This custom code is already in use/i)).toBeInTheDocument();
    });
  });

  describe('CopyButton functionality', () => {
    it('calls navigator.clipboard.writeText and shows Copied! on success', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });
      window.isSecureContext = true;

      render(<CopyButton text="https://short.link/xyz" />);

      const copyBtn = screen.getByRole('button', { name: /Copy https:\/\/short.link\/xyz/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('https://short.link/xyz');
      });
      expect(await screen.findByText(/Copied!/i)).toBeInTheDocument();
    });

    it('displays fallback prompt when clipboard write fails or is denied', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
      });
      window.isSecureContext = true;

      render(<CopyButton text="https://short.link/xyz" />);

      const copyBtn = screen.getByRole('button', { name: /Copy/i });
      fireEvent.click(copyBtn);

      expect(await screen.findByText(/Press Ctrl\/Cmd\+C to copy/i)).toBeInTheDocument();
      const fallbackInput = screen.getByDisplayValue('https://short.link/xyz');
      expect(fallbackInput).toBeInTheDocument();
    });
  });

  describe('DeleteButton with confirmation flow', () => {
    it('shows confirmation prompt on initial click and cancels when cancel clicked', async () => {
      const onDeleteMock = vi.fn();
      render(<DeleteButton onDelete={onDeleteMock} />);

      const deleteBtn = screen.getByRole('button', { name: /Delete/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByText(/Delete link\?/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm deletion/i })).toBeInTheDocument();

      // Click cancel
      const cancelBtn = screen.getByRole('button', { name: /Cancel deletion/i });
      fireEvent.click(cancelBtn);

      expect(screen.queryByText(/Delete link\?/i)).not.toBeInTheDocument();
      expect(onDeleteMock).not.toHaveBeenCalled();
    });

    it('invokes onDelete when user confirms', async () => {
      const onDeleteMock = vi.fn().mockResolvedValue(undefined);
      render(<DeleteButton onDelete={onDeleteMock} />);

      fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
      fireEvent.click(screen.getByRole('button', { name: /Confirm deletion/i }));

      expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('History list, filtering, and sorting', () => {
    it('filters items by search term and sorts by clicks', async () => {
      const sampleItems = [
        {
          id: '1',
          originalUrl: 'https://react.dev/learn',
          shortCode: 'react-docs',
          label: 'React Documentation',
          shortUrl: 'http://localhost:5000/s/react-docs',
          clickCount: 10,
          createdAt: '2026-01-01T10:00:00Z',
          lastClickedAt: '2026-01-02T10:00:00Z',
        },
        {
          id: '2',
          originalUrl: 'https://vitejs.dev/guide',
          shortCode: 'vite-guide',
          label: 'Vite Guide',
          shortUrl: 'http://localhost:5000/s/vite-guide',
          clickCount: 50,
          createdAt: '2026-01-02T10:00:00Z',
          lastClickedAt: '2026-01-03T10:00:00Z',
        },
      ];

      vi.spyOn(urlApi, 'fetchHistory').mockResolvedValue({ items: sampleItems, nextCursor: null });

      render(<App />);

      expect(await screen.findByText('React Documentation')).toBeInTheDocument();
      expect(screen.getByText('Vite Guide')).toBeInTheDocument();

      // Filter by search query
      const searchInput = screen.getByPlaceholderText(/Search links or labels/i);
      fireEvent.change(searchInput, { target: { value: 'React' } });

      expect(screen.getByText('React Documentation')).toBeInTheDocument();
      expect(screen.queryByText('Vite Guide')).not.toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Vite Guide')).toBeInTheDocument();

      // Sort by clicks
      const sortSelect = screen.getByLabelText(/Sort by/i);
      fireEvent.change(sortSelect, { target: { value: 'clicks' } });

      // After sorting by clicks, Vite Guide (50 clicks) should be before React Documentation (10 clicks)
      const listItems = screen.getAllByRole('listitem');
      expect(listItems[0]).toHaveTextContent('Vite Guide');
      expect(listItems[1]).toHaveTextContent('React Documentation');
    });

    it('history persists across page refresh using stored localStorage client ID', async () => {
      const storedId = '44444444-4444-4444-8444-444444444444';
      localStorage.setItem('url_shortener_client_id', storedId);

      const persistedItem = {
        id: 'persisted-1',
        originalUrl: 'https://example.com/persisted',
        shortCode: 'persist1',
        label: 'Persisted Link',
        shortUrl: 'http://localhost:5000/s/persist1',
        clickCount: 5,
        createdAt: new Date().toISOString(),
        lastClickedAt: null,
      };

      const fetchHistorySpy = vi.spyOn(urlApi, 'fetchHistory').mockResolvedValue({
        items: [persistedItem],
        nextCursor: null,
      });

      // First mount
      const { unmount } = render(<App />);
      expect(await screen.findByText('Persisted Link')).toBeInTheDocument();
      expect(fetchHistorySpy).toHaveBeenCalledWith({ limit: 20 }, storedId);

      // Simulate browser refresh: unmount and remount
      unmount();

      render(<App />);
      expect(await screen.findByText('Persisted Link')).toBeInTheDocument();
      expect(fetchHistorySpy).toHaveBeenLastCalledWith({ limit: 20 }, storedId);
    });
  });

  describe('Automatic Click-Count Updates and Polling Lifecycle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('automatically refreshes click counts every 5 seconds while preserving search and sort state', async () => {
      let pollCallCount = 0;
      const initialItem = {
        id: 'link-poll-1',
        originalUrl: 'https://docs.example.com',
        shortCode: 'docs123',
        label: 'Developer Documentation',
        shortUrl: 'http://localhost:5000/s/docs123',
        clickCount: 0,
        createdAt: new Date().toISOString(),
        lastClickedAt: null,
      };

      vi.spyOn(urlApi, 'fetchHistory').mockImplementation(async () => {
        pollCallCount++;
        if (pollCallCount === 1) {
          return { items: [initialItem], nextCursor: null };
        }
        // Subsequent poll returns updated clickCount from backend
        return {
          items: [{ ...initialItem, clickCount: 42, lastClickedAt: new Date().toISOString() }],
          nextCursor: null,
        };
      });

      render(<App />);

      // Flush initial load
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Developer Documentation')).toBeInTheDocument();
      expect(screen.getByText('0')).toHaveClass('metric-value');

      // Enter search query and sort
      fireEvent.change(screen.getByPlaceholderText(/Search links or labels/i), { target: { value: 'Developer' } });
      fireEvent.change(screen.getByLabelText(/Sort by/i), { target: { value: 'clicks' } });

      // Fast-forward 5000ms for next poll interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Verify click count updated to 42
      expect(screen.getByText('42')).toHaveClass('metric-value');
      // Search input and sort selection must be preserved
      expect(screen.getByPlaceholderText(/Search links or labels/i)).toHaveValue('Developer');
      expect(screen.getByLabelText(/Sort by/i)).toHaveValue('clicks');
    });

    it('pauses polling while browser tab is hidden and resumes immediately when visible', async () => {
      const mockItem = {
        id: 'vis-1',
        originalUrl: 'https://test.com',
        shortCode: 'vis1',
        label: 'Visibility Test',
        shortUrl: 'http://localhost:5000/s/vis1',
        clickCount: 1,
        createdAt: new Date().toISOString(),
        lastClickedAt: null,
      };

      const fetchHistorySpy = vi.spyOn(urlApi, 'fetchHistory').mockResolvedValue({
        items: [mockItem],
        nextCursor: null,
      });

      render(<App />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(fetchHistorySpy).toHaveBeenCalledTimes(1);

      // Hide tab
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      fireEvent(document, new Event('visibilitychange'));

      // Advance by 15000ms (3 poll periods) while tab is hidden
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
      });
      // fetchHistory should NOT have been called while hidden
      expect(fetchHistorySpy).toHaveBeenCalledTimes(1);

      // Show tab again
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      await act(async () => {
        fireEvent(document, new Event('visibilitychange'));
      });

      // Should immediately refresh upon becoming visible
      expect(fetchHistorySpy).toHaveBeenCalledTimes(2);

      // And polling resumes
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(fetchHistorySpy).toHaveBeenCalledTimes(3);
    });

    it('cleans up polling intervals and event listeners on unmount', async () => {
      const fetchHistorySpy = vi.spyOn(urlApi, 'fetchHistory').mockResolvedValue({
        items: [],
        nextCursor: null,
      });

      const { unmount } = render(<App />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(fetchHistorySpy).toHaveBeenCalledTimes(1);

      // Unmount component
      unmount();

      // Advance timer by 15000ms
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
      });

      // No additional calls after unmount
      expect(fetchHistorySpy).toHaveBeenCalledTimes(1);
    });

    it('prevents overlapping requests if a poll request is still in-flight', async () => {
      let resolveFirstCall;
      const delayedPromise = new Promise((resolve) => {
        resolveFirstCall = resolve;
      });

      let callCount = 0;
      vi.spyOn(urlApi, 'fetchHistory').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // initial load resolves immediately
          return { items: [], nextCursor: null };
        }
        // second call stays pending
        return delayedPromise;
      });

      render(<App />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(callCount).toBe(1);

      // First poll triggers and stays in-flight
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(callCount).toBe(2);

      // Next 5000ms tick arrives while previous poll is still unresolved
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      // callCount must still be 2 (no overlapping request initiated!)
      expect(callCount).toBe(2);

      // Resolve the delayed promise
      await act(async () => {
        resolveFirstCall({ items: [], nextCursor: null });
        await vi.advanceTimersByTimeAsync(0);
      });

      // Next tick after completion proceeds normally
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(callCount).toBe(3);
    });
  });
});
