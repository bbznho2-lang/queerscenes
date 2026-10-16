import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_NOTICE_TEXT,
  getVisitorRegion,
  readConsentRecord,
  regionRequiresConsent,
  saveConsentChoice,
  setRegionConsentRequirement,
  type AdConsentChoice,
} from "@/lib/consent";
import { ensureTikTokPixel, revokeTikTokConsent, tiktokPage } from "@/lib/tiktok";

export const OPEN_COOKIE_SETTINGS_EVENT = "qs-open-cookie-settings";

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}

/** Regional cookie banner + global TikTok PageView on every route change. */
export default function CookieConsent() {
  const location = useLocation();
  const [region, setRegion] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Resolve region once, then decide whether the banner is needed.
  useEffect(() => {
    let active = true;
    void getVisitorRegion().then((r) => {
      if (!active) return;
      const required = regionRequiresConsent(r);
      setRegionConsentRequirement(required);
      setRegion(r);
      if (required && !readConsentRecord()) setVisible(true);
      ensureTikTokPixel();
    });
    return () => {
      active = false;
    };
  }, []);

  // PageView for client-side navigation (first load is sent by the base code).
  useEffect(() => {
    if (region === null) return;
    tiktokPage();
  }, [location.pathname, region]);

  // Apply choices from other tabs and the settings link immediately.
  useEffect(() => {
    const applyCurrent = () => {
      const rec = readConsentRecord();
      if (rec?.advertising === "denied") revokeTikTokConsent();
      else ensureTikTokPixel();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "qs_consent_v1") applyCurrent();
    };
    const onOpen = () => setVisible(true);
    window.addEventListener("storage", onStorage);
    window.addEventListener(CONSENT_CHANGED_EVENT, applyCurrent);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CONSENT_CHANGED_EVENT, applyCurrent);
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
    };
  }, []);

  const choose = (choice: AdConsentChoice) => {
    saveConsentChoice(choice, region ?? "XX");
    setVisible(false);
  };

  if (!visible) return null;
  const current = readConsentRecord()?.advertising;

  return (
    <div
      role="dialog"
      aria-label="Cookie settings"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-border bg-card/95 p-4 text-sm text-card-foreground shadow-2xl backdrop-blur sm:p-5"
    >
      <p className="font-semibold">Cookies & advertising</p>
      <p className="mt-1 text-muted-foreground">
        {CONSENT_NOTICE_TEXT}{" "}
        <Link to="/privacy" className="underline text-primary">Privacy policy</Link>
      </p>
      {current && (
        <p className="mt-2 text-xs text-muted-foreground">
          Current choice: {current === "granted" ? "accepted" : "rejected"}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => choose("denied")}>Reject</Button>
        <Button onClick={() => choose("granted")}>Accept</Button>
      </div>
    </div>
  );
}
