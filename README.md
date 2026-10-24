# VEIL — URL Shortener

A modern, full-stack URL shortening service engineered with React, Vite, Node.js, Express, and MongoDB Atlas. VEIL delivers high-throughput link compression, cryptographically unbiased short-code generation, atomic redirect dispatch, real-time click tracking, and client-scoped session history without requiring user registration.

---

## 🔗 Project Links

| Resource | URL | Description |
|---|---|---|
| **Live Application** | [https://veil-alpha-ten.vercel.app/](https://veil-alpha-ten.vercel.app/) | Production frontend deployed on Vercel |
| **API Base URL** | [https://veil-api-cqoi.onrender.com](https://veil-api-cqoi.onrender.com/) | Production REST API deployed on Render |
| **Backend Health Check** | [https://veil-api-cqoi.onrender.com/api/health](https://veil-api-cqoi.onrender.com/api/health) | Live service & database health endpoint |
| **Source Code Repository** | [https://github.com/Harsh2865/VEIL](https://github.com/Harsh2865/VEIL) | Public GitHub repository |

---

## 📖 Overview

VEIL solves the problem of long, unwieldy URLs by converting them into compact, shareable links while providing detailed real-time engagement analytics.

The system operates across four primary layers:
1. **Frontend Client**: A single-page application built with React 19 and Vite 6, styled with vanilla CSS design tokens, providing instant feedback, optimistic state management, debounced availability checks, and accessible clipboard interactions.
2. **REST API Service**: An Express 4 application handling validation, rate limiting, and CRUD operations for links associated with persistent anonymous browser identities.
3. **Redirection Engine**: A dedicated high-performance redirect route (`/s/:code`) that atomically increments click counts, sets last-clicked timestamps, and issues HTTP 302 redirects accompanied by strict cache-busting headers.
4. **Database Storage**: MongoDB Atlas with compound indexes optimized for unique slug resolution and cursor-based historical pagination.

---

## ✨ Features

- **High-Entropy Short URL Creation**: Automatically generates compact 7-character short codes using cryptographically unbiased Base62 random sampling with bounded collision retry handling.
- **Custom Code Aliases**: Supports custom slugs (3–30 characters, alphanumeric with hyphens and underscores).
- **Real-Time Alias Availability**: Instant debounced checks verify whether a custom slug is valid, taken, or reserved before submission.
- **Optional Link Labels**: Allows custom descriptors (up to 80 characters) to organize and identify links in session history.
- **Strict Security Validation**: Enforces HTTP/HTTPS protocols, rejects embedded user credentials (`user:pass@host`), prohibits self-referencing redirect loops, and bounds URL lengths to 2048 characters.
- **Atomic 302 Redirection**: Dispatches redirects in a single atomic database update (`findOneAndUpdate`) with `$inc` to eliminate race conditions under concurrent access.
- **Accurate Click Accounting**: Employs `Cache-Control: no-store` headers to prevent intermediary browser or CDN caching from swallowing redirect click events.
- **Anonymous Browser Session History**: Persists link ownership locally and in MongoDB via a persistent UUID v4 `X-Client-Id` header without requiring login credentials.
- **Automatic Click Polling**: History updates click counts silently every 5 seconds when the browser tab is active, pausing automatically when the tab is backgrounded.
- **Cursor-Based Pagination**: Employs opaque Base64 compound cursors (`{createdAt, _id}`) for stable, high-performance pagination across link collections.
- **Client-Side Search & Sorting**: Real-time keyword filtering across loaded links by destination URL, short code, or label, with sorting by newest creation or total clicks.
- **Own-Link Deletion**: Two-step inline confirmation flow allowing users to remove their links with server-side client-ownership verification.
- **Clipboard Management with Fallback**: Uses `navigator.clipboard` in secure contexts with an accessible, keyboard-focused manual copy modal fallback.
- **Accessible & Responsive Interface**: WCAG-compliant color contrast, visible focus rings, ARIA live regions for screen reader announcements, and a fluid layout tailored for screens from 360px mobile to 4K desktop.

---

## 🏛️ Architecture

```mermaid
flowchart TD
    subgraph Browser["User Browser"]
        SPA["React 19 Frontend (Vite)"]
        LocalStorage[("localStorage (UUID Client ID)")]
    end

    subgraph Hosting["Cloud Infrastructure"]
        Vercel["Vercel (Frontend Static CDN)"]
        Render["Render (Express Web Service)"]
        Atlas[("MongoDB Atlas (Mongoose Database)")]
    end

    SPA -->|Serves Static Bundle| Vercel
    SPA <-->|Persists Anonymous ID| LocalStorage
    SPA -->|REST API Requests with X-Client-Id| Render

    Visitor(["Redirect Visitor / Web Crawler"]) -->|GET /s/:code| Render
    Render -->|Atomic Increment & Fetch| Atlas
    Render -->|302 Redirect (Location: Destination)| Visitor
```

### Component Responsibilities

- **React 19 SPA (Vercel)**: Manages UI state, debounced validation inputs, clipboard fallbacks, local search/sort filtering, and background polling.
- **Express API (Render)**: Enforces security headers (Helmet), IP-based rate limiting, Zod schema validation, CORS origin verification, and client identity verification.
- **Express Redirection Route (Render)**: Processes `/s/:code`, executes atomic updates against MongoDB, and sends non-cached 302 redirects or accessible HTML 404 error pages.
- **MongoDB Atlas**: Stores documents in the `shorturls` collection with a unique index on `shortCode` and a compound index on `{ clientId: 1, createdAt: -1, _id: -1 }`.

---

## 💻 Technology Stack

### Frontend
- **Framework**: React `19.0.0`
- **Build Tool**: Vite `6.1.0`
- **Styling**: Vanilla CSS with custom CSS variables and responsive design tokens
- **Testing**: Vitest `3.0.5`, React Testing Library `16.2.0`, Jest DOM `6.6.3`, JSDOM `26.0.0`
- **Code Quality**: ESLint `9.20.1`, Prettier `3.5.1`

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express `4.21.2`
- **Database ODM**: Mongoose `8.10.1`
- **Configuration Validation**: Zod `3.24.2`
- **Security & Utilities**: Helmet `8.0.0`, CORS `2.8.5`, Express Rate Limit `7.5.0`, Dotenv `16.4.7`
- **Testing**: Vitest `3.0.5`, Supertest `7.0.0`, MongoMemoryServer `10.1.4`

---

## 🚀 Live Deployment

VEIL is deployed across modern cloud platforms:

| Component | Platform | URL | Purpose |
|---|---|---|---|
| **Frontend** | [Vercel](https://vercel.com/) | [https://veil-alpha-ten.vercel.app/](https://veil-alpha-ten.vercel.app/) | Global edge hosting for React static assets |
| **Backend API** | [Render](https://render.com/) | [https://veil-api-cqoi.onrender.com](https://veil-api-cqoi.onrender.com/) | Managed Node.js web service |
| **Health Check** | [Render](https://render.com/) | [https://veil-api-cqoi.onrender.com/api/health](https://veil-api-cqoi.onrender.com/api/health) | Uptime and MongoDB connection check |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) | *Private managed cluster* | Managed cloud document database |

> **Note on Render Free Tier:** Because the backend is hosted on Render's free tier, the instance automatically spins down after 15 minutes of inactivity. The first request after dormancy may experience a cold-start delay of 30–60 seconds while the server container boots.

---

## 🛠️ Getting Started Locally

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **MongoDB**: A running local MongoDB instance (`mongodb://127.0.0.1:27017`) or a free MongoDB Atlas connection URI

### 1. Clone the Repository
```powershell
git clone https://github.com/Harsh2865/VEIL.git
Set-Location VEIL
```
*(POSIX / macOS / Linux equivalent: `cd VEIL`)*

### 2. Install Dependencies
Install dependencies for both the frontend and backend workspaces:
```powershell
npm --prefix server install
npm --prefix client install
```

### 3. Configure Environment Variables
Copy the template files to create local `.env` files:

**PowerShell:**
```powershell
Copy-Item client/.env.example client/.env
Copy-Item server/.env.example server/.env
```

**Bash / POSIX:**
```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Verify that `server/.env` contains your MongoDB connection string (defaulting to local MongoDB):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/url_shortener
FRONTEND_ORIGIN=http://localhost:5173
PUBLIC_SHORT_URL_BASE=http://localhost:5000
TRUST_PROXY=0
```

Verify that `client/.env` points to the local backend:
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 4. Run the Development Servers
You can run both workspaces concurrently or in separate terminals.

**Terminal 1 (Backend):**
```powershell
npm run dev:server
```
*Backend starts on `http://localhost:5000` with hot-reload enabled.*

**Terminal 2 (Frontend):**
```powershell
npm run dev:client
```
*Vite dev server starts on `http://localhost:5173`.*

Open your browser to `http://localhost:5173` to use VEIL.

---

## ⚙️ Environment Variables

### Frontend (`client/.env`)

| Variable | Required in Production | Default (Local Dev) | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | `http://localhost:5000` | Target URL for backend REST API calls. Must be set prior to running `npm run build` on Vercel. |

### Backend (`server/.env`)

All backend variables are validated at startup via Zod in `server/src/config/env.js`.

| Variable | Required in Production | Default (Local Dev) | Description |
|---|---|---|---|
| `PORT` | Auto-set by host | `5000` | Port on which the Express server listens. |
| `NODE_ENV` | **Yes** | `development` | Environment mode (`development`, `production`, `test`). |
| `MONGODB_URI` | **Yes** | `mongodb://127.0.0.1:27017/url_shortener` | MongoDB connection URI. Never commit this to source control. |
| `FRONTEND_ORIGIN` | **Yes** | `http://localhost:5173` | Allowed CORS origin. In production, set to exact frontend domain (e.g. `https://veil-alpha-ten.vercel.app`). |
| `PUBLIC_SHORT_URL_BASE` | **Yes** | `http://localhost:5000` | Base URL used to prefix generated short links (e.g. `https://veil-api-cqoi.onrender.com`). |
| `TRUST_PROXY` | **Yes** | `0` | Reverse proxy trust configuration for Express Rate Limit (`1` on Render or reverse proxy environments). |

---

## 📡 API Documentation

All REST endpoints reside under the `/api` namespace and return JSON. Redirection endpoints reside under `/s`.

### Authentication & Client Identity
VEIL does not use passwords or accounts. Instead, client-specific endpoints require an `X-Client-Id` request header containing a valid UUID v4. This associates URLs with an anonymous browser session.

---

### 1. Service Health Check
Verify API status and MongoDB connection readiness.

- **Method**: `GET`
- **Path**: `/api/health`
- **Headers**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "status": "ok"
  }
  ```
- **Error Response (`503 Service Unavailable`)**:
  ```json
  {
    "status": "unavailable"
  }
  ```

---

### 2. Create Shortened URL
Create a new shortened link with an optional custom alias and label.

- **Method**: `POST`
- **Path**: `/api/urls`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Client-Id: <UUIDv4>` (Required)
- **Request Body**:
  ```json
  {
    "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    "customCode": "mdn-js",
    "label": "MDN JavaScript Docs"
  }
  ```
  *(Note: `customCode` and `label` are optional).*
- **Success Response (`201 Created`)**:
  ```json
  {
    "id": "671ad45e12a4b8c9d0123456",
    "originalUrl": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    "shortCode": "mdn-js",
    "label": "MDN JavaScript Docs",
    "shortUrl": "https://veil-api-cqoi.onrender.com/s/mdn-js",
    "clickCount": 0,
    "createdAt": "2026-10-25T02:00:00.000Z",
    "lastClickedAt": null
  }
  ```
- **Rate Limit**: 20 requests per 15 minutes per IP.
- **Error Responses**:
  - `400 Bad Request` (`VALIDATION_ERROR`): Invalid URL, length > 2048, or invalid custom code.
  - `400 Bad Request` (`INVALID_CLIENT_ID`): Missing or non-UUID `X-Client-Id`.
  - `409 Conflict` (`CODE_TAKEN`): The requested custom code is already in use.
  - `429 Too Many Requests` (`RATE_LIMITED`): Creation rate limit exceeded.

---

### 3. List Link History
Retrieve paginated links created by the current client ID.

- **Method**: `GET`
- **Path**: `/api/urls`
- **Headers**:
  - `X-Client-Id: <UUIDv4>` (Required)
- **Query Parameters**:
  - `limit` (Optional, integer 1–50, default `20`)
  - `cursor` (Optional, opaque Base64 string from previous response)
- **Success Response (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "id": "671ad45e12a4b8c9d0123456",
        "originalUrl": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
        "shortCode": "mdn-js",
        "label": "MDN JavaScript Docs",
        "shortUrl": "https://veil-api-cqoi.onrender.com/s/mdn-js",
        "clickCount": 14,
        "createdAt": "2026-10-25T02:00:00.000Z",
        "lastClickedAt": "2026-10-25T02:28:14.000Z"
      }
    ],
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTI1VDAyOjAwOjAwLjAwMFoiLCJfaWQiOiI2NzFhZDQ1ZTEyYTRiOGM5ZDAxMjM0NTYifQ=="
  }
  ```
- **Rate Limit**: 60 requests per 15 minutes per IP.

---

### 4. Delete URL
Delete a shortened URL belonging to the caller's client ID.

- **Method**: `DELETE`
- **Path**: `/api/urls/:id`
- **Headers**:
  - `X-Client-Id: <UUIDv4>` (Required)
- **Path Parameters**:
  - `id`: MongoDB ObjectId string
- **Success Response (`204 No Content`)**: Empty response body.
- **Error Responses**:
  - `404 Not Found` (`NOT_FOUND`): URL does not exist or was not created by this client ID.
  - `429 Too Many Requests` (`RATE_LIMITED`): Delete rate limit exceeded.

---

### 5. Check Custom Code Availability
Advisory check to determine if a short-code slug is available.

- **Method**: `GET`
- **Path**: `/api/codes/:code/available`
- **Headers**: None
- **Success Response — Available (`200 OK`)**:
  ```json
  {
    "available": true
  }
  ```
- **Success Response — Unavailable (`200 OK`)**:
  ```json
  {
    "available": false,
    "reason": "taken"
  }
  ```
  *(Other reasons include `"reserved"` or `"invalid"`).*
- **Rate Limit**: 60 requests per 15 minutes per IP.

---

### 6. Redirect to Destination URL
Perform an atomic redirect dispatch to the target destination.

- **Method**: `GET`
- **Path**: `/s/:code`
- **Headers**: None
- **Success Response (`302 Found`)**:
  - Redirects browser to original destination URL (`Location: <destinationUrl>`).
  - Response headers include:
    ```http
    Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
    Pragma: no-cache
    Expires: 0
    ```
- **Not Found Response (`404 Not Found`)**:
  - Content-Type: `text/html; charset=utf-8`
  - Returns a styled, responsive 404 error page with a direct link back to the frontend application.
- **Rate Limit**: 600 requests per 15 minutes per IP.

---

### Standard Error Response Format
All `/api/*` endpoints return structured errors adhering to this schema:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Enter a valid HTTP or HTTPS URL."
  }
}
```

---

## 🗄️ Data Model & Persistence

Documents are stored in MongoDB Atlas inside the `shorturls` collection via Mongoose:

```javascript
{
  originalUrl: { type: String, required: true, maxlength: 2048, trim: true },
  shortCode: { type: String, required: true, unique: true, trim: true },
  label: { type: String, maxlength: 80, trim: true, default: null },
  clientId: { type: String, required: true, trim: true },
  clickCount: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
  lastClickedAt: { type: Date, default: null }
}
```

### Database Indexes
- `{ shortCode: 1 }` (Unique): Ensures global uniqueness for custom and generated short codes.
- `{ clientId: 1, createdAt: -1, _id: -1 }` (Compound): Powers performant, leak-free cursor pagination sorted newest-first for client link histories.

### Key Behavioral Guarantees
- **Slug Uniqueness**: Generated codes use rejection sampling over Base62 (`[0-9A-Za-z]`) rejecting values `>= 248` to prevent modulo bias. If a generated collision occurs, up to 5 bounded retries are executed before failing safely.
- **Atomic Counters**: Click counts are updated using MongoDB's `$inc` operator within `findOneAndUpdate`. No in-memory state is maintained on the web server, enabling multi-instance horizontal scaling without counter race conditions.
- **Click Tracking Scope**: The counter records total redirect dispatches, including web crawlers, messaging bot link unfurlers (e.g., Slack/Discord), and repeat browser visits. It does not measure unique human visitors.
- **Client ID Boundary**: The `X-Client-Id` header provides client-side profile persistence across sessions without user friction. It is a convenience identifier, not an authenticated cryptographic security token.

---

## 🧪 Testing & Code Quality

The project includes unit and integration tests across both workspaces using Vitest, Supertest, and React Testing Library.

```powershell
# Run the entire test suite (66 tests across backend and frontend)
npm test

# Run backend tests only (52 tests: API, validation, rate limiting, and database operations)
npm --prefix server test

# Run frontend tests only (14 tests: form handling, clipboard, polling, and history)
npm --prefix client test

# Run ESLint across both frontend and backend
npm run lint

# Validate frontend production compilation
npm run build
```

---

## 📂 Repository Structure

```text
VEIL/
├── client/                           # Frontend React 19 application
│   ├── src/
│   │   ├── api/urlApi.js             # Centralized API client with X-Client-Id injection
│   │   ├── components/               # UI components (CreateUrlForm, UrlHistory, CopyButton)
│   │   ├── hooks/                    # Custom hooks (useClientId, useUrlHistory)
│   │   ├── utils/validators.js       # Client validation mirrors
│   │   ├── App.jsx                   # Primary layout container
│   │   ├── index.css                 # Design token system and responsive layout rules
│   │   └── main.jsx                  # React DOM mount point
│   ├── vite.config.js                # Vite build and test configuration
│   ├── eslint.config.js              # Frontend linting rules
│   └── package.json                  # Frontend dependencies
├── server/                           # Backend Node.js / Express application
│   ├── src/
│   │   ├── config/env.js             # Zod environment variable validation
│   │   ├── config/db.js              # Mongoose connection lifecycle manager
│   │   ├── controllers/              # urlController, redirectController
│   │   ├── middleware/               # errorHandler, rateLimiters, clientId validator
│   │   ├── models/ShortUrl.js        # Mongoose data schema & indexes
│   │   ├── routes/                   # API (/api) and Redirection (/s) route declarations
│   │   ├── services/                 # ShortUrl generation, pagination, and atomic increment
│   │   ├── utils/                    # Base62 generator, reserved slugs, URL validators
│   │   ├── app.js                    # Express app setup and middleware assembly
│   │   └── server.js                 # HTTP listener with graceful shutdown
│   ├── tests/                        # Vitest & Supertest integration test suites
│   ├── eslint.config.js              # Backend linting rules
│   └── package.json                  # Backend dependencies
├── docs/
│   └── ARCHITECTURE.md               # Architectural notes
├── .gitignore                        # Strict ignore rules (.env, node_modules, build outputs)
├── .prettierrc                       # Code formatting specifications
├── package.json                      # Monorepo workspace runner scripts
└── README.md                         # Project documentation
```

---

## 🔒 Security & Limitations

1. **Environment Hygiene**: All real environment files (`client/.env`, `server/.env`) are strictly ignored by `.gitignore`. Example templates (`.env.example`) contain only safe local development placeholders.
2. **Abuse Mitigation**: Express Rate Limit enforces discrete IP-based buckets across URL creation, custom code lookup, and redirect routing to prevent abuse.
3. **Payload Sanitization**: Payloads are capped at `10kb` via `express.json({ limit: '10kb' })`. Incoming URLs must match strict RFC-compliant HTTP/HTTPS patterns without embedded authentication tokens.
4. **No Authentication Boundary**: Link ownership is scoped to the browser's `localStorage` client UUID. Clearing site data creates a new client identity and resets visible local history.
5. **Hosting Cold Starts**: The backend runs on Render's free tier. Idle instances sleep after inactivity, leading to initial request latency while booting.

---

## 🤝 Contributing

Contributions are welcome. To propose changes:

1. Fork the repository on GitHub.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Make focused, well-documented changes.
4. Verify tests and linting pass:
   ```powershell
   npm test
   npm run lint
   ```
5. Commit your changes using conventional commit messages.
6. Push to your fork and submit a Pull Request.

---

## 📄 License

No license has been specified. All rights are reserved by the author.
