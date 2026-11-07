// First-touch attribution for marketing pages: the page a visitor first landed
// on, where they came from, and any utm_ tags. Sent with sign-up (AuthContext)
// and stored on the profile, so you can see which pages win customers.
const KEY = "first_touch";

export function recordFirstTouch() {
  try {
    if (localStorage.getItem(KEY)) return;
    const url = new URL(window.location.href);
    const utm: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { if (k.startsWith("utm_")) utm[k] = v.slice(0, 100); });
    localStorage.setItem(KEY, JSON.stringify({
      landing: url.pathname.slice(0, 200),
      referrer: document.referrer ? new URL(document.referrer).hostname : null,
      ...utm,
      at: new Date().toISOString(),
    }));
  } catch { /* storage unavailable: skip */ }
}

export function firstTouch(): Record<string, string> | null {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; }
}
