import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Lock, Sparkles, Diamond, Star, Zap, Heart, Film, Crown, ArrowRight, HelpCircle, Tv, Smartphone, Tablet, Eye, EyeOff } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import heroBgMobile from "@/assets/hero-bg-mobile.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, signIn, signUp } = useAuth();

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

  const showNameFields = isSignUp;
  const showSubscribeActions = !authLoading && !profileLoading && !isAdmin && !isPremiumUser;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      navigate("/browse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-center justify-center px-4 py-16">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover hidden sm:block" />
        <img src={heroBgMobile} alt="" className="absolute inset-0 w-full h-full object-cover sm:hidden" />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={fade} custom={0}>
            <span className="inline-block px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium neon-border-pink neon-text-pink mb-6">
              🎬 LGBTQIA+ Streaming
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-5 neon-text-purple"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            initial="hidden" animate="visible" variants={fade} custom={1}
          >
            QUEER SCENES
          </motion.h1>

          <motion.p className="text-base sm:text-xl text-muted-foreground max-w-xl mx-auto mb-3 font-light" initial="hidden" animate="visible" variants={fade} custom={2}>
            The streaming platform made for the LGBTQIA+ community.
          </motion.p>

          <motion.p className="text-sm sm:text-base text-muted-foreground/70 max-w-md mx-auto mb-8" initial="hidden" animate="visible" variants={fade} custom={3}>
            Relive the most iconic, emotional, and unforgettable moments from cinema and TV with real representation. 🌈
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fade} custom={4}>
            <Button
              size="lg"
              onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
              className="text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 glow-blue gap-2"
            >
              <Play className="w-5 h-5" />
              ACCESS QUEER SCENES
            </Button>
          </motion.div>
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
                <CardTitle className="text-xl sm:text-2xl neon-text-pink">LOGIN</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Sign in to continue</p>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  {showNameFields && (
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
                   <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple">
                     {loading ? "Signing in..." : isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
                   </Button>
                   <p className="text-center text-sm text-muted-foreground">
                     {isSignUp ? "Already have an account? " : "Don't have an account? "}
                     <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-secondary hover:underline font-medium">
                       {isSignUp ? "Sign in" : "Create account"}
                     </button>
                   </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl font-bold">
              <Film className="inline w-8 sm:w-10 h-8 sm:h-10 mr-2 text-primary" />
              ABOUT <span className="neon-text-purple">QUEER SCENES</span>
            </h2>
          </motion.div>

          <motion.p className="text-base sm:text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}>
            A streaming platform exclusively dedicated to stories and productions with LGBTQIA+ protagonism.
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Star, text: "Iconic moments from queer cinema" },
              { icon: Heart, text: "Series with real representation" },
              { icon: Sparkles, text: "Scenes that marked generations" },
              { icon: Crown, text: "Exclusive content for members" },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i + 2}>
                <Card className="bg-card border-border hover:border-primary/40 transition-all group">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground text-sm sm:text-base">{item.text}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY DIFFERENT */}
      <section className="py-16 sm:py-24 px-4 relative">
        <div className="absolute inset-0 bg-muted/20" />
        <div className="relative max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl font-bold">
              <Diamond className="inline w-8 sm:w-10 h-8 sm:h-10 mr-2 text-secondary" />
              WHY IS IT <span className="neon-text-blue">DIFFERENT</span>?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "100% LGBTQIA+ curated content",
              "Modern and immersive interface",
              "Free + exclusive content",
              "Premium experience",
              "Community and representation",
              "Multi-platform and accessible",
              "Constant updates",
              "Security and privacy",
              "Dedicated 24/7 support",
            ].map((text, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={i + 1}
                className="flex items-center gap-3 p-4 rounded-xl bg-card neon-border-purple"
              >
                <div className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                <span className="text-foreground text-sm sm:text-base">{text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div className="text-center mt-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={7}>
            <p className="text-lg text-muted-foreground">It's not just watching.</p>
            <p className="text-2xl sm:text-3xl font-bold neon-text-purple mt-1">It's belonging.</p>
          </motion.div>
        </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl font-bold">
              🌈 <span className="rainbow-text">PREMIUM PLANS</span>
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">Choose the ideal plan for you</p>
            {!showSubscribeActions && !authLoading && !profileLoading && (
              <p className="text-secondary mt-3 text-sm font-medium">Your account already has premium access.</p>
            )}
          </motion.div>

          {/* Premium Benefits */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1} className="mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {[
                { icon: Crown, text: "All Premium content unlocked" },
                { icon: Zap, text: "Early releases before everyone" },
                { icon: Heart, text: "Request what you want to watch" },
                { icon: Star, text: "Complete and unlimited access" },
                { icon: Film, text: "Exclusive collection of scenes and series" },
                { icon: Sparkles, text: "Priority 24/7 support" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Price Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={2}>
              <Card className="bg-card neon-border-purple h-full">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl neon-text-purple">Monthly</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div>
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">€15.99</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <p className="text-muted-foreground text-sm">Cancel anytime</p>
                  {showSubscribeActions && (
                    <Button
                      onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
                      className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 glow-purple"
                    >
                      WATCH NOW
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={3}>
              <Card className="h-full neon-border-pink neon-pulse bg-card overflow-hidden relative">
                <div className="absolute top-0 right-0 left-0">
                  <span className="block w-full text-center py-1.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                    🔥 2 MONTHS FREE
                  </span>
                </div>
                <CardHeader className="text-center pb-2 pt-10">
                  <CardTitle className="text-xl neon-text-pink">Yearly</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div>
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">€159.99</span>
                    <span className="text-muted-foreground text-sm">/year</span>
                  </div>
                  <p className="text-muted-foreground text-sm">That's ~€13.33/month</p>
                  {showSubscribeActions && (
                    <Button
                      onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
                      className="w-full rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 glow-blue"
                    >
                      WATCH NOW
                    </Button>
                  )}
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
            <h2 className="text-3xl sm:text-5xl font-bold mb-6">
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
            <h2 className="text-3xl sm:text-5xl font-bold">
              <HelpCircle className="inline w-8 sm:w-10 h-8 sm:h-10 mr-2 text-secondary" />
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
