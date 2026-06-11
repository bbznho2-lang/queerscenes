import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Lock, Heart, Film, Crown, ArrowRight, HelpCircle, Tv, Smartphone, Tablet, Eye, EyeOff, TrendingUp, Subtitles, Sparkles, ShieldCheck, MessageCircle, Zap, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { getResetPasswordRedirectUrl } from "@/lib/auth-urls";
import { buildUniqueTopContent, fetchTopContentRanking, getUniqueItemsByTitle } from "@/lib/top-content";
import { toast } from "sonner";

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

interface LandingContentItem {
  id: string;
  title: string;
  banner_url: string | null;
  tag: string;
  synopsis: string | null;
  is_archived?: boolean;
  position: number;
}

const Index = () => {
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("qs_remember_email") || "";
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("qs_remember_me") !== "false";
  });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [catalogTitles, setCatalogTitles] = useState<LandingContentItem[]>([]);
  const [heroBanners, setHeroBanners] = useState<Array<{ id: string; title: string; banner_url: string | null; synopsis: string | null }>>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [top10Ids, setTop10Ids] = useState<string[]>([]);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("price_1TdJouJ5xR4MDdjriK0vTZr3");
  
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, signIn, signUp } = useAuth();

  useEffect(() => {
    const loadCatalog = async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("id, title, banner_url, tag, synopsis, is_archived, position")
        .order("position")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load catalog", error);
        return;
      }

      const visibleItems = (data ?? []).filter((item) => !item.is_archived) as LandingContentItem[];
      const uniqueItems = getUniqueItemsByTitle(visibleItems);

      setCatalogTitles(visibleItems);
      setHeroBanners(uniqueItems.filter((item) => item.banner_url).slice(0, 8));
    };

    const loadTop10 = async () => {
      try {
        const ranking = await fetchTopContentRanking(10);
        setTop10Ids(ranking.map((item) => item.content_id));
      } catch (error) {
        console.error("Failed to load Top 10", error);
      }
    };

    void Promise.all([loadCatalog(), loadTop10()]);
  }, []);

  useEffect(() => {
    let active = true;

    const loadPremiumStatus = async () => {
      if (!user) {
        if (active) {
          setIsPremiumUser(false);
          setProfileLoading(false);
        }
        return;
      }

      setProfileLoading(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium, premium_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      const notExpired = !profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date();
      setIsPremiumUser(Boolean(profile?.is_premium && notExpired));
      setProfileLoading(false);
    };

    void loadPremiumStatus();

    return () => {
      active = false;
    };
  }, [user]);

  // Scroll to plans section if URL hash is #planos
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#planos") return;
    const timeout = setTimeout(() => {
      document.getElementById("planos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  // Pre-fill checkout email
  useEffect(() => {
    if (user?.email && !checkoutEmail) setCheckoutEmail(user.email);
  }, [user?.email]);

  // After returning from Stripe Checkout, claim the supporter status and refresh
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("supporter") !== "success") return;
    const run = async () => {
      if (user) {
        const { data } = await supabase.rpc("claim_supporter_for_current_user" as any);
        if ((data as any)?.claimed) {
          toast.success("Welcome, Supporter! 💜 Your access is now active.");
          setIsPremiumUser(true);
        } else {
          toast.success("Payment confirmed! Sign in with your paid email to unlock Supporter.");
        }
      } else {
        toast.success("Payment confirmed! Create an account or sign in with the paid email to unlock Supporter.");
      }
      // clean the query string
      const url = new URL(window.location.href);
      url.searchParams.delete("supporter");
      url.searchParams.delete("email");
      window.history.replaceState({}, "", url.toString());
      document.getElementById("login")?.scrollIntoView({ behavior: "smooth" });
    };
    void run();
  }, [user]);

  // Rotate hero banners
  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % heroBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  const top10CatalogItems = buildUniqueTopContent(catalogTitles, top10Ids, 10);

  const showNameFields = isSignUp;
  const showSubscribeActions = !authLoading && !profileLoading && !isAdmin && !isPremiumUser;

  const startCheckout = async (priceId: string) => {
    if (!user) {
      toast.error("Please sign in to become a supporter.");
      document.getElementById("login-form")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setCheckoutLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error("Missing checkout URL");
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || "Could not start checkout. Please try again.");
      setCheckoutLoading(null);
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getResetPasswordRedirectUrl(),
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset link sent! Check your email.");
    setIsForgot(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgot) { await handleForgotPassword(e); return; }
    setLoading(true);
    try {
      if (isSignUp) {
        if (!firstName.trim() || !lastName.trim()) {
          toast.error("Please enter your first and last name");
          return;
        }
        const { error } = await signUp(email, password, firstName.trim(), lastName.trim());
        if (error) { toast.error(error.message); return; }
        toast.success("Account created! You can now sign in.");
        setIsSignUp(false);
        setLoading(false);
        return;
      }
      const { error } = await signIn(email, password);
      if (error) { toast.error(error.message); return; }
      if (rememberMe) {
        localStorage.setItem("qs_remember_email", email);
        localStorage.setItem("qs_remember_me", "true");
      } else {
        localStorage.removeItem("qs_remember_email");
        localStorage.setItem("qs_remember_me", "false");
      }
      navigate("/browse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-center justify-center px-4 py-16 overflow-hidden">
        {/* Rotating background banners */}
        <AnimatePresence mode="wait">
          {heroBanners.length > 0 && (
            <motion.img
              key={heroBanners[currentBanner]?.id}
              src={heroBanners[currentBanner]?.banner_url || "/placeholder.svg"}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-background/75 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={fade} custom={0}>
            <span
              className="inline-block mb-6 backdrop-blur-md"
              style={{
                background: "rgba(139,43,226,.14)",
                border: "1px solid rgba(139,43,226,.28)",
                color: "#c084fc",
                padding: "5px 14px",
                borderRadius: "100px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: ".1em",
              }}
            >
              🏳️‍🌈 LGBTQIA+ STREAMING
            </span>
          </motion.div>

          <motion.h1
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "clamp(38px, 11vw, 62px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              color: "#a855f7",
              textShadow: "0 0 40px rgba(168,85,247,.55), 0 0 80px rgba(139,43,226,.30), 0 0 120px rgba(139,43,226,.15)",
            }}
            initial="hidden" animate="visible" variants={fade} custom={1}
          >
            QUEER SCENES
          </motion.h1>

          <motion.p
            className="mx-auto mb-3 px-2"
            style={{ fontSize: "14px", color: "rgba(238,234,255,.75)", lineHeight: 1.68, maxWidth: 320 }}
            initial="hidden" animate="visible" variants={fade} custom={2}
          >
            Stream free LGBTQIA+ content now — series, movies & exclusive moments. 100% free to start.
          </motion.p>

          <motion.p
            className="mx-auto mb-7 px-2"
            style={{ fontSize: "12px", color: "#9996bb", lineHeight: 1.6, maxWidth: 290 }}
            initial="hidden" animate="visible" variants={fade} custom={3}
          >
            Want the full experience?{" "}
            <button
              onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
              style={{ color: "#a855f7", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 600 }}
            >
              Become a Supporter
            </button>{" "}
            — unlock exclusive titles, weekly subtitled soap operas, GL Dramas & early access. 💜
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fade} custom={4} className="flex flex-col items-center gap-3 mx-auto" style={{ maxWidth: 290 }}>
            <button
              onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full flex items-center justify-center gap-2"
              style={{
                padding: "16px",
                borderRadius: "9999px",
                background: "linear-gradient(135deg, #8b2be2 0%, #d946a8 50%, #2563eb 100%)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                boxShadow: "0 10px 32px rgba(139,43,226,.4)",
                cursor: "pointer",
              }}
            >
              <Play className="w-4 h-4" />
              Start watching free
            </button>
            <button
              onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full flex items-center justify-center gap-2 backdrop-blur-md"
              style={{
                padding: "15px",
                borderRadius: "9999px",
                background: "rgba(255,255,255,.07)",
                color: "#eeeaff",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,.14)",
                cursor: "pointer",
              }}
            >
              <Crown className="w-4 h-4" />
              BECOME A SUPPORTER
            </button>
          </motion.div>


          {/* Banner indicators */}
          {heroBanners.length > 1 && (
            <motion.div initial="hidden" animate="visible" variants={fade} custom={5} className="flex justify-center gap-2 mt-8">
              {heroBanners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentBanner ? 'bg-primary w-6' : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'}`}
                />
              ))}
            </motion.div>
          )}

          {top10CatalogItems.length > 0 && (
            <motion.div initial="hidden" animate="visible" variants={fade} custom={6} className="mt-10 sm:mt-12 w-full">
              <div className="mb-5 sm:mb-6">
                <h3 className="flex items-center gap-2 text-lg sm:text-xl font-black text-[var(--t1)] tracking-tight">
                  <span>🔥</span>
                  <span>Top 10</span>
                  <span className="qs-top10-pill">THIS MONTH</span>
                </h3>
                <p className="mt-2 text-sm text-[var(--t2)]">Most watched titles right now.</p>
              </div>

              <div className="overflow-x-auto -mx-4 px-4 scroll-smooth" style={{ scrollbarWidth: "none" }}>
                <div className="flex gap-4 sm:gap-5 pb-4" style={{ width: "max-content" }}>
                  {top10CatalogItems.map((item, i) => {
                    const rank = i + 1;
                    const tint = i % 3;
                    return (
                      <article key={`top10-${item.id}`} className={`qs-top10-card qs-top10-tint-${tint} flex-shrink-0`} style={{ width: "clamp(155px, 32vw, 200px)" }}>
                        <div className="qs-top10-poster">
                          {item.banner_url ? (
                            <img src={item.banner_url} alt={item.title} loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-8 h-8 text-[var(--t3)]" />
                            </div>
                          )}
                          <div className="qs-top10-shade" />
                          <span className="qs-top10-crown">👑 S</span>
                          <h4 className="qs-top10-title-overlay">{item.title}</h4>
                        </div>
                        <div className="qs-top10-foot">
                          <span className="qs-top10-bignum" aria-hidden>{rank}</span>
                          <div className="qs-top10-meta">
                            <p className="qs-top10-fname">{item.title}</p>
                            <p className="qs-top10-ftag">· {item.tag || "Title"}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </section>

      {/* LOGIN */}
      <section id="login" className="relative py-16 sm:py-20 px-4">
        <div className="max-w-sm sm:max-w-md mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}>
            <div className="qs-modal p-6 sm:p-7">
              <div className="space-y-1 mb-5">
                <h2 className="text-2xl font-bold text-[var(--t1)]">
                  {isForgot ? "Reset password" : isSignUp ? "Create account" : "Welcome back 👋"}
                </h2>
                <p className="text-sm text-[var(--t2)]">
                  {isForgot ? "Enter your email to receive a reset link" : isSignUp ? "Join the community" : "Sign in to continue watching"}
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                {showNameFields && !isForgot && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold tracking-wider uppercase text-[var(--t2)]">First name</label>
                      <Input type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="qs-input" required={isSignUp} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold tracking-wider uppercase text-[var(--t2)]">Last name</label>
                      <Input type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} className="qs-input" required={isSignUp} />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold tracking-wider uppercase text-[var(--t2)]">Email</label>
                  <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="qs-input" required />
                </div>
                {!isForgot && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold tracking-wider uppercase text-[var(--t2)]">Password</label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="qs-input pr-10" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t2)] hover:text-[var(--t1)]">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={loading} className="qs-btn-primary w-full h-11">
                  {loading ? "Please wait..." : isForgot ? "Send reset link" : isSignUp ? "Create account" : "Sign in"}
                </Button>
                {!isSignUp && !isForgot && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-[var(--t2)] cursor-pointer select-none">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-border bg-muted accent-[#8b2be2] cursor-pointer" />
                      Remember me
                    </label>
                    <button type="button" onClick={() => setIsForgot(true)} className="text-xs font-semibold underline" style={{ color: "#a855f7" }}>
                      Forgot password?
                    </button>
                  </div>
                )}
                <p className="text-center text-sm text-[var(--t2)]">
                  {isForgot ? (
                    <button type="button" onClick={() => setIsForgot(false)} className="font-semibold underline" style={{ color: "#a855f7" }}>Back to Sign in</button>
                  ) : isSignUp ? (
                    <>Already have an account? <button type="button" onClick={() => setIsSignUp(false)} className="font-semibold underline" style={{ color: "#a855f7" }}>Sign in</button></>
                  ) : (
                    <>Don't have an account? <button type="button" onClick={() => setIsSignUp(true)} className="font-semibold underline" style={{ color: "#a855f7" }}>Create one</button></>
                  )}
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </section>





      {/* ABOUT */}
      <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 10%, rgba(139,43,226,.18), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(37,99,235,.14), transparent 60%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6 }} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px flex-1 max-w-[36px]" style={{ background: "rgba(217,70,168,.5)" }} />
              <span className="qs-section-label" style={{ color: "#d946a8" }}>About Queer Scenes</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--t1)] leading-tight">
              See yourself<br />on screen — <span className="italic" style={{ color: "#d946a8" }}>finally.</span>
            </h2>
          </motion.div>

          <div className="space-y-4 text-[var(--t2)] text-base sm:text-lg leading-relaxed mb-8">
            <p>
              Queer Scenes exists so people <span className="font-semibold" style={{ color: "#a855f7" }}>all over the world</span> can watch titles that represent them — series, films, soap operas and GL, without filters or limits.
            </p>
            <p>
              Start free. For those who want the full experience, a world of <span className="font-semibold" style={{ color: "#a855f7" }}>exclusive content</span> awaits Supporters. 💜
            </p>
          </div>

          {/* Numbered inline steps */}
          <div className="grid grid-cols-3 gap-4 mb-14">
            {[
              { n: "01", text: "Watch free" },
              { n: "02", text: "Fall in love" },
              { n: "03", text: "Support us" },
            ].map((s) => (
              <div key={s.n}>
                <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: "#d946a8" }}>{s.n}</p>
                <p className="text-sm font-semibold text-[var(--t1)]">{s.text}</p>
              </div>
            ))}
          </div>

          {/* WHY WE'RE DIFFERENT */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px flex-1 max-w-[36px]" style={{ background: "rgba(217,70,168,.5)" }} />
              <span className="qs-section-label" style={{ color: "#d946a8" }}>Why we're different</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--t1)] leading-tight mb-8">
              Crafted by hand,<br />for <span className="italic" style={{ color: "#a855f7" }}>you.</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7">
              {[
                { title: "Manual subtitles", text: "Translated & reviewed by hand. No auto-translate." },
                { title: "Exclusive titles", text: "Films & series you won't find anywhere else." },
                { title: "Handcrafted XP", text: "Every release curated, tested and polished." },
                { title: "Human support", text: "Real people on Telegram. No bots, ever." },
                { title: "Latest premieres", text: "Always fresh — newest releases always here." },
                { title: "Made with care", text: "Quality uploads with working players inside." },
              ].map((c) => (
                <div key={c.title}>
                  <div className="h-[2px] w-10 mb-3" style={{ background: "linear-gradient(90deg, #d946a8, transparent)" }} />
                  <h4 className="font-bold text-[var(--t1)] text-sm sm:text-base mb-1.5">{c.title}</h4>
                  <p className="text-xs sm:text-sm text-[var(--t2)] leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>




      {/* PLANS */}
      <section id="planos" className="py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--t1)]">
              Choose your <span className="italic font-extrabold" style={{ color: "#a855f7" }}>experience</span>
            </h2>
            <p className="text-[var(--t2)] mt-3 text-sm sm:text-base max-w-xl mx-auto">
              Start free. Upgrade anytime.
            </p>
            {!showSubscribeActions && !authLoading && !profileLoading && (
              <p className="mt-3 text-sm font-medium" style={{ color: "#a855f7" }}>Your account already has Supporter access. 💜</p>
            )}
          </motion.div>


          {/* Free vs Supporter cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* FREE */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}>
              <div className="qs-card-lg p-6 sm:p-7 h-full flex flex-col">
                <div className="text-center pb-2">
                  <div className="text-4xl mb-1">🌈</div>
                  <h3 className="text-xl font-bold text-[var(--t1)]">Free</h3>
                  <div className="mt-2">
                    <span className="text-4xl sm:text-5xl font-extrabold text-[var(--t1)]">€0</span>
                  </div>
                  <p className="text-[var(--t2)] text-sm mt-2">
                    Join the community and explore general content for free.
                  </p>
                </div>
                <div className="flex-1 flex flex-col mt-4">
                  <ul className="space-y-2.5 text-sm flex-1">
                    <li className="flex items-start gap-2"><span style={{ color: "#a855f7" }} className="mt-0.5">✓</span><span className="text-[var(--t1)]">Get a taste of our LGBTQIA+ universe</span></li>
                    <li className="flex items-start gap-2"><span style={{ color: "#a855f7" }} className="mt-0.5">✓</span><span className="text-[var(--t1)]">Daily picks from the open catalog</span></li>
                    <li className="flex items-start gap-2"><span style={{ color: "#a855f7" }} className="mt-0.5">✓</span><span className="text-[var(--t1)]">Join the conversation in the comments</span></li>
                    <li className="flex items-start gap-2"><span style={{ color: "#a855f7" }} className="mt-0.5">✓</span><span className="text-[var(--t1)]">Hang out with the community on Telegram</span></li>
                    <li className="flex items-start gap-2 opacity-50"><span className="text-[var(--t3)] mt-0.5">✗</span><span className="text-[var(--t3)] line-through">International subtitled series & movies</span></li>
                    <li className="flex items-start gap-2 opacity-50"><span className="text-[var(--t3)] mt-0.5">✗</span><span className="text-[var(--t3)] line-through">Soap operas subtitled weekly</span></li>
                    <li className="flex items-start gap-2 opacity-50"><span className="text-[var(--t3)] mt-0.5">✗</span><span className="text-[var(--t3)] line-through">GL Dramas subtitled</span></li>
                    <li className="flex items-start gap-2 opacity-50"><span className="text-[var(--t3)] mt-0.5">✗</span><span className="text-[var(--t3)] line-through">Early access content</span></li>
                  </ul>
                  <Button
                    onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
                    className="qs-btn-primary w-full mt-5 h-11 gap-2"
                  >
                    <Play className="w-4 h-4" /> Join free
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* SUPPORTER */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={2}>
              <div className="qs-supporter-panel p-5 sm:p-6 h-full flex flex-col relative overflow-hidden">
                <div className="qs-supporter-glow" aria-hidden />

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <span className="qs-supporter-pill">MOST POPULAR</span>
                    <h3 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-[var(--t1)]">Supporter</h3>
                    <p className="mt-2 text-sm text-[var(--t2)] max-w-sm">
                      Support the project and unlock the full experience with exclusive releases, weekly updates and premium access.
                    </p>
                  </div>

                  <div className="qs-supporter-icon shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                </div>

                <div className="relative z-10 mt-5 qs-supporter-stat">
                  <span className="text-lg">💜</span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-pink)] font-bold">Community</p>
                    <p className="text-sm font-semibold text-[var(--t1)]">62 supporters already back the project</p>
                  </div>
                </div>

                <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    "Everything in the Free plan",
                    "Smooth, uninterrupted experience",
                    "Soap operas subtitled in English every week",
                    "International LGBTQIA+ series and movies subtitled",
                    "GL dramas subtitled",
                    "Early access content",
                    "VIP Telegram channel with exclusive updates",
                  ].map((item) => (
                    <div key={item} className="qs-supporter-feature">
                      <span className="qs-supporter-check">✓</span>
                      <span className="text-[var(--t1)]">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="relative z-10 mt-6 space-y-3">
                  <div>
                    <label htmlFor="supporter-email" className="text-xs text-[var(--t2)] block mb-1.5 uppercase tracking-[0.16em] font-bold">
                      Your email
                    </label>
                    <Input
                      id="supporter-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={checkoutEmail}
                      onChange={(e) => setCheckoutEmail(e.target.value)}
                      className="qs-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        label: "Monthly",
                        price: "€9.99",
                        period: "/month",
                        note: "",
                        tone: "pink",
                        priceId: "price_1TdJouJ5xR4MDdjriK0vTZr3",
                      },
                      {
                        label: "Quarterly",
                        price: "€24.99",
                        period: "/3 months",
                        note: "save 17%",
                        tone: "purple",
                        priceId: "price_1TdJpxJ5xR4MDdjr6CYmpFZk",
                      },
                      {
                        label: "Yearly",
                        price: "€89.99",
                        period: "/year",
                        note: "save 25%",
                        tone: "blue",
                        priceId: "price_1TdJrtJ5xR4MDdjrEdxuGjSz",
                      },
                    ].map((opt) => {
                      const loading = checkoutLoading === opt.priceId;
                      return (
                        <button
                          type="button"
                          key={opt.label}
                          disabled={checkoutLoading !== null}
                          onClick={() => startCheckout(opt.priceId)}
                          className={`qs-supporter-plan qs-supporter-plan-${opt.tone} text-left disabled:opacity-60 disabled:cursor-wait`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--t2)]">{opt.label}</p>
                              <div className="mt-1">
                                <span className="text-2xl font-black text-[var(--t1)]">{opt.price}</span>
                                <span className="text-[11px] text-[var(--t2)] ml-1">{opt.period}</span>
                              </div>
                            </div>
                            <Crown className="w-4 h-4 text-[var(--t1)] opacity-70" />
                          </div>

                          <div className="mt-4 flex items-end justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-pink)] min-h-[14px]">{opt.note}</span>
                            <span className="text-xs font-semibold text-[var(--t1)]">{loading ? "Loading..." : "Choose plan"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-center text-[11px] text-[var(--t2)] mt-1">
                    Secure checkout by Stripe • Cancel anytime
                  </p>
                  <a
                    href="https://t.me/L7kznr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="qs-supporter-help"
                  >
                    💬 Need help choosing a plan? Talk to support on Telegram
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* DEVICES */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}>
            <h2 className="text-2xl sm:text-5xl font-bold mb-6">
              Watch <span className="neon-text-blue">anywhere</span>
            </h2>
            <div className="flex justify-center gap-8 sm:gap-12 mt-8">
              {[
                { icon: Smartphone, label: "Mobile" },
                { icon: Tablet, label: "Tablet" },
                { icon: Tv, label: "Desktop" },
              ].map((d, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i + 1}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-card neon-border-purple flex items-center justify-center">
                    <d.icon className="w-7 h-7 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">{d.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="mb-8 sm:mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-pink)]">Support</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-black text-[var(--t1)] tracking-tight">FAQ</h2>
            <p className="text-sm text-[var(--t2)] mt-3">Everything you need to know before you start watching.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: "Is Queer Scenes free?", a: "Yes. We have free content available. We also offer Supporter plans with exclusive access for the full experience." },
                { q: "How do I become a Supporter?", a: "Pick a Supporter plan, complete the secure checkout, and your account will be upgraded instantly." },
                { q: "Can I cancel anytime?", a: "Yes. Cancellation can be done at any time, with no penalty." },
                { q: "Is the content only LGBTQIA+?", a: "Yes. The platform's focus is exclusively on stories, scenes, and productions with LGBTQIA+ representation." },
                { q: "Does it work on mobile?", a: "Yes. The platform is adapted for mobile, tablet, and desktop." },
              ].map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="qs-faq-item border-b-0"
                >
                  <AccordionTrigger className="qs-faq-trigger hover:no-underline py-5 px-5 sm:px-6 text-left [&>svg]:hidden">
                    <span className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="qs-faq-index">{String(i + 1).padStart(2, "0")}</span>
                      <span className="qs-faq-question">{item.q}</span>
                    </span>
                    <span className="qs-faq-plus" aria-hidden>+</span>
                  </AccordionTrigger>
                  <AccordionContent className="qs-faq-content px-5 sm:px-6 pb-5 sm:pb-6">
                    <div className="pl-[56px] text-sm text-[var(--t2)] leading-relaxed">{item.a}</div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>


      {/* FINAL CTA */}
      <section className="py-16 sm:py-24 px-4 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}>
          <Button
            size="lg"
            onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
            className="text-base sm:text-lg px-10 py-6 sm:py-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 glow-purple gap-3"
          >
            ACCESS QUEER SCENES
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </section>

      <footer className="border-t border-border py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
        <p>© 2026 Queer Scenes. All rights reserved. 🌈</p>
      </footer>

    </div>
  );
};

export default Index;
