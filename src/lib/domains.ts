// Which site we're on.
//
// - Marketing site (aries.sugarandleather.com): landing, pricing, legal pages.
//   Sign-in and dashboard links send people to the app site.
// - App site (sequence.sugarandleather.com): sign-in and the CRM dashboard.
//   Its root goes straight to the dashboard (or sign-in).
// - Any other host (localhost, the Firebase staging URL) serves everything,
//   so local development works as before.
//
// Override with VITE_MARKETING_URL / VITE_APP_URL if the domains change.

export const MARKETING_URL = (import.meta.env.VITE_MARKETING_URL || "https://aries.sugarandleather.com").replace(/\/$/, "");
export const APP_URL = (import.meta.env.VITE_APP_URL || "https://sequence.sugarandleather.com").replace(/\/$/, "");

const host = typeof window !== "undefined" ? window.location.host : "";

// One domain for both (a brand on a single domain): it serves everything,
// like any other host, so there are no cross-site redirects.
const singleDomain = new URL(MARKETING_URL).host === new URL(APP_URL).host;
export const isMarketingHost = !singleDomain && host === new URL(MARKETING_URL).host;
export const isAppHost = !singleDomain && host === new URL(APP_URL).host;

/** Pages that belong to the marketing site. Everything else is the app. */
export const MARKETING_PATHS = ["/", "/pricing", "/privacy", "/terms"];

/** Link target for an app page, as seen from the current site. */
export function appHref(path: string): string {
  return isMarketingHost ? `${APP_URL}${path}` : path;
}

/** Link target for a marketing page, as seen from the current site. */
export function marketingHref(path: string): string {
  return isAppHost ? `${MARKETING_URL}${path}` : path;
}
