import { CopyButton } from './CopyButton.jsx';
import { DeleteButton } from './DeleteButton.jsx';
import { ExternalLinkIcon } from './Icons.jsx';

function formatDate(dateStr) {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function UrlHistoryItem({ item, onDelete }) {
  return (
    <li className="history-row" role="listitem">
      {/* Route Column */}
      <div className="col-route">
        <div className="route-header">
          {item.label && <span className="item-label-badge">{item.label}</span>}
          <a
            href={item.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="item-short-link"
          >
            <span>{item.shortUrl}</span>
            <ExternalLinkIcon className="link-ext-icon" />
          </a>
        </div>
      </div>

      {/* Destination Column */}
      <div className="col-destination">
        <span className="destination-url" title={item.originalUrl} tabIndex={0}>
          {item.originalUrl}
        </span>
      </div>

      {/* Metrics Column */}
      <div className="col-metrics">
        <div className="metric-pill">
          <span className="metric-value clicks">{item.clickCount ?? 0}</span>
          <span className="metric-label">{item.clickCount === 1 ? 'click' : 'clicks'}</span>
        </div>
        <div className="metric-date-group">
          <span className="metric-date" title={`Created: ${formatDate(item.createdAt)}`}>
            {formatDate(item.createdAt)}
          </span>
          {item.lastClickedAt && (
            <span className="metric-subdate" title={`Last clicked: ${formatDate(item.lastClickedAt)}`}>
              Last clicked {formatDate(item.lastClickedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Actions Column */}
      <div className="col-actions">
        <CopyButton text={item.shortUrl} label="Copy" className="table-copy-btn" />
        <DeleteButton onDelete={() => onDelete(item.id)} />
      </div>
    </li>
  );
}
