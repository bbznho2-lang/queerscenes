import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const KINDS = [
  { value: "creator", label: "Creator" },
  { value: "brand", label: "Brand or community" },
  { value: "press", label: "Press" },
  { value: "distributor", label: "Distributor" },
  { value: "other", label: "Other" },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PartnershipsSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<string>("creator");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || sent) return;
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setSending(true);
    const { error: insertError } = await supabase.from("partnership_requests").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      kind,
      link: link.trim() || null,
      message: message.trim(),
      honeypot,
    });
    setSending(false);
    if (insertError) {
      setError("Something went wrong. Please try again or write to us directly.");
      return;
    }
    setSent(true);
    void supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "partnership-request",
        idempotencyKey: `partnership-${crypto.randomUUID()}`,
        templateData: { name: name.trim(), email: email.trim().toLowerCase(), kind, link: link.trim() || null, message: message.trim() },
      },
    }).catch(() => {});
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[var(--t1)] placeholder:text-[var(--t3)] focus:outline-none focus:border-[#a855f7]/60";

  return (
    <section id="partnerships" className="relative py-16 sm:py-24 px-4 overflow-hidden scroll-mt-20">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 80% 0%, rgba(217,70,168,.12), transparent 55%), radial-gradient(ellipse at 15% 100%, rgba(139,43,226,.14), transparent 60%)",
        }}
      />
      <div className="relative max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6 }} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px flex-1 max-w-[36px]" style={{ background: "rgba(217,70,168,.5)" }} />
            <span className="qs-section-label" style={{ color: "#d946a8" }}>Partnerships</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--t1)] leading-tight">
            Partner <span className="italic" style={{ color: "#d946a8" }}>with us.</span>
          </h2>
        </motion.div>

        <p className="text-[var(--t2)] text-base sm:text-lg leading-relaxed mb-10">
          Do you create content for the LGBTQIA+ community, run a brand, a media outlet or a fan community? Let's promote each other.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { title: "Creators & influencers", text: "Share our catalog with your audience through your own tracked link." },
            { title: "Brands & communities", text: "Cross-promotion, campaigns and events with a growing international audience." },
            { title: "Press & distributors", text: "Interviews, features and conversations about titles and licensing." },
          ].map((c) => (
            <div key={c.title} className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="h-[2px] w-10 mb-3" style={{ background: "linear-gradient(90deg, #d946a8, transparent)" }} />
              <h4 className="font-bold text-[var(--t1)] text-sm mb-1.5">{c.title}</h4>
              <p className="text-xs sm:text-sm text-[var(--t2)] leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }}>
          {sent ? (
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] text-center">
              <p className="text-[var(--t1)] font-semibold">Thanks! We'll reply by email soon.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="p-5 sm:p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
                <input required type="email" maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass} aria-label="I am a">
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value} className="bg-[#0B0B0F]">{k.label}</option>
                  ))}
                </select>
                <input maxLength={500} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Profile or website link (optional)" className={inputClass} />
              </div>
              <textarea required maxLength={2000} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your idea" className={inputClass} />
              {/* Honeypot: invisible to humans, bots fill it */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute opacity-0 pointer-events-none h-0 w-0"
              />
              {error && <p className="text-sm" style={{ color: "#f472b6" }}>{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto px-8 py-3 rounded-full font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(90deg, #a855f7, #d946a8)" }}
              >
                {sending ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending...</span> : "Send partnership request"}
              </button>
            </form>
          )}
          <p className="mt-4 text-sm text-[var(--t2)]">
            Prefer to write directly?{" "}
            <a href="mailto:scenes.queer@gmail.com?subject=Partnership" className="font-semibold underline" style={{ color: "#c084fc" }}>
              scenes.queer@gmail.com
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
