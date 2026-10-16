import { Link } from "react-router-dom";
import { openCookieSettings } from "@/components/CookieConsent";

const Privacy = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-2xl px-5 py-12 space-y-6 text-sm leading-relaxed">
      <Link to="/" className="text-primary underline">← Back to Queer Scenes</Link>
      <h1 className="text-3xl font-bold">Privacy policy</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Accounts and payments</h2>
        <p>We store your email and profile to give you access. Payments are processed by Stripe; we never see or store your card details.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Advertising measurement (TikTok)</h2>
        <p>
          When advertising cookies are allowed, we use the TikTok Pixel and TikTok Events API to measure and
          optimize our TikTok ads. TikTok receives: pages visited on this site, when a locked title is viewed
          (without the title name), when a checkout starts, and when a subscription payment is confirmed
          (amount and currency), plus technical data such as an anonymous visitor id, TikTok cookie/click ids,
          IP address and browser user agent.
        </p>
        <p>We never send your email, name, the titles you watch, or any information about your identity or orientation.</p>
        <p>
          In the EU/EEA, UK, Switzerland and Brazil, this only happens after you accept in the cookie banner.
          Elsewhere it is on by default and you can refuse it. Your choice is saved with the date and the
          version of the notice you saw.
        </p>
        <button type="button" onClick={openCookieSettings} className="text-primary underline">
          Change cookie settings
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>Questions or data requests: <a className="text-primary underline" href="mailto:scenes.queer@gmail.com">scenes.queer@gmail.com</a></p>
      </section>
    </div>
  </div>
);

export default Privacy;
