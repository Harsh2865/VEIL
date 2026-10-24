import { useState } from 'react';
import { useClientId } from './hooks/useClientId.js';
import { useUrlHistory } from './hooks/useUrlHistory.js';
import { CreateUrlForm } from './components/CreateUrlForm.jsx';
import { ShortUrlResult } from './components/ShortUrlResult.jsx';
import { UrlHistory } from './components/UrlHistory.jsx';
import { VeilLogo } from './components/Icons.jsx';

export function App() {
  const { clientId, isPersistent } = useClientId();
  const {
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
    loadHistory,
    loadMore,
    removeUrl,
    addUrlLocally,
  } = useUrlHistory(clientId);

  const [currentResult, setCurrentResult] = useState(null);

  const handleUrlCreated = (newRecord) => {
    setCurrentResult(newRecord);
    addUrlLocally(newRecord);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <VeilLogo className="brand-logo" />
            <h1 className="brand-wordmark">
              VEIL <span className="brand-classifier">URL Shortener</span>
            </h1>
          </div>
          <p className="brand-subtitle">
            Simple links. Clear destinations.
          </p>
        </div>
      </header>

      <main id="main-content" className="app-main">
        {/* Product Hero Banner on Navy Canvas */}
        <section className="hero-banner" aria-label="Product introduction">
          <h2 className="hero-heading">Shorten, share, and track your links.</h2>
          <p className="hero-subtitle">
            Create clean, reliable short links in seconds with custom aliases, instant redirection, and private click tracking.
          </p>
        </section>

        {/* Form to create short URL */}
        <CreateUrlForm
          clientId={clientId}
          onUrlCreated={handleUrlCreated}
          isClientPersistent={isPersistent}
        />

        {/* Display created short URL result */}
        {currentResult && (
          <ShortUrlResult
            result={currentResult}
            onReset={() => setCurrentResult(null)}
          />
        )}

        {/* Link history per client ID */}
        <UrlHistory
          items={items}
          filteredItems={filteredItems}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          error={error}
          hasMore={hasMore}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onLoadMore={loadMore}
          onDelete={removeUrl}
          onRetry={loadHistory}
        />
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-brand">
            <strong>VEIL</strong> — Developer URL Shortener
          </p>
          <p className="footer-note">
            Link history is saved locally in this browser. Malicious destinations are strictly prohibited.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
