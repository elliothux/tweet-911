# Tweet 911

Chrome extension + Cloudflare Worker that scores X posts, articles, and replies for:

- **AI-written** — classic LLM tells
- **色情引流 / porn solicitation** — sexual traffic bait, offline meetup invites, cross-platform redirects (快手等)
- **Paraphrase-bot comments** — replies that mostly restate the parent post

Judgment uses **author profile signals + post/comment text together** (handle, display name, bio when available, text, and parent post for replies).

Click a small **911** button on a tweet or reply → extract text + image URLs + author → `POST /v1/score` on your Worker → TypeSafe **Jev** via `https://api.typesafe.ai/v1/systemone`.

**Architecture:** the Worker API is the product (`content → score`). The extension is a thin on-demand client. Nothing calls `api.typesafe.ai` from the browser.

```
┌─────────────┐     POST /v1/score      ┌──────────────────┐
│  Extension  │ ───────────────────────► │ CF Worker        │
│  (MV3)      │ ◄─────────────────────── │  → TypeSafe Jev  │
└─────────────┘   { ai_written, … }      └──────────────────┘
```

## Repo layout

```
tweet-911/
├── worker/          Cloudflare Worker (TypeScript)
├── extension/       Chrome MV3 extension (X only)
└── README.md
```

## Worker

```bash
cd worker
npm install
npm test          # vitest + mocked TypeSafe fetch (no CF account needed)
npm run dev       # wrangler dev
npm run deploy    # wrangler deploy
```

### Config

- `wrangler.jsonc` — worker name `tweet-911`; KV binding `KV`; var `TYPESAFE_MODEL=jev-latest`
- Required: `npx wrangler secret put TYPESAFE_API_KEY`
- Optional Worker client auth: `npx wrangler secret put API_KEY`  
  When set, clients must send `Authorization: Bearer <key>` or `X-API-Key: <key>`.  
  When unset, the API is open (convenient for local/dev).
- Copy `.dev.vars.example` → `.dev.vars` for local secrets.

### Routes

| Method | Path | Body / notes |
|--------|------|----------------|
| `GET` | `/health` | `{ "ok": true }` |
| `POST` | `/v1/score` | see below |
| `OPTIONS` | `*` | CORS preflight (reflects `chrome-extension://` and localhost Origins) |

**Request body:**

```json
{
  "text": "…",
  "images": ["https://…"],
  "url": "https://x.com/user/status/123",
  "kind": "tweet",
  "platform": "x",
  "author": {
    "handle": "@user",
    "display_name": "User",
    "bio": "optional bio"
  },
  "in_reply_to": {
    "author": { "handle": "@op" },
    "text": "parent tweet text"
  }
}
```

- `url` is **required** (cache key).
- `kind`: `"tweet" | "article" | "reply"` (optional).
- `platform`: only `"x"` (LinkedIn removed).
- `author`: object preferred; a string is still accepted for backward compatibility.
- `in_reply_to`: parent tweet for replies (needed for `paraphrase_bot`).

**Validation:** non-empty `text` **or** at least one image URL; valid http(s) `url`.

**Response example:**

```json
{
  "ai_written": 0.87,
  "porn_solicitation": 0.12,
  "paraphrase_bot": 0.08,
  "risk_score": 0.4,
  "risk_confidence": 0.8,
  "ai_label": "likely_ai",
  "solicitation_label": "likely_clean",
  "paraphrase_label": "likely_original",
  "label": "likely_ai",
  "quote": "It's not just a tool. It's a paradigm shift…",
  "cache": {
    "hit": false,
    "key": "cache:url:…",
    "source_url": "https://x.com/user/status/123",
    "cached_at": "2026-09-20T05:00:00.000Z"
  },
  "rate_limit": {
    "limit": 30,
    "remaining": 29,
    "used": 1,
    "reset": "2026-09-21T00:00:00.000Z",
    "day": "2026-09-20"
  },
  "model": "jev-1.13.0",
  "usage": { "input_tokens": 100, "output_tokens": 40 }
}
```

**Labels** (noul thresholds 0.65 / 0.35):

| Field | High | Mid | Low |
|-------|------|-----|-----|
| `ai_label` | `likely_ai` | `uncertain` | `likely_human` |
| `solicitation_label` | `likely_solicitation` | `uncertain` | `likely_clean` |
| `paraphrase_label` | `likely_paraphrase` | `uncertain` | `likely_original` |

`label` is a backward-compat alias of `ai_label`.

Optional `risk_score` (Jev score): Clean / Suspicious / Clear spam-bait.

### Cache & rate limit

- **Cache key:** normalized source `url` (required). Hits skip TypeSafe.
- **Response extras:** `quote`, `cache`, `rate_limit`.
- **Rate limit:** 30 requests per client IP per UTC day (`CF-Connecting-IP`). Exceeded → HTTP `429`.
- **Storage:** Workers KV binding `KV` (same namespace ids as before).

### TypeSafe API key

The Worker calls TypeSafe directly (same path as [sift](https://github.com/bohutang/sift)). Set the secret:

```bash
cd worker
npx wrangler secret put TYPESAFE_API_KEY
```

Optional: `TYPESAFE_MODEL` (default `jev-latest` via wrangler vars).

### curl

```bash
curl -sS https://tweet-911.hqy841440305.workers.dev/v1/score \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -d '{
    "text": "It'\''s not just a tool. It'\''s a paradigm shift that will redefine the landscape.",
    "platform": "x",
    "kind": "tweet",
    "url": "https://x.com/example/status/1",
    "author": { "handle": "@example", "display_name": "Example" }
  }'
```

Health:

```bash
curl -sS https://tweet-911.hqy841440305.workers.dev/health
```

## Extension

1. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the `extension/` folder.
2. Open the extension **Options** page and set:
   - **API base URL** — default `https://tweet-911.hqy841440305.workers.dev` (no trailing slash)
   - **API key** — only if you set `API_KEY` on the Worker
3. Visit [x.com](https://x.com). On each tweet **and reply**, click **911** (on-demand only — nothing is auto-scored).
4. A badge summarizes flags, e.g. `AI 87%` / `AI 80% · 引流 90%` / `Clean`.

### Host permissions

`manifest.json` includes `https://*.workers.dev/*` plus localhost. If you put the Worker on a **custom domain**, add that origin to `host_permissions` (or use Chrome’s optional host access) and reload the extension.

### Selectors

- **X / Twitter:** `article[data-testid="tweet"]`, text `tweetText`, images `tweetPhoto`, author `User-Name`.
- On status pages, replies include `in_reply_to` from the focal (first) tweet when possible.
- LinkedIn support has been removed.

## License

MIT (or your choice when publishing).
