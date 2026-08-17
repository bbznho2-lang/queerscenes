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
import { getFunnelVisitorId, trackSupporterClick } from "@/lib/supporter-tracking";
import { getReferralCode } from "@/lib/referral";
import { smoothScrollToElement } from "@/lib/scroll-to";
import { toast } from "sonner";
import SupportDialog from "@/components/SupportDialog";

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
  const [supportOpen, setSupportOpen] = useState(false);
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
  const [selectedPlanId, setSelectedPlanId] = useState<string>("price_1TmNFHJ5xR4MDdjr5915HBR2");
  const [supporterCount, setSupporterCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      const { data } = await supabase.rpc("get_active_supporter_count" as any);
      if (!active || data == null) return;
      setSupporterCount(Number(data) || 0);
    };
    fetchCount();
    const channel = supabase
      .channel("supporter-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "pending_supporters" }, fetchCount)
      .subscribe();
    const interval = setInterval(fetchCount, 60000);
    return () => {
      active = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  
  
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, signIn, signUp } = useAuth();

  const scrollToPlanCards = useCallback((target?: "supporter" | "plans", behavior: ScrollBehavior = "smooth") => {
    if (typeof window === "undefined") return false;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    // For the Supporter CTA, always land directly on the Supporter card.
    // Mobile uses an instant jump to avoid smooth-scroll bounce/layout flicker.
    if (target === "supporter") {
      const sup = document.getElementById("supporter-card");
      if (sup) {
        smoothScrollToElement(sup, {
          offset: isMobile ? 14 : 40,
          behavior: isMobile ? "auto" : behavior,
        });
        return true;
      }
    }

    const el = document.getElementById("planos-cards") || document.getElementById("planos");
    if (!el) return false;

    smoothScrollToElement(el, { offset: isMobile ? 80 : 16, behavior });
    return true;
  }, []);


  const scrollToLogin = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("login");
    if (!el) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    smoothScrollToElement(el, { offset: isMobile ? 80 : 16, behavior });
  }, []);



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

  // Scroll to plans cards if URL hash is #planos / #planos-cards / #supporter-card
  // or query param ?highlight=supporter (used by the Player paywall CTA on mobile).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const highlight = params.get("highlight");
    const wantsSupporter = highlight === "supporter" || hash === "#supporter-card";
    const wantsPlans = hash === "#planos" || hash === "#planos-cards";
    if (!wantsSupporter && !wantsPlans) return;

    const timeout = window.setTimeout(() => {
      scrollToPlanCards(wantsSupporter ? "supporter" : "plans", "auto");
    }, 350);
    return () => {
      clearTimeout(timeout);
    };
  }, [scrollToPlanCards]);


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
      scrollToLogin();
    };
    void run();
  }, [user]);

  const top10CatalogItems = buildUniqueTopContent(catalogTitles, top10Ids, 10);

  const showNameFields = isSignUp;
  const showSubscribeActions = !authLoading && !profileLoading && !isAdmin && !isPremiumUser;

  const handleBecomeSupporterClick = useCallback((source: string) => {
    void trackSupporterClick(supabase, {
      source,
      user_id: user?.id ?? null,
    });
    scrollToPlanCards("supporter");
  }, [scrollToPlanCards, user?.id]);

  const startCheckout = async (priceId: string) => {
    const trimmedEmail = checkoutEmail.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!trimmedEmail) {
      toast.error("Please enter your email to continue.");
      document.getElementById("supporter-email")?.focus();
      return;
    }
    if (!emailValid) {
      toast.error("Please enter a valid email address.");
      document.getElementById("supporter-email")?.focus();
      return;
    }
    if (!user) {
      toast.error("Please sign in first to become a Supporter.");
      setEmail(trimmedEmail);
      setIsSignUp(false);
      setIsForgot(false);
      scrollToLogin();
      return;
    }
    setCheckoutLoading(priceId);
    try {
      const visitorId = getFunnelVisitorId();
      const refCode = getReferralCode();
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, visitorId, refCode },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error("Missing checkout URL");
      window.location.href = url;
    } catch (err: any) {
      console.error("startCheckout error", err);
      toast.error(err?.message || "Could not start checkout. Please try again.");
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
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
            The queer streaming experience you've been waiting for. Hand-subtitled titles, rare series, GL Dramas and exclusive premieres — all in one place.
          </motion.p>

          <motion.p
            className="mx-auto mb-7 px-2"
            style={{ fontSize: "12px", color: "#9996bb", lineHeight: 1.6, maxWidth: 290 }}
            initial="hidden" animate="visible" variants={fade} custom={3}
          >
            Want the full experience?{" "}
            <button
              onClick={() => handleBecomeSupporterClick("landing_hero_text")}
              style={{ color: "#a855f7", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 600 }}
            >
              Become a Supporter
            </button>{" "}
            — unlock exclusive titles, weekly subtitled soap operas, GL Dramas & early access. 💜
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fade} custom={4} className="flex flex-col items-center gap-3 mx-auto" style={{ maxWidth: 290 }}>
            <button
              onClick={() => scrollToLogin()}
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
              Start Watch Now
            </button>
            <button
              onClick={() => handleBecomeSupporterClick("landing_hero_button")}
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


        </div>
      </section>

      {/* TOP 10 THIS MONTH */}
      {top10CatalogItems.length > 0 && (
        <section className="py-12 sm:py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <h3 className="inline-flex items-center justify-center gap-2 text-xl sm:text-2xl font-black text-[var(--t1)] tracking-tight">
                <span>🔥</span>
                <span>Top 10</span>
                <span className="qs-top10-pill">THIS MONTH</span>
              </h3>
              <p className="mt-2 text-sm text-[var(--t2)]">Most watched titles right now.</p>
            </div>

            <div
              className="overflow-x-auto -mx-4 px-4 scroll-smooth snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex flex-nowrap items-start gap-4 sm:gap-6 pb-4" style={{ width: "max-content" }}>
                {top10CatalogItems.map((item, i) => {
                  const rank = i + 1;
                  return (
                    <article
                      key={`top10-${item.id}`}
                      className="qs-top10-card flex-shrink-0 snap-start"
                      style={{ width: "clamp(120px, 34vw, 220px)" }}
                    >
                      <div className="qs-top10-poster">
                        {item.banner_url ? (
                          <img src={item.banner_url} alt={item.title} loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-8 h-8 text-[var(--t3)]" />
                          </div>
                        )}
                        <div className="qs-top10-shade" />
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
            
          </div>
        </section>
      )}

      {/* LOGIN */}
      <section id="login" className="relative py-16 sm:py-20 px-4">
        <div className="max-w-sm sm:max-w-md mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}>
            <div className="qs-modal p-6 sm:p-7">
              <div className="space-y-1 mb-5">
                <h2 className="text-2xl font-bold text-[var(--t1)]">
                  {isForgot ? "Reset password" : isSignUp ? "Create account" : "Welcome to Queer Scenes! 💜"}
                </h2>
                <p className="text-sm text-[var(--t2)]">
                  {isForgot ? "Enter your email to receive a reset link" : isSignUp ? "Join the community" : "Log in to explore our catalog"}
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
              Queer Scenes exists so people <span className="font-semibold" style={{ color: "#a855f7" }}>all over the world</span> can watch titles that represent them — series, films, soap operas, GL Dramas and reality shows. Hand-subtitled by our team, curated with love, brought to you by fans who get it.
            </p>
          </div>

          {/* Numbered inline steps */}
          <div className="grid grid-cols-3 gap-4 mb-14">
            {[
              { n: "01", text: "Discover rare titles" },
              { n: "02", text: "Watch hand-subtitled content" },
              { n: "03", text: "Join a community that gets you" },
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

      {/* CONTINUOUS SUPPORT */}
      <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(139,43,226,.14), transparent 60%), radial-gradient(ellipse at 20% 100%, rgba(217,70,168,.10), transparent 55%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6 }} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px flex-1 max-w-[36px]" style={{ background: "rgba(168,85,247,.5)" }} />
              <span className="qs-section-label" style={{ color: "#a855f7" }}>Keep the scene alive</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--t1)] leading-tight">
              Your support <br />powers <span className="italic" style={{ color: "#a855f7" }}>everything.</span>
            </h2>
          </motion.div>

          <div className="space-y-4 text-[var(--t2)] text-base sm:text-lg leading-relaxed mb-8">
            <p>
              Queer Scenes is built by a small team that works every day to bring you rare, hand-subtitled titles. Staying subscribed means we can keep updating the site, adding new releases, and growing the catalog for the whole community.
            </p>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              {[
                { title: "More releases, always", text: "Your subscription helps us upload and subtitle new titles every single week." },
                { title: "A stronger community", text: "Continuous support lets us improve the platform and keep the Telegram groups active." },
                { title: "No interrupted access", text: "Staying active means you never lose the titles you love or miss a new premiere." },
                { title: "Help us grow", text: "Every supporter directly funds more content, better players and faster support." },
              ].map((c) => (
                <div key={c.title}>
                  <div className="h-[2px] w-10 mb-3" style={{ background: "linear-gradient(90deg, #a855f7, transparent)" }} />
                  <h4 className="font-bold text-[var(--t1)] text-sm sm:text-base mb-1.5">{c.title}</h4>
                  <p className="text-xs sm:text-sm text-[var(--t2)] leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 p-5 sm:p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <p className="text-sm sm:text-base text-[var(--t1)] leading-relaxed">
                <span className="font-semibold" style={{ color: "#a855f7"}}>Don't cancel — your support keeps Queer Scenes alive.</span> Every subscription funds new titles, subtitles and the community we built together. If something is bothering you — payment, access or content — reach out to support first. Most issues are solved in minutes, so you can keep watching and supporting without losing anything.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <a href="https://t.me/L7kznr" target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: "#c084fc" }}>
                  Talk to support on Telegram
                </a>
                <span className="text-[var(--t3)]">— we'll find a solution together.</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>




      {/* PLANS */}
      <section id="planos" className="py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--t1)]">
              Unlock this title and our entire <span className="italic font-extrabold" style={{ color: "#a855f7" }}>rare collection.</span>
            </h2>
            <p className="text-[var(--t2)] mt-3 text-sm sm:text-base max-w-xl mx-auto">
              One plan. Full access. Cancel anytime.
            </p>

            {!showSubscribeActions && !authLoading && !profileLoading && (
              <p className="mt-3 text-sm font-medium" style={{ color: "#a855f7" }}>Your account already has Supporter access. 💜</p>
            )}
          </motion.div>


          {/* Supporter plan */}
          <div id="planos-cards" className="grid grid-cols-1 gap-6 max-w-xl mx-auto scroll-mt-24">



            {/* SUPPORTER */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={2}>
              <div id="supporter-card" className="qs-supporter-panel p-6 sm:p-7 h-full flex flex-col relative overflow-visible scroll-mt-20">
                <div className="qs-supporter-glow" aria-hidden />

                <div className="relative z-10 text-center pt-3">
                  <div className="text-4xl mb-1">💜</div>
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: "#c084fc" }}>Supporter</h3>
                </div>

                {/* Plan selector */}
                <div className="relative z-10 mt-7 grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Monthly", price: "€11.90", note: "", popular: false, priceId: "price_1TmNFHJ5xR4MDdjr5915HBR2" },
                    { label: "Quarterly", price: "€29.90", note: "Save 16%", popular: true, priceId: "price_1TmNGNJ5xR4MDdjrsxC9bhtx" },
                    { label: "Yearly", price: "€106.90", note: "Save 25%", popular: false, priceId: "price_1TmNHMJ5xR4MDdjrTnNTQAHV" },
                  ].map((opt) => {
                    const selected = selectedPlanId === opt.priceId;
                    return (
                      <button
                        type="button"
                        key={opt.priceId}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setSelectedPlanId(opt.priceId)}
                        className={`qs-supporter-plan ${selected ? "qs-supporter-plan-selected" : ""} text-center relative`}
                      >
                        {opt.popular && (
                          <span
                            className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wide text-white shadow-lg"
                            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
                          >
                            <span className="sm:hidden">★ Popular</span>
                            <span className="hidden sm:inline">✦ Most Popular</span>
                          </span>
                        )}
                        {selected && (
                          <span
                            aria-hidden
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-lg"
                            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
                          >
                            ✓
                          </span>
                        )}
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t2)]">{opt.label}</p>
                        <p className="mt-1 text-base sm:text-lg font-black text-[var(--t1)]">{opt.price}</p>
                        {opt.note && <p className="mt-0.5 text-[11px] font-bold" style={{ color: "#34d399" }}>{opt.note}</p>}
                      </button>
                    );
                  })}
                </div>

                <p className="relative z-10 mt-4 text-center text-sm text-[var(--t2)]">
                  Unlock our full catalog — rare queer titles, hand-subtitled series, GL Dramas, reality shows and premieres you won't find anywhere else. Made by fans, for fans.
                </p>


                <div className="relative z-10 mt-4 flex justify-center">
                  <div className="qs-supporter-backers">
                    <span className="qs-supporter-backers-dot" />
                    <span>{supporterCount} supporters back this project</span>
                  </div>
                </div>

                <div className="relative z-10 mt-5 space-y-2.5">
                  {[
                    "Full catalog access",
                    "Uninterrupted experience",
                    "Soap operas — weekly",
                    "LGBT series & movies",
                    "GL Dramas subtitled",
                    "Early access content",
                    "Telegram community",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <span className="qs-supporter-check-min">✓</span>
                      <span className="text-sm text-[var(--t1)]">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="relative z-10 mt-6 space-y-3">
                  <label htmlFor="supporter-email" className="text-[11px] text-[var(--t2)] block uppercase tracking-[0.16em] font-bold">
                    Your email (we'll send access here)
                  </label>
                  <Input
                    id="supporter-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={checkoutEmail}
                    onChange={(e) => setCheckoutEmail(e.target.value)}
                    className="qs-input"
                  />

                  <button
                    type="button"
                    disabled={checkoutLoading !== null}
                    onClick={() => startCheckout(selectedPlanId)}
                    className="qs-supporter-subscribe"
                  >
                    <Crown className="w-4 h-4" />
                    {checkoutLoading ? "Loading..." : (() => {
                      const map: Record<string, { label: string; price: string }> = {
                        price_1TmNFHJ5xR4MDdjr5915HBR2: { label: "Monthly", price: "€11.90" },
                        price_1TmNGNJ5xR4MDdjrsxC9bhtx: { label: "Quarterly", price: "€29.90" },
                        price_1TmNHMJ5xR4MDdjrTnNTQAHV: { label: "Yearly", price: "€106.90" },
                      };
                      const p = map[selectedPlanId];
                      return p ? `Subscribe ${p.label} — ${p.price}` : "Subscribe";
                    })()}
                  </button>

                  <p className="text-center text-[11px] text-[var(--t2)]">
                    Secure checkout by Stripe · Cancel anytime
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--t2)]">
                    <span>💬 Need help?</span>
                    <a href="https://t.me/L7kznr" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: "#c084fc" }}>
                      Talk to support on Telegram
                    </a>
                  </div>
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
      <section id="faq" className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="mb-8 sm:mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--brand-pink)]">Support</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-black text-[var(--t1)] tracking-tight">FAQ</h2>
            <p className="text-sm text-[var(--t2)] mt-3">Everything you need to know before you start watching.</p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: "Why subscribe to Queer Scenes?", a: (<>Queer Scenes brings together LGBTQIA+ movies, series, soap operas, GL Dramas and reality shows that are hard to find elsewhere — including rare titles fans search for across social media. Every release is hand-subtitled by our team and curated with care. Subscribers also join our Telegram community at <a href="https://t.me/QueerScenesTv" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-pink)] underline hover:opacity-80 font-semibold">t.me/QueerScenesTv</a>, where we post new title announcements, recommendations and the latest premieres.</>) },
                { q: "Is Queer Scenes free?", a: "Queer Scenes is a paid platform. We offer exclusive content — rare queer titles, hand-subtitled series, GL Dramas, reality shows and premieres that you won't find on any major streaming platform. Supporters get full access to our entire catalog." },
                { q: "How do I become a Supporter?", a: "Pick a Supporter plan, complete the secure checkout, and your account will be upgraded instantly." },
                { q: "What if I'm thinking about canceling?", a: "Please contact support first. Most issues — payment, access or content — can be fixed quickly so you don't lose your catalog or new releases. Your support is what keeps Queer Scenes growing." },
                { q: "How do I manage my subscription?", a: (<>Open the <button type="button" onClick={() => setSupportOpen(true)} className="text-[var(--brand-pink)] underline hover:opacity-80 font-semibold">Support</button> form. We recommend messaging us on Telegram first — we can usually solve whatever is making you consider leaving.</>) },
                { q: "What happens if my plan expires?", a: (<>Renewal is automatic on the due date. If it doesn't renew automatically, it may be due to insufficient card balance or an expired/changed payment method. To keep watching without losing access to titles and new releases, contact support and we'll help you update your payment details or renew manually.</>) },
                { q: "Is the content only LGBTQIA+?", a: "Yes. The platform's focus is exclusively on stories, scenes, and productions with LGBTQIA+ representation." },
                { q: "Does it work on mobile?", a: "Yes. The platform is adapted for mobile, tablet, and desktop." },
                { q: "Can I become a Supporter from outside Europe?", a: "Yes. Anyone in the world can become a Supporter, even though the plans are priced in Euros (EUR). Checkout is handled by Stripe, which automatically converts the charge to your local currency using your card's exchange rate — no European address or bank account required." },
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
            onClick={() => scrollToLogin()}
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

      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
};

export default Index;
