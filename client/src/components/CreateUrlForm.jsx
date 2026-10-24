import { useState, useEffect, useRef } from 'react';
import { validateUrl, validateCustomCode } from '../utils/validators.js';
import { checkCodeAvailability, shortenUrl } from '../api/urlApi.js';
import { AlertIcon } from './Icons.jsx';

export function CreateUrlForm({ clientId, onUrlCreated, isClientPersistent }) {
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [label, setLabel] = useState('');

  const [urlError, setUrlError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [formError, setFormError] = useState('');

  const [codeAvailability, setCodeAvailability] = useState(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const debounceTimerRef = useRef(null);

  // Debounced live availability check for custom code
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedCode = customCode.trim();
    if (!trimmedCode) {
      setCodeAvailability(null);
      setCodeError('');
      setIsCheckingCode(false);
      return;
    }

    const localVal = validateCustomCode(trimmedCode);
    if (!localVal.valid) {
      setCodeError(localVal.message || 'Invalid short code format.');
      setCodeAvailability(null);
      setIsCheckingCode(false);
      return;
    }

    setCodeError('');
    setIsCheckingCode(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await checkCodeAvailability(trimmedCode);
        if (result.available) {
          setCodeAvailability({
            available: true,
            message: `"${trimmedCode}" is available!`,
          });
        } else {
          const reasonMsg =
            result.reason === 'taken'
              ? `"${trimmedCode}" is already in use.`
              : result.reason === 'reserved'
              ? `"${trimmedCode}" is a reserved system path.`
              : `"${trimmedCode}" is not a valid custom code.`;
          setCodeAvailability({
            available: false,
            message: reasonMsg,
          });
        }
      } catch {
        setCodeAvailability(null);
      } finally {
        setIsCheckingCode(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [customCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setStatusMessage('');

    // URL validation
    const urlVal = validateUrl(url);
    if (!urlVal.valid) {
      setUrlError(urlVal.message);
      return;
    }
    setUrlError('');

    // Code validation
    if (customCode.trim()) {
      const codeVal = validateCustomCode(customCode);
      if (!codeVal.valid) {
        setCodeError(codeVal.message);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const createdRecord = await shortenUrl(
        {
          url: urlVal.url,
          customCode: customCode.trim() || undefined,
          label: label.trim() || undefined,
        },
        clientId
      );

      setStatusMessage('Short URL created successfully!');
      onUrlCreated(createdRecord);
      // Reset form fields
      setUrl('');
      setCustomCode('');
      setLabel('');
      setCodeAvailability(null);
    } catch (err) {
      if (err.code === 'CODE_TAKEN') {
        setFormError('This custom code is already in use. Please choose a different code.');
      } else {
        setFormError(err.message || 'Failed to shorten URL.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="shorten-card" aria-labelledby="shorten-heading">
      <div className="section-header">
        <h2 id="shorten-heading" className="card-title">Shorten a URL</h2>
        <span className="section-note">Fast redirects with atomic click tracking</span>
      </div>

      {!isClientPersistent && (
        <aside className="storage-warning" role="note">
          <AlertIcon className="warning-icon" />
          <span>Private browsing detected: link history will only persist for this browser session.</span>
        </aside>
      )}

      {/* Screen reader live announcements */}
      <div className="sr-only" aria-live="polite">
        {statusMessage}
      </div>

      {formError && (
        <div className="form-error-banner" role="alert">
          <AlertIcon className="banner-icon" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="shorten-form">
        {/* Main Destination URL Input */}
        <div className="form-group">
          <label htmlFor="url-input" className="form-label">
            Destination URL <span className="required" aria-hidden="true">*</span>
          </label>
          <div className="input-wrapper">
            <input
              id="url-input"
              type="url"
              className={`form-input large ${urlError ? 'invalid' : ''}`}
              placeholder="https://example.com/long-page-address-to-shorten"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError('');
              }}
              aria-required="true"
              aria-invalid={Boolean(urlError)}
              aria-describedby={urlError ? 'url-error' : undefined}
              disabled={isSubmitting}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          {urlError && (
            <p id="url-error" className="field-error" role="alert">
              {urlError}
            </p>
          )}
        </div>

        {/* Optional Custom Alias and Label Fields */}
        <div className="form-row">
          <div className="form-group flex-1">
            <label htmlFor="code-input" className="form-label">
              Custom Alias <span className="optional-tag">(optional)</span>
            </label>
            <div className="input-wrapper prefix-wrapper">
              <span className="input-prefix" aria-hidden="true">/s/</span>
              <input
                id="code-input"
                type="text"
                className={`form-input with-prefix ${codeError ? 'invalid' : ''}`}
                placeholder="custom-slug"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                maxLength={30}
                aria-invalid={Boolean(codeError)}
                aria-describedby={codeError ? 'code-error' : (codeAvailability ? 'code-availability' : undefined)}
                disabled={isSubmitting}
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            {isCheckingCode && <p className="field-hint">Checking availability...</p>}
            {codeAvailability && !isCheckingCode && (
              <p
                id="code-availability"
                className={`field-status ${codeAvailability.available ? 'available' : 'taken'}`}
                role="status"
              >
                <span className="status-dot" aria-hidden="true"></span>
                <span>{codeAvailability.message}</span>
              </p>
            )}
            {codeError && (
              <p id="code-error" className="field-error" role="alert">
                {codeError}
              </p>
            )}
          </div>

          <div className="form-group flex-1">
            <label htmlFor="label-input" className="form-label">
              Title or Label <span className="optional-tag">(optional)</span>
            </label>
            <div className="input-wrapper">
              <input
                id="label-input"
                type="text"
                className="form-input"
                placeholder="e.g. Documentation, Blog Post"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-submit"
            aria-label="Shorten URL"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-sm" aria-hidden="true"></span>
                <span>Creating link...</span>
              </>
            ) : (
              <span>Create short link</span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
