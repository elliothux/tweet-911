<p align="center">
  <img src="icon.png" width="128" height="128" alt="Tweet 911" />
</p>

# Tweet 911

**English** | [中文](README.zh.md)

Chrome extension that scores X posts and replies in real time:

- **AI-written** — classic LLM tells
- **Porn solicitation** — sexual traffic bait, meetup invites, off-platform funnels
- **Paraphrase bots** — replies that only restate the parent post

Judgment uses the author (handle, display name, bio) together with the post text, and the parent tweet for replies.

## Preview

<p align="center">
  <img src="docs/preview-overlay.jpg" width="480" alt="Tweet 911 overlay and score popover on X" />
</p>
<p align="center">
  <img src="docs/preview-popup.jpg" width="320" alt="Tweet 911 extension popup" />
</p>

## Install

The Chrome Web Store listing is not up yet. Install from GitHub Releases:

1. Download **[tweet-911-chrome.zip](https://github.com/elliothux/tweet-911/releases/latest/download/tweet-911-chrome.zip)** ([all releases](https://github.com/elliothux/tweet-911/releases))
2. Unzip the file
3. Open `chrome://extensions`
4. Turn on **Developer mode** (top right)
5. Click **Load unpacked** and select the unzipped folder (the one that contains `manifest.json`)
6. Open [x.com](https://x.com)

Rebuilds are published as GitHub Release assets whenever a `v*` tag is pushed.

## Architecture

The scoring API is a standard [Cloudflare Workers](https://developers.cloudflare.com/workers/)-compatible worker. **The whole worker runs on [open-compute](https://github.com/elliothux/open-compute)** — an open-source, self-hosted platform compatible with the Workers programming model (workerd, Wrangler, KV, and the rest).

The extension never calls TypeSafe from the browser. It extracts posts on x.com and `POST`s them to the worker. The worker caches by URL in KV. Cache misses are scored by [TypeSafe System One](https://typesafe.ai/blog/introducing-system-one-models-and-jev) **Jev**.

```
x.com timeline
      │
      ▼
 Chrome extension (WXT + React)
      │  POST /v1/score  or  /v1/score/batch
      ▼
 tweet-911 worker  (KV cache + /v1/score)
      │  runs on open-compute
      │  cache miss
      ▼
 TypeSafe Jev
```

Real-time feel comes from scoring as soon as posts enter (or approach) the viewport, in batches, so labels are usually ready before you stop on a tweet.

## Repo

```
tweet-911/
├── icon.png
├── packages/
│   ├── extension/    Chrome MV3 (WXT + React)
│   └── worker/       Workers-compatible API (runs on open-compute)
└── README.md
```

```bash
bun install
bun run dev              # extension + worker
bun run dev:extension    # WXT only
bun run dev:worker       # wrangler → http://127.0.0.1:8788
bun run test             # worker vitest
bun run extension:zip    # chrome zip for Load unpacked
```

## Extension

Dev: `bun run dev:extension` (WXT loads Chrome). To pack a zip locally: `bun run extension:zip` → `packages/extension/.output/tweet-911-chrome.zip`.

Popup: language, blur/hide filter, separate post vs reply thresholds, and local scan counts (stored only in the browser).

## Worker

Same Wrangler project you would write for Cloudflare. Local loop is `wrangler dev`. Production is this worker running on open-compute.

```bash
cd packages/worker
bunx wrangler secret put TYPESAFE_API_KEY
# optional client auth:
bunx wrangler secret put API_KEY
```

Copy `.dev.vars.example` → `.dev.vars` for local secrets. Model default is `jev-latest`.

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/health` | `{ "ok": true }` |
| `POST` | `/v1/score` | one post |
| `POST` | `/v1/score/batch` | `{ "items": [ … ] }`, max 50 |
| `OPTIONS` | `*` | CORS for `chrome-extension://` and localhost |

`url` is required (cache key). Send `text` and/or image URLs, plus `author` and `in_reply_to` when you have them.

Score cache lives in KV for **90 days**. A daily cron (`0 4 * * *` UTC) lists `cache:url:*` and deletes expired keys so the namespace cannot grow without bound. Stale hits are also dropped on read.

Scores are 0–1. Labels use 0.65 / 0.35: `likely_ai` / `uncertain` / `likely_human` (same pattern for solicitation and paraphrase).

## Links

- [TypeSafe System One and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [open-compute](https://github.com/elliothux/open-compute)
- [Latest extension zip](https://github.com/elliothux/tweet-911/releases/latest/download/tweet-911-chrome.zip)
- [Source](https://github.com/elliothux/tweet-911)

## License

MIT
