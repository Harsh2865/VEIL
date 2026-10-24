import { useState, useRef } from 'react';
import { CopyIcon, CheckIcon } from './Icons.jsx';

export function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const inputRef = useRef(null);

  const handleCopy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setFallbackMode(false);
        setTimeout(() => setCopied(false), 2200);
        return;
      } catch {
        // Fall back to selection approach
      }
    }

    // Fallback: Show readonly input and select text
    setFallbackMode(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  };

  return (
    <div className={`copy-button-container ${className}`}>
      <button
        type="button"
        onClick={handleCopy}
        className={`btn-copy ${copied ? 'copied' : ''}`}
        aria-label={copied ? 'Link copied to clipboard' : `Copy ${text} to clipboard`}
      >
        {copied ? (
          <>
            <CheckIcon className="icon-state ok" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <CopyIcon className="icon-state" />
            <span>{label}</span>
          </>
        )}
      </button>

      {fallbackMode && (
        <div className="copy-fallback" role="dialog" aria-label="Manual copy prompt">
          <label htmlFor={`manual-copy-${text}`} className="sr-only">Copy link manually</label>
          <input
            id={`manual-copy-${text}`}
            ref={inputRef}
            type="text"
            readOnly
            value={text}
            onFocus={(e) => e.target.select()}
            className="fallback-input"
          />
          <p className="fallback-note" aria-live="polite">Press Ctrl/Cmd+C to copy</p>
        </div>
      )}
    </div>
  );
}
