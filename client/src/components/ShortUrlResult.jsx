import { CopyButton } from './CopyButton.jsx';
import { ExternalLinkIcon, CheckIcon } from './Icons.jsx';

export function ShortUrlResult({ result, onReset }) {
  if (!result) return null;

  return (
    <article className="result-card" aria-label="Shortened URL details">
      <div className="result-header">
        <div className="badge-group">
          <span className="success-badge">
            <CheckIcon className="badge-icon" />
            <span>Link Ready</span>
          </span>
          {result.label && <span className="result-label">{result.label}</span>}
        </div>
        <span className="result-code-tag">{result.shortCode}</span>
      </div>

      <div className="result-body">
        <div className="result-link-group">
          <span className="result-heading">Your Short Link</span>
          <div className="short-url-row">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="short-url-link"
              title={result.shortUrl}
            >
              <span>{result.shortUrl}</span>
              <ExternalLinkIcon className="link-ext-icon" />
            </a>
            <CopyButton text={result.shortUrl} label="Copy Link" className="result-copy-btn" />
          </div>
        </div>

        <div className="result-meta">
          <div className="meta-original">
            <span className="meta-title">Original destination</span>
            <span className="original-url-text" title={result.originalUrl} tabIndex={0}>
              {result.originalUrl}
            </span>
          </div>

          <div className="meta-stats">
            <span className="meta-title">Clicks</span>
            <span className="click-count-badge" title="Total clicks counted on redirect">
              {result.clickCount || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="result-footer">
        <button type="button" onClick={onReset} className="btn-secondary">
          Shorten Another Link
        </button>
      </div>
    </article>
  );
}
