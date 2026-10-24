import { UrlHistoryItem } from './UrlHistoryItem.jsx';
import { LoadingState } from './LoadingState.jsx';
import { ErrorMessage } from './ErrorMessage.jsx';
import { SearchIcon } from './Icons.jsx';

export function UrlHistory({
  items,
  filteredItems,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  onLoadMore,
  onDelete,
  onRetry,
}) {
  return (
    <section className="history-section" aria-labelledby="history-heading">
      <div className="history-header">
        <div className="title-group">
          <h2 id="history-heading" className="history-title">
            Link History
          </h2>
          <span className="history-counter">({items.length})</span>
        </div>

        {items.length > 0 && (
          <div className="history-controls">
            <div className="search-box">
              <label htmlFor="history-search" className="sr-only">Search links</label>
              <SearchIcon className="search-prefix-icon" />
              <input
                id="history-search"
                type="search"
                placeholder="Search links or labels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                autoComplete="off"
                spellCheck="false"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="search-clear-btn"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="sort-box">
              <label htmlFor="history-sort" className="sort-label">Sort by:</label>
              <select
                id="history-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
                aria-describedby="sort-note"
              >
                <option value="newest">Newest first</option>
                <option value="clicks">Most clicks</option>
              </select>
              <span id="sort-note" className="sr-only">Sort by clicks applies to loaded items only</span>
            </div>
          </div>
        )}
      </div>

      {sortBy === 'clicks' && items.length > 0 && (
        <p className="sort-caption" aria-hidden="true">
          * Sorted by most clicks among currently loaded links
        </p>
      )}

      {error && <ErrorMessage message={error} onRetry={onRetry} />}

      {isLoading && items.length === 0 && <LoadingState />}

      {!isLoading && items.length === 0 && !error && (
        <div className="empty-history" role="region" aria-label="No link history">
          <h3>No short links created yet</h3>
          <p>Shorten your first destination URL using the form above to build your link history.</p>
        </div>
      )}

      {!isLoading && items.length > 0 && filteredItems.length === 0 && (
        <div className="empty-search" role="status">
          <p>No short links match &quot;{searchTerm}&quot;.</p>
          <button type="button" onClick={() => setSearchTerm('')} className="btn-secondary sm">
            Clear filter
          </button>
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="table-container">
          <div className="table-header-row" aria-hidden="true">
            <span className="th-cell route">Short link</span>
            <span className="th-cell dest">Destination</span>
            <span className="th-cell stats">Traffic</span>
            <span className="th-cell act">Actions</span>
          </div>
          <ul className="history-table" role="list" aria-label="Your short links list">
            {filteredItems.map((item) => (
              <UrlHistoryItem key={item.id} item={item} onDelete={onDelete} />
            ))}
          </ul>
        </div>
      )}

      {hasMore && !searchTerm && (
        <div className="load-more-wrapper">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="btn-load-more"
            aria-busy={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <span className="spinner-sm" aria-hidden="true"></span>
                <span>Loading more links...</span>
              </>
            ) : (
              'Load More Links'
            )}
          </button>
        </div>
      )}
    </section>
  );
}
