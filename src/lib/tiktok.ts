/**
 * TikTok Pixel loader.
 *
 * Loads once per page session, only while advertising consent allows it.
 * PageView is sent once on load and once per client-side route change.
 */
import { hasAdvertisingConsent } from "./consent";

const PIXEL_ID = "DB8R6QJC77U2CDFHK5GG";

type TtqFn = ((...args: unknown[]) => void) & Record<string, unknown>;

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: TtqFn;
  }
}

let loaded = false;
let revoked = false;

function bootstrapPixel() {
  // Official TikTok base code, with the loader inlined.
  /* eslint-disable */
  (function (w: any, d: Document, t: string) {
    w.TiktokAnalyticsObject = t;
    const ttq = (w[t] = w[t] || []);
    ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
    ttq.setAndDefer = function (obj: any, method: string) {
      obj[method] = function () {
        obj.push([method].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (id: string) {
      const e = ttq._i[id] || [];
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = function (e: string, n?: any) {
      const r = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = r;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      const s = d.createElement("script");
      s.type = "text/javascript";
      s.async = true;
      s.src = r + "?sdkid=" + e + "&lib=" + t;
      const first = d.getElementsByTagName("script")[0];
      first.parentNode!.insertBefore(s, first);
    };
    ttq.load(PIXEL_ID);
    ttq.page();
  })(window, document, "ttq");
  /* eslint-enable */
}

/** Loads the pixel if consent allows; safe to call repeatedly. */
export function ensureTikTokPixel(): boolean {
  if (typeof window === "undefined") return false;
  if (!hasAdvertisingConsent()) return false;
  if (!loaded) {
    bootstrapPixel();
    loaded = true;
    revoked = false;
    return true;
  }
  if (revoked) {
    window.ttq?.("grantConsent");
    revoked = false;
  }
  return true;
}

/** Stops further hits without reloading the page. */
export function revokeTikTokConsent() {
  if (typeof window === "undefined" || !loaded) return;
  window.ttq?.("revokeConsent");
  revoked = true;
}

export function tiktokPage() {
  if (!ensureTikTokPixel()) return;
  window.ttq?.("page");
}

export function tiktokTrack(event: string, params?: Record<string, unknown>) {
  if (!ensureTikTokPixel()) return;
  window.ttq?.("track", event, params ?? {});
}
