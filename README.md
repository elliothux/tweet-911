# Slop 911

Chrome extension + Cloudflare Worker that scores whether an X or LinkedIn post looks AI-written.

Click a small **911** button on a post → extract text + image URLs → `POST /v1/score` on your Worker → TypeSafe **Jev** (`typesafe/jev` on Workers AI) returns a calibrated probability and label.

**Architecture:** the Worker API is the product (`content → score`). The extension is a thin on-demand client. Nothing calls `api.typesafe.ai`.

```
┌─────────────┐     POST /v1/score      ┌──────────────────┐
│  Extension  │ ───────────────────────► │ CF Worker        │
│  (MV3)      │ ◄─────────────────────── │  env.AI → Jev    │
└─────────────┘   { ai_written, label }  └──────────────────┘
```

## Repo layout

```
slop-911/
├── worker/          Cloudflare Worker (TypeScript)
├── extension/       Chrome MV3 extension
└── README.md
```

## Worker

```bash
cd worker
npm install
npm test          # vitest + mocked AI binding (no CF account needed)
npm run dev       # wrangler dev
npm run deploy    # wrangler deploy
```

### Config

- `wrangler.jsonc` — AI binding `{ "binding": "AI", "type": "ai" }` (declared as `"ai": { "binding": "AI" }`)
- Optional auth: `npx wrangler secret put API_KEY`  
  When set, clients must send `Authorization: Bearer <key>` or `X-API-Key: <key>`.  
  When unset, the API is open (convenient for local/dev).
- Copy `.dev.vars.example` → `.dev.vars` for local secrets.

### Routes

| Method | Path | Body / notes |
|--------|------|----------------|
| `GET` | `/health` | `{ "ok": true }` |
| `POST` | `/v1/score` | `{ text, images?, platform?, author?, url? }` |
| `OPTIONS` | `*` | CORS preflight (reflects `chrome-extension://` and localhost Origins) |

**Validation:** non-empty `text` **or** at least one image URL.

**Response example:**

```json
{
  "ai_written": 0.87,
  "score": 1.8,
  "confidence": 0.91,
  "label": "likely_ai",
  "model": "jev-1.13.0",
  "usage": { "input_tokens": 100, "output_tokens": 40 }
}
```

Labels: `likely_ai` (noul ≥ 0.65), `likely_human` (≤ 0.35), else `uncertain`.

### AI Gateway credits (required for Jev)

`typesafe/jev` is a **third-party** Workers AI model. It bills through [AI Gateway Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/). Top up credits in the dashboard:

1. Open [AI Gateway → Credits](https://dash.cloudflare.com/?to=/:account/ai/ai-gateway)
2. **Credits Available → Manage → Top-up credits**
3. Ensure the `default` gateway uses Unified billing for Workers AI

Without credits, `/v1/score` returns `502` with `Insufficient AI Gateway credits`. Native `@cf/*` models are unrelated.

### curl

```bash
curl -sS https://slop-911.hqy841440305.workers.dev/v1/score \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -d '{
    "text": "It'\''s not just a tool. It'\''s a paradigm shift that will redefine the landscape.",
    "platform": "x",
    "author": "@example"
  }'
```

Health:

```bash
curl -sS https://slop-911.hqy841440305.workers.dev/health
```

## Extension

1. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the `extension/` folder.
2. Open the extension **Options** page and set:
   - **API base URL** — your Worker URL (no trailing slash)
   - **API key** — only if you set `API_KEY` on the Worker
3. Visit [x.com](https://x.com) or [linkedin.com](https://www.linkedin.com) feed. On each post, click **911** (on-demand only — nothing is auto-scored).
4. A badge appears: e.g. `AI 87%` / `Human` / `~50%`.

### Host permissions

`manifest.json` includes `https://*.workers.dev/*` plus localhost. If you put the Worker on a **custom domain**, add that origin to `host_permissions` (or use Chrome’s optional host access) and reload the extension.

### Selectors

- **X / Twitter:** `article[data-testid="tweet"]`, text `tweetText`, images `tweetPhoto`, author `User-Name`.
- **LinkedIn:** best-effort (`feed-shared-update-v2`, `update-components-*`). LinkedIn’s DOM changes often — tweak `content/linkedin.js` if buttons don’t appear.

## License

MIT (or your choice when publishing).
