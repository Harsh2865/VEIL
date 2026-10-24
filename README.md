# URL Shortener (Bitly-style)

A full-stack, production-grade URL shortener application built with React (Vite), Node.js, Express, and MongoDB (Mongoose).

---

## 🚀 Features

### Tier 0 (Core Requirements)
- **High-throughput URL Shortening**: Encodes URLs using cryptographically unbiased base62 generation with bounded collision retries.
- **Atomic 302 Redirection**: Direct 302 redirects executed in a single atomic database operation (`findOneAndUpdate`) that increments click counts and sets timestamps without race conditions.
- **Cache-Busting Headers**: Sends `Cache-Control: no-store` to prevent browsers and proxies from under-counting redirection requests.
- **Client ID Session History**: Automatically maintains anonymous history in MongoDB associated with a persistent UUID v4 `X-Client-Id`.
- **Copy-to-Clipboard with Fallback**: Uses `navigator.clipboard` in secure contexts, falling back to an accessible read-only selection prompt when clipboard access is unavailable or denied.
- **Atomic Click Tracking**: Real-time counter of total successful redirects.

### Tier 1 (Approved MVP Enhancements)
- **Custom Short Code Aliases**: Supports custom slugs (3–30 characters) with real-time, debounced availability checking.
- **Optional Link Labels**: Allows custom titles (up to 80 characters) for quick identification in history.
- **Client-Side Search & Sort**: Real-time filtering by original URL, short code, or label; sort by newest or most clicks among loaded links.
- **Own-Link Deletion**: Full deletion control with an inline two-step confirmation flow (`DELETE /api/urls/:id`).
- **Cursor Pagination**: Opaque Base64 cursors (`{createdAt, _id}`) for scalable, performant pagination.
- **Accessible & Responsive UX**: Full dark mode (`prefers-color-scheme`), visible focus rings, ARIA live regions (`aria-live="polite"`), and non-overflowing responsive card layout for 360px mobile up to 1280px desktop.

---

## 🏗️ Architecture & Data Flow

```
[Browser Client]
       │
       ├──── GET /s/:code ─────────────────────► [Express Redirection Engine]
       │                                                      │
       │                                                      ├─ Atomic $inc clickCount
       │                                                      └─ 302 Redirect to Original URL
       │
       ├──── REST API (HTTP/JSON) ─────────────► [Express REST API]
       │     (Header: X-Client-Id: <UUIDv4>)                  │
       │                                                      ├─ Zod & Security Validation
       │                                                      ├─ Strict/Moderate Rate Limiting
       │                                                      └─ Mongoose Queries
       │                                                              │
       └──────────────────────────────────────────────────────┴─► [MongoDB: shorturls]
```

### Data Model (`shorturls`)
```json
{
  "originalUrl": "https://example.com/target-page",
  "shortCode": "aB91xZ3",
  "label": "Marketing Page",
  "clientId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "clickCount": 42,
  "createdAt": "2026-10-24T10:00:00.000Z",
  "lastClickedAt": "2026-10-24T10:45:00.000Z"
}
```
- **Indexes**:
  - Unique index: `{ shortCode: 1 }`
  - Compound pagination index: `{ clientId: 1, createdAt: -1, _id: -1 }`

---

## 🛠️ Tech Stack & Folder Structure

- **Frontend**: React 19, Vite 6, Vanilla CSS (Design Tokens, Dark Mode, Accessible Contrast), Vitest, React Testing Library.
- **Backend**: Node.js (ES Modules), Express 4, Mongoose 8, Zod, Helmet, CORS, Express-Rate-Limit, Vitest, Supertest, MongoMemoryServer.

```
url-shortener/
├── client/
│   ├── src/
│   │   ├── api/urlApi.js             # Centralized API layer with X-Client-Id
│   │   ├── components/               # CreateUrlForm, ShortUrlResult, UrlHistory, etc.
│   │   ├── hooks/                    # useClientId, useUrlHistory
│   │   ├── utils/validators.js       # Client validation logic
│   │   ├── App.jsx                   # Main layout container
│   │   ├── main.jsx                  # React DOM entry
│   │   └── index.css                 # Design system & styles
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/env.js             # Zod environment validation
│   │   ├── config/db.js              # Database connection manager
│   │   ├── controllers/              # urlController, redirectController
│   │   ├── middleware/               # errorHandler, rateLimiters, clientId
│   │   ├── models/ShortUrl.js        # Mongoose data schema & indexes
│   │   ├── routes/                   # API and redirect routes
│   │   ├── services/                 # Short URL creation & cursor pagination
│   │   ├── utils/                    # Base62 generator, validators, reserved words
│   │   ├── app.js                    # Express app configuration
│   │   └── server.js                 # Server entrypoint with graceful shutdown
│   ├── tests/                        # Vitest & Supertest test suites
│   └── package.json
├── docs/                             # Architecture specifications
├── package.json                      # Monorepo root scripts
└── README.md
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port for the Express server |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/url_shortener` | MongoDB connection URI |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `PUBLIC_SHORT_URL_BASE` | `http://localhost:5000` | Base URL used to assemble shortened URLs |
| `TRUST_PROXY` | `0` | Reverse proxy trust setting for rate limiting |

