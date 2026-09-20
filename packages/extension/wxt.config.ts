import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  zip: {
    name: "tweet-911",
    artifactTemplate: "{{name}}-{{browser}}.zip",
  },
  dev: {
    server: {
      port: 3000,
      host: "127.0.0.1",
    },
  },
  manifest: {
    name: "Tweet 911",
    description:
      "On-demand AI / solicitation / paraphrase-bot scores for X posts and replies via Cloudflare Worker + TypeSafe Jev.",
    permissions: ["storage"],
    host_permissions: [
      "https://*.workers.dev/*",
      "http://localhost/*",
      "http://127.0.0.1/*",
    ],
    action: {
      default_title: "Tweet 911",
    },
    web_accessible_resources: [
      {
        resources: [
          "assets/*",
          "memes/clean/*",
          "memes/bad/*",
          "memes/worst/*",
        ],
        matches: ["https://x.com/*", "https://twitter.com/*"],
      },
    ],
  },
});
