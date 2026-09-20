const DEFAULT_API_BASE = "https://tweet-911.hqy841440305.workers.dev";

async function load() {
  const { apiBaseUrl, apiKey } = await chrome.storage.sync.get([
    "apiBaseUrl",
    "apiKey",
  ]);
  document.getElementById("apiBaseUrl").value = apiBaseUrl || DEFAULT_API_BASE;
  document.getElementById("apiKey").value = apiKey || "";
}

async function save() {
  const apiBaseUrl = document.getElementById("apiBaseUrl").value.trim();
  const apiKey = document.getElementById("apiKey").value.trim();
  await chrome.storage.sync.set({ apiBaseUrl, apiKey });
  const status = document.getElementById("status");
  status.hidden = false;
  setTimeout(() => {
    status.hidden = true;
  }, 1500);
}

document.getElementById("save").addEventListener("click", save);
load();