### Client (`client/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000` | Target URL for backend REST calls |

---

## 🚦 Verified Commands

All commands below have been tested and verified:

```bash
# Install dependencies in both workspaces
npm --prefix server install
npm --prefix client install

# Run all automated tests (61 tests across backend & frontend)
npm test

# Run backend tests only
npm --prefix server test

# Run frontend tests only
npm --prefix client test

# Run code linter across the entire project
npm run lint

# Build production frontend bundle
npm run build

# Start backend development server
npm run dev:server

# Start frontend development server (Vite)
npm run dev:client
```

---

## 📡 API Specification

All `/api/*` endpoints respond with JSON. Every `/api/urls*` route requires the header `X-Client-Id: <UUIDv4>`.

### Standard Error Shape
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Enter a valid HTTP or HTTPS URL."
  }
}
```
**Error Codes**: `VALIDATION_ERROR` (400), `INVALID_CLIENT_ID` (400), `NOT_FOUND` (404), `CODE_TAKEN` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500), `SERVICE_UNAVAILABLE` (503).

### Endpoints
- **POST `/api/urls`**
  - **Body**: `{ "url": "https://example.com", "customCode": "custom-alias", "label": "My Link" }`
  - **Status**: `201 Created`
  - **Response**: `{ "id": "...", "originalUrl": "...", "shortCode": "custom-alias", "label": "...", "shortUrl": "http://localhost:5000/s/custom-alias", "clickCount": 0, "createdAt": "...", "lastClickedAt": null }`
- **GET `/api/urls?limit=20&cursor=<base64>`**
  - **Status**: `200 OK`
  - **Response**: `{ "items": [...], "nextCursor": "<base64>" | null }`
- **DELETE `/api/urls/:id`**
  - **Status**: `204 No Content` (404 if not found or unauthorized)
- **GET `/api/codes/:code/available`**
  - **Status**: `200 OK`
  - **Response**: `{ "available": true }` or `{ "available": false, "reason": "taken" | "reserved" | "invalid" }`
- **GET `/s/:code`**
  - **Status**: `302 Found` with `Cache-Control: no-store` and `Location: <originalUrl>`
  - **Not Found**: Returns friendly HTML 404 page.
- **GET `/api/health`**
  - **Status**: `200 OK` `{ "status": "ok" }` when database is connected, `503` `{ "status": "unavailable" }` if database is down.

---

## 🔒 Security, Abuse, & Limitations

1. **Anonymous Client IDs**: Client IDs (`X-Client-Id`) are generated client-side via `crypto.randomUUID()` and stored in `localStorage`. This is a convenience mechanism to persist history per browser profile without forcing user registration; it is not an authentication security boundary.
2. **Click Counts**: Each successful `GET /s/:code` increment is counted atomically. Automated bots, link previews, and repeated refreshes can register clicks. Click count represents total redirect dispatches, not unique visitors.
3. **Abuse Prevention**: Embedded user credentials (`user:pass@host`), non-HTTP schemes (`javascript:`, `data:`, `file:`), and self-referencing links matching the shortener host are rejected. Rate limiters protect creation, deletion, availability checks, and redirection.
4. **No Secret Leakage**: Database connection strings, stack traces, and internal errors are suppressed from API responses.

---

## 🚢 Deployment Notes

- **Frontend**: Deploy `client` static output (`dist/`) to Vercel, Netlify, or Cloudflare Pages. Set `VITE_API_BASE_URL` to the public backend domain.
- **Backend**: Deploy `server` to a Node.js runtime host (e.g., Render, Railway, AWS ECS, Fly.io).
- **Environment**:
  - `FRONTEND_ORIGIN`: Must be set to the exact deployed client origin (e.g., `https://myapp.vercel.app`).
  - `PUBLIC_SHORT_URL_BASE`: Must be set to the public backend URL (e.g., `https://api.myapp.com`).
  - `TRUST_PROXY`: Set according to reverse proxy topology (e.g., `1` for single hop proxy).
