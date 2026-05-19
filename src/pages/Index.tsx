import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Lock, Heart, Film, Crown, ArrowRight, HelpCircle, Tv, Smartphone, Tablet, Eye, EyeOff, TrendingUp } from "lucide-react";
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
    // Wait a tick for the section to mount
    const timeout = setTimeout(() => {
      document.getElementById("planos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

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
            <span className="inline-block px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium neon-border-pink neon-text-pink mb-6">
              🎬 LGBTQIA+ Streaming
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-5 neon-text-purple"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            initial="hidden" animate="visible" variants={fade} custom={1}
          >
            QUEER SCENES
          </motion.h1>

          <motion.p
            className="text-[13px] sm:text-xl md:text-2xl font-semibold text-foreground max-w-[90vw] sm:max-w-2xl mx-auto mb-3 px-2 leading-snug"
            initial="hidden" animate="visible" variants={fade} custom={2}
          >
            Stream free LGBTQIA+ content now.
          </motion.p>

          <motion.p
            className="text-[11px] sm:text-base text-foreground/80 max-w-[85vw] sm:max-w-lg mx-auto mb-4 px-2 leading-relaxed font-medium"
            initial="hidden" animate="visible" variants={fade} custom={3}
          >
            Series, movies & exclusive moments — <span className="neon-text-pink">100% free</span> to start.
            <br className="hidden sm:block" />
            Become a Supporter for the full experience. 🌈
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fade} custom={4} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
              className="text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 glow-purple gap-2"
            >
              <Play className="w-5 h-5" />
              START WATCHING FREE
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm sm:text-base px-6 py-4 sm:py-5 rounded-full border-accent/40 text-accent hover:bg-accent/10 gap-2"
            >
              <Crown className="w-4 h-4" />
              BECOME A SUPPORTER
            </Button>
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
                <TrendingUp className="w-4 h-4" /> <span className="rainbow-text font-bold">TOP 10</span> THIS WEEK
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
                  <div className="mt-2">
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">€15.99</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">
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
                    <span>More than 50 people already support the project</span>
                  </div>
                  <Button
                    onClick={() => window.open("https://t.me/L7kznr?text=Hi%20I%20came%20from%20your%20website%20and%20I%27m%20interested%20in%20becoming%20a%20Supporter%20can%20you%20give%20me%20more%20details", "_blank")}
                    className="shine-cta w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 glow-purple gap-2"
                  >
                    <Crown className="w-4 h-4" /> Become a Supporter
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground mt-2">
                    Manual activation by the project creator on Telegram
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Supporter subscription options */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={3} className="mt-10 max-w-4xl mx-auto">
            <p className="text-center text-sm sm:text-base text-muted-foreground mb-4">
              Supporter subscription options
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Monthly",
                  price: "€15.99",
                  period: "/month",
                  note: "",
                  color: "neon-text-pink",
                  border: "neon-border-pink",
                  btn: "bg-accent text-accent-foreground hover:bg-accent/90 glow-pink",
                  msg: "Hi%20I%20want%20the%20Monthly%20Supporter%20plan%20%E2%82%AC15.99",
                },
                {
                  label: "Quarterly",
                  price: "€42.99",
                  period: "/3 months",
                  note: "save €4.98",
                  color: "neon-text-purple",
                  border: "neon-border-purple",
                  btn: "bg-primary text-primary-foreground hover:bg-primary/90 glow-purple",
                  msg: "Hi%20I%20want%20the%20Quarterly%20Supporter%20plan%20%E2%82%AC42.99",
                },
                {
                  label: "Yearly",
                  price: "€159.99",
                  period: "/year",
                  note: "save €31.89",
                  color: "neon-text-blue",
                  border: "border-secondary/40",
                  btn: "bg-secondary text-secondary-foreground hover:bg-secondary/90 glow-blue",
                  msg: "Hi%20I%20want%20the%20Yearly%20Supporter%20plan%20%E2%82%AC159.99",
                },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => window.open(`https://t.me/L7kznr?text=${opt.msg}`, "_blank")}
                  className={`text-left rounded-xl bg-card border p-4 transition-all hover:scale-[1.02] ${opt.border}`}
                >
                  <p className={`text-sm font-semibold ${opt.color}`}>{opt.label}</p>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-foreground">{opt.price}</span>
                    <span className="text-xs text-muted-foreground ml-1">{opt.period}</span>
                  </div>
                  {opt.note && <p className="text-[11px] text-secondary mt-0.5">{opt.note}</p>}
                  <div className={`mt-3 inline-flex items-center justify-center w-full rounded-full px-3 py-1.5 text-xs font-semibold ${opt.btn}`}>
                    <Crown className="w-3 h-3 mr-1" /> Choose
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
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
                { q: "Is Queer Scenes free?", a: "Yes. We have free content available. We also offer a premium plan with full access." },
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
