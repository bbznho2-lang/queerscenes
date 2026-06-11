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
            <motion.div initial="hidden" animate="visible" variants={fade} custom={6} className="mt-10 sm:mt-12 w-full overflow-hidden">
              <p className="text-xs sm:text-sm text-muted-foreground/80 uppercase tracking-widest mb-4 sm:mb-5 flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" /> <span className="rainbow-text font-bold">TOP 10</span> THIS MONTH
              </p>
              <div className="relative">
                <div className="flex gap-3 sm:gap-5 animate-scroll-left" style={{ width: 'max-content' }}>
                  {[...top10CatalogItems, ...top10CatalogItems].map((item, i) => {
                    const rank = (i % top10CatalogItems.length) + 1;
                    return (
                      <div key={`top10-${item.id}-${i}`} className="flex-shrink-0 flex items-end gap-1 sm:gap-2">
                        <span
                          className="leading-none font-black select-none text-transparent"
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 'clamp(60px, 14vw, 140px)',
                            WebkitTextStroke: '2px hsl(var(--primary))',
                          }}
                        >
                          {rank}
                        </span>
                        <div className="w-24 sm:w-40 md:w-48 aspect-[2/3] rounded-md sm:rounded-lg overflow-hidden border border-border/40 bg-muted relative shadow-lg">
                          {item.banner_url ? (
                            <img src={item.banner_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Film className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                          <div className="absolute bottom-1 left-1 right-1">
                            <p className="text-[9px] sm:text-xs text-foreground font-medium truncate">{item.title}</p>
                          </div>
                        </div>
                      </div>
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
            <Card className="bg-card neon-border-pink overflow-hidden">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                  <Lock className="w-5 h-5 text-accent" />
                </div>
                <CardTitle className="text-xl sm:text-2xl neon-text-pink">{isForgot ? "RESET PASSWORD" : "LOGIN"}</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">{isForgot ? "Enter your email to receive a reset link" : "Sign in to continue"}</p>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  {showNameFields && !isForgot && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">First Name</label>
                        <Input
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="bg-muted border-border focus:border-primary"
                          required={isSignUp}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Last Name</label>
                        <Input
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="bg-muted border-border focus:border-primary"
                          required={isSignUp}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Email</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-muted border-border focus:border-primary"
                      required
                    />
                  </div>
                  {!isForgot && (
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-muted border-border focus:border-primary pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                   <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple">
                     {loading ? "Please wait..." : isForgot ? "SEND RESET LINK" : isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
                   </Button>
                   {!isSignUp && !isForgot && (
                     <div className="flex items-center justify-between">
                       <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                         <input
                           type="checkbox"
                           checked={rememberMe}
                           onChange={(e) => setRememberMe(e.target.checked)}
                           className="w-4 h-4 rounded border-border bg-muted accent-primary cursor-pointer"
                         />
                         Remember me
                       </label>
                       <button type="button" onClick={() => setIsForgot(true)} className="text-xs text-muted-foreground hover:text-secondary hover:underline">
                         Forgot your password?
                       </button>
                     </div>
                   )}
                   <p className="text-center text-sm text-muted-foreground">
                     {isForgot ? (
                       <button type="button" onClick={() => setIsForgot(false)} className="text-secondary hover:underline font-medium">
                         Back to Sign in
                       </button>
                     ) : isSignUp ? (
                       <>Already have an account? <button type="button" onClick={() => setIsSignUp(false)} className="text-secondary hover:underline font-medium">Sign in</button></>
                     ) : (
                       <>Don't have an account? <button type="button" onClick={() => setIsSignUp(true)} className="text-secondary hover:underline font-medium">Create account</button></>
                     )}
                   </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>




      {/* ABOUT */}
      <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
        {/* Soft radial gradient background (no hard square) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 10%, hsl(var(--primary) / 0.18), transparent 55%), radial-gradient(ellipse at 85% 90%, hsl(var(--secondary) / 0.14), transparent 60%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6 }} className="text-center mb-10">
            <h2 className="text-2xl sm:text-5xl font-bold leading-tight">
              <Film className="inline w-7 sm:w-10 h-7 sm:h-10 mr-2 text-primary" />
              ABOUT <span className="neon-text-purple">QUEER SCENES</span>
            </h2>
          </motion.div>

          {(() => {
            const lines: { emoji: string; html: React.ReactNode; cls: string }[] = [
              {
                emoji: "🌍",
                cls: "text-base sm:text-xl text-foreground leading-relaxed font-medium",
                html: (
                  <>Queer Scenes was created so people <span className="neon-text-pink">all over the world</span> can finally watch titles where they see themselves on screen.</>
                ),
              },
              {
                emoji: "🎬",
                cls: "text-sm sm:text-lg text-muted-foreground leading-relaxed",
                html: <>Real LGBTQIA+ representation — in series, movies, soap operas and GL. Without filters, without limits.</>,
              },
              {
                emoji: "✨",
                cls: "text-base sm:text-xl text-foreground leading-relaxed font-medium",
                html: (
                  <>And the best part? There's a <span className="neon-text-purple font-bold">whole world of exclusive content</span> waiting for those who decide to support the project. 💜</>
                ),
              },
            ];
            return (
              <div className="space-y-6 text-center">
                {lines.map((l, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.6, delay: i * 0.6, ease: "easeOut" }}
                    className={l.cls}
                  >
                    <motion.span
                      initial={{ scale: 0, rotate: -45, opacity: 0 }}
                      whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.5, delay: i * 0.6 + 0.1, type: "spring", stiffness: 220 }}
                      className="inline-block mr-1.5"
                    >
                      {l.emoji}
                    </motion.span>
                    {l.html}
                  </motion.p>
                ))}

                {/* Journey: each step appears one by one with its emoji */}
                <motion.p
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.6 }}
                  className="text-sm sm:text-base text-muted-foreground italic flex flex-wrap items-center justify-center gap-2 pt-2"
                >
                  {[
                    { emoji: "🎥", text: "Watch free" },
                    { emoji: "💖", text: "Fall in love" },
                    { emoji: "👑", text: "Become a Supporter" },
                  ].map((s, idx, arr) => (
                    <motion.span
                      key={idx}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      transition={{ delay: 1.8 + idx * 0.55, duration: 0.5 }}
                      className="inline-flex items-center gap-1"
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true, amount: 0.6 }}
                        transition={{ delay: 1.8 + idx * 0.55, type: "spring", stiffness: 240 }}
                      >
                        {s.emoji}
                      </motion.span>
                      <span>{s.text}</span>
                      {idx < arr.length - 1 && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true, amount: 0.6 }}
                          transition={{ delay: 1.8 + idx * 0.55 + 0.3 }}
                          className="text-primary mx-1"
                        >
                          →
                        </motion.span>
                      )}
                    </motion.span>
                  ))}
                </motion.p>
              </div>
            );
          })()}

          {/* What makes Queer Scenes different — bento cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-14"
          >
            <h3 className="text-center text-lg sm:text-2xl font-bold mb-2">
              Why <span className="neon-text-purple">Queer Scenes</span> is different
            </h3>
            <p className="text-center text-muted-foreground text-xs sm:text-sm mb-8 max-w-xl mx-auto">
              We're not just another streaming platform — every detail is crafted by hand, with you in mind.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: Subtitles,
                  title: "Manually subtitled",
                  text: "Every title is translated and reviewed by hand — no auto-translate, no shortcuts.",
                  color: "text-primary",
                  border: "neon-border-purple",
                },
                {
                  icon: Sparkles,
                  title: "Exclusive titles",
                  text: "We bring queer films and series you won't find on any other streaming service.",
                  color: "text-secondary",
                  border: "neon-border-pink",
                },
                {
                  icon: Wrench,
                  title: "Handcrafted experience",
                  text: "Each release is curated, tested and polished — built for the way you actually watch.",
                  color: "text-accent",
                  border: "neon-border-blue",
                },
                {
                  icon: MessageCircle,
                  title: "Human support",
                  text: "Real people answer you on Telegram — no bots, no scripts. We never leave supporters hanging.",
                  color: "text-primary",
                  border: "neon-border-purple",
                },
                {
                  icon: Zap,
                  title: "Latest premieres",
                  text: "We chase the newest releases of the moment so you always have something fresh to watch.",
                  color: "text-secondary",
                  border: "neon-border-pink",
                },
                {
                  icon: ShieldCheck,
                  title: "Made with care",
                  text: "Quality-checked uploads with working players — focused entirely on user experience.",
                  color: "text-accent",
                  border: "neon-border-blue",
                },
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    whileHover={{ y: -4 }}
                    className={`rounded-xl bg-card/70 backdrop-blur-sm border border-border p-5 text-left ${card.border} hover:border-primary/40 transition-colors`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-background/60 flex items-center justify-center mb-3 ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base mb-1.5">{card.title}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{card.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, delay: 3.6 }}
            className="mt-10 flex justify-center"
          >
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
              <Button
                size="lg"
                onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
                className="shine-cta rounded-full bg-primary text-primary-foreground hover:bg-primary/90 glow-purple gap-2 shadow-lg shadow-primary/40"
              >
                <Heart className="w-4 h-4 animate-pulse" /> See how to support 💜
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>


      {/* PLANS */}
      <section id="planos" className="py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-2xl sm:text-5xl font-bold leading-tight">
              Choose your <span className="rainbow-text">vibe</span>
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-xl mx-auto">
              Start free or support the project and unlock everything.
            </p>
            {!showSubscribeActions && !authLoading && !profileLoading && (
              <p className="text-secondary mt-3 text-sm font-medium">Your account already has Supporter access. 💜</p>
            )}
          </motion.div>

          {/* Free vs Supporter cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* FREE */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}>
              <Card className="bg-card neon-border-pink h-full flex flex-col">
                <CardHeader className="text-center pb-2">
                  <div className="text-4xl mb-1">🌈</div>
                  <CardTitle className="text-2xl neon-text-pink">Free</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">€0</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">
                    Join the community and explore general content for free.
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2.5 text-sm flex-1">
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span><span className="text-foreground">Get a taste of our LGBTQIA+ universe</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span><span className="text-foreground">Daily picks from the open catalog</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span><span className="text-foreground">Join the conversation in the comments</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-0.5">✓</span><span className="text-foreground">Hang out with the community on Telegram</span></li>
                    <li className="flex items-start gap-2 opacity-60"><span className="text-destructive mt-0.5">✗</span><span className="text-muted-foreground line-through">International subtitled series & movies</span></li>
                    <li className="flex items-start gap-2 opacity-60"><span className="text-destructive mt-0.5">✗</span><span className="text-muted-foreground line-through">Soap operas subtitled weekly</span></li>
                    <li className="flex items-start gap-2 opacity-60"><span className="text-destructive mt-0.5">✗</span><span className="text-muted-foreground line-through">GL Dramas subtitled</span></li>
                    <li className="flex items-start gap-2 opacity-60"><span className="text-destructive mt-0.5">✗</span><span className="text-muted-foreground line-through">Early access content</span></li>
                  </ul>
                  <Button
                    onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
                    className="w-full mt-5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 glow-pink gap-2"
                  >
                    <Play className="w-4 h-4" /> Join free
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* SUPPORTER */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={2}>
              <Card className="bg-card neon-border-purple neon-pulse h-full overflow-hidden relative flex flex-col">
                <div className="absolute top-0 right-0 left-0">
                  <span className="block w-full text-center py-1.5 text-xs font-semibold bg-primary text-primary-foreground">
                    💜 MOST POPULAR
                  </span>
                </div>
                <CardHeader className="text-center pb-2 pt-10">
                  <div className="text-4xl mb-1">💜</div>
                  <CardTitle className="text-2xl neon-text-purple">Supporter</CardTitle>
                  <p className="text-muted-foreground text-sm mt-2">
                    Support the project and unlock the full experience.
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2.5 text-sm flex-1">
                    <li className="flex items-start gap-2"><span className="text-secondary mt-0.5">✓</span><span className="text-foreground">Everything in the Free plan</span></li>
                    <li className="flex items-start gap-2"><span className="text-secondary mt-0.5">✓</span><span className="text-foreground">Smooth, uninterrupted experience</span></li>
                    <li className="flex items-start gap-2"><span className="text-secondary mt-0.5">✓</span><span className="text-foreground">Soap operas subtitled in English — every week</span></li>
                    <li className="flex items-start gap-2"><span className="text-secondary mt-0.5">✓</span><span className="text-foreground">LGBT series & movies from other countries, subtitled</span></li>
                    <li className="flex items-start gap-2"><span className="text-secondary mt-0.5">✓</span><span className="text-foreground">GL Dramas subtitled</span></li>
                    <li className="flex items-start gap-2"><span className="text-secondary mt-0.5">✓</span><span className="text-foreground">Early access content</span></li>
                    <li className="flex items-start gap-2"><span className="text-secondary mt-0.5">✓</span><span className="text-foreground">VIP Telegram channel with exclusive news & updates</span></li>
                  </ul>
                  <div className="mt-5 mb-2 flex items-center justify-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-foreground">
                    <span aria-hidden>💜</span>
                    <span>62 supporters already back the project</span>
                  </div>

                  {/* Email + plan picker */}
                  <div className="mt-5 space-y-3">
                    <div>
                      <label htmlFor="supporter-email" className="text-xs text-muted-foreground block mb-1">
                        Your email (we'll send your access here)
                      </label>
                      <Input
                        id="supporter-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={checkoutEmail}
                        onChange={(e) => setCheckoutEmail(e.target.value)}
                        className="bg-muted/50 border-border"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        {
                          label: "Monthly",
                          price: "€9.99",
                          period: "/month",
                          note: "",
                          color: "neon-text-pink",
                          border: "neon-border-pink",
                          btn: "bg-accent text-accent-foreground hover:bg-accent/90 glow-pink",
                          priceId: "price_1TdJouJ5xR4MDdjriK0vTZr3",
                        },
                        {
                          label: "Quarterly",
                          price: "€24.99",
                          period: "/3 months",
                          note: "save 17%",
                          color: "neon-text-purple",
                          border: "neon-border-purple",
                          btn: "bg-primary text-primary-foreground hover:bg-primary/90 glow-purple",
                          priceId: "price_1TdJpxJ5xR4MDdjr6CYmpFZk",
                        },
                        {
                          label: "Yearly",
                          price: "€89.99",
                          period: "/year",
                          note: "save 25%",
                          color: "neon-text-blue",
                          border: "border-secondary/40",
                          btn: "bg-secondary text-secondary-foreground hover:bg-secondary/90 glow-blue",
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
                            className={`text-left rounded-xl bg-card border p-3 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-wait ${opt.border}`}
                          >
                            <p className={`text-xs font-semibold ${opt.color}`}>{opt.label}</p>
                            <div className="mt-0.5">
                              <span className="text-xl font-bold text-foreground">{opt.price}</span>
                              <span className="text-[11px] text-muted-foreground ml-1">{opt.period}</span>
                            </div>
                            {opt.note && <p className="text-[10px] text-secondary mt-0.5">{opt.note}</p>}
                            <div className={`mt-2 inline-flex items-center justify-center w-full rounded-full px-3 py-1.5 text-xs font-semibold ${opt.btn}`}>
                              <Crown className="w-3 h-3 mr-1" /> {loading ? "Loading..." : "Subscribe"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-center text-[11px] text-muted-foreground mt-1">
                      Secure checkout by Stripe • Cancel anytime
                    </p>
                    <a
                      href="https://t.me/L7kznr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-full neon-border-blue text-secondary hover:bg-secondary/10 transition-colors text-xs font-medium"
                    >
                      💬 Need help choosing a plan? Talk to support on Telegram
                    </a>
                  </div>
                </CardContent>
              </Card>
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
        <div className="max-w-2xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-2xl sm:text-5xl font-bold">
              <HelpCircle className="inline w-7 sm:w-10 h-7 sm:h-10 mr-2 text-secondary" />
              <span className="neon-text-blue">FAQ</span>
            </h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: "Is Queer Scenes free?", a: "Yes. We have free content available. We also offer Supporter plans with exclusive access for the full experience." },
                { q: "Do I need to create an account?", a: "Yes. To access the content you need to create a login with email and password." },
                { q: "Is the content only LGBTQIA+?", a: "Yes. The platform's focus is exclusively on stories, scenes, and productions with LGBTQIA+ representation." },
                { q: "Can I cancel the premium plan?", a: "Yes. Cancellation can be done at any time." },
                { q: "Does it work on mobile?", a: "Yes. The platform is adapted for mobile, tablet, and desktop." },
              ].map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-4 sm:px-5 data-[state=open]:border-primary/40 transition-colors">
                  <AccordionTrigger className="text-left text-foreground hover:no-underline py-4 text-sm sm:text-base">
                    <span className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</span>
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 text-sm">{item.a}</AccordionContent>
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
