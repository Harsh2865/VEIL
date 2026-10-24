import { incrementAndGetOriginalUrl } from '../services/shortUrlService.js';
import { env } from '../config/env.js';

function renderNotFoundHtml(code) {
  const safeCode = (code || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Not Found - URL Shortener</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --border: #334155;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card-bg: #ffffff;
        --text-main: #0f172a;
        --text-muted: #64748b;
        --primary: #0284c7;
        --border: #e2e8f0;
      }
    }
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-sizing: border-box;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2.5rem;
      max-width: 440px;
      margin: 1.5rem;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
    }
    h1 {
      margin-top: 0;
      font-size: 1.75rem;
      font-weight: 700;
    }
    p {
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .code-badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      background: rgba(56, 189, 248, 0.1);
      border-radius: 4px;
      font-family: monospace;
      color: var(--primary);
    }
    a.btn {
      display: inline-block;
      background: var(--primary);
      color: #ffffff;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: opacity 0.15s ease;
    }
    a.btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>404 - Link Not Found</h1>
    <p>The short link ${safeCode ? `<span class="code-badge">/s/${safeCode}</span>` : ''} does not exist, has expired, or was removed by its owner.</p>
    <a href="${env.FRONTEND_ORIGIN}" class="btn">Create Your Own Short Link</a>
  </main>
</body>
</html>`;
}

export async function handleRedirect(req, res, next) {
  try {
    const { code } = req.params;

    const originalUrl = await incrementAndGetOriginalUrl(code);

    if (!originalUrl) {
      return res.status(404).set('Content-Type', 'text/html').send(renderNotFoundHtml(code));
    }

    // Set cache prevention headers so clicks are counted accurately
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    // 302 Found redirect to stored original URL
    return res.redirect(302, originalUrl);
  } catch (err) {
    next(err);
  }
}
