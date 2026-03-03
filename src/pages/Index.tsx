import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Lock, Sparkles, Diamond, Star, Zap, Heart, Film, Crown, ArrowRight, HelpCircle, Tv, Smartphone, Tablet, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Index = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/browse");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* HERO */}
      <section className="relative min-h-[100svh] flex items-center justify-center px-4 py-16">
        {/* BG glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-60 sm:w-80 h-60 sm:h-80 rounded-full bg-secondary/10 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-accent/12 blur-[110px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={fade} custom={0}>
            <span className="inline-block px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium neon-border-pink text-accent mb-6">
              🎬 Streaming LGBTQIA+
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-5 rainbow-text"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            initial="hidden" animate="visible" variants={fade} custom={1}
          >
            QUEER SCENES
          </motion.h1>

          <motion.p className="text-base sm:text-xl text-muted-foreground max-w-xl mx-auto mb-3 font-light" initial="hidden" animate="visible" variants={fade} custom={2}>
            O streaming feito para a comunidade LGBTQIA+.
          </motion.p>

          <motion.p className="text-sm sm:text-base text-muted-foreground/70 max-w-md mx-auto mb-8" initial="hidden" animate="visible" variants={fade} custom={3}>
            Reviva os momentos mais icônicos, emocionantes e inesquecíveis do cinema e das séries com representatividade real. 🌈
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fade} custom={4}>
            <Button
              size="lg"
              onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
              className="text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 glow-pink gap-2"
            >
              <Play className="w-5 h-5" />
              ACESSAR O QUEER SCENES
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
                <CardTitle className="text-xl sm:text-2xl neon-text-pink">ÁREA DE ACESSO</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Entre para continuar</p>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">E-mail</label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-muted border-border focus:border-primary"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Senha</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
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
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple">
                    ENTRAR
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Não tem conta?{" "}
                    <button type="button" className="text-secondary hover:underline font-medium">Criar acesso</button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* SOBRE */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl font-bold">
              <Film className="inline w-8 sm:w-10 h-8 sm:h-10 mr-2 text-primary" />
              SOBRE O <span className="neon-text-purple">QUEER SCENES</span>
            </h2>
          </motion.div>

          <motion.p className="text-base sm:text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}>
            Uma plataforma de streaming dedicada exclusivamente a histórias e produções com protagonismo LGBTQIA+.
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Star, text: "Momentos icônicos do cinema queer" },
              { icon: Heart, text: "Séries com representatividade real" },
              { icon: Sparkles, text: "Cenas que marcaram gerações" },
              { icon: Crown, text: "Conteúdos exclusivos para membros" },
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

      {/* DIFERENCIAL */}
      <section className="py-16 sm:py-24 px-4 relative">
        <div className="absolute inset-0 bg-muted/20" />
        <div className="relative max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl font-bold">
              <Diamond className="inline w-8 sm:w-10 h-8 sm:h-10 mr-2 text-secondary" />
              POR QUE É <span className="neon-text-blue">DIFERENTE</span>?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Curadoria 100% LGBTQIA+",
              "Interface moderna e imersiva",
              "Conteúdo gratuito + exclusivo",
              "Experiência premium",
              "Comunidade e representatividade",
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
            <p className="text-lg text-muted-foreground">Não é só assistir.</p>
            <p className="text-2xl sm:text-3xl font-bold neon-text-purple mt-1">É pertencer.</p>
          </motion.div>
        </div>
      </section>

      {/* PLANOS */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0} className="text-center mb-10">
            <h2 className="text-3xl sm:text-5xl font-bold">
              🌈 <span className="rainbow-text">PLANOS</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={1}>
              <Card className="bg-card border-border h-full">
                <CardHeader className="text-center"><CardTitle className="text-xl">Free</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {["Acesso a conteúdos selecionados", "Atualizações semanais"].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Sparkles className="w-4 h-4 text-secondary shrink-0" /><span>{t}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={2}>
              <Card className="h-full neon-border-purple neon-pulse bg-card overflow-hidden">
                <CardHeader className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary mb-2">RECOMENDADO</span>
                  <CardTitle className="text-xl neon-text-purple">Premium</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {["Acesso completo", "Conteúdos exclusivos", "Lançamentos antecipados", "Experiência sem limites"].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Zap className="w-4 h-4 text-secondary shrink-0" /><span>{t}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DISPOSITIVOS */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}>
            <h2 className="text-3xl sm:text-5xl font-bold mb-6">
              Assista em <span className="neon-text-blue">qualquer lugar</span>
            </h2>
            <div className="flex justify-center gap-8 sm:gap-12 mt-8">
              {[
                { icon: Smartphone, label: "Celular" },
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
                { q: "O Queer Scenes é gratuito?", a: "Sim. Temos conteúdos gratuitos disponíveis. Também oferecemos plano premium com acesso completo." },
                { q: "Preciso criar uma conta?", a: "Sim. Para acessar o conteúdo é necessário criar login com e-mail e senha." },
                { q: "O conteúdo é apenas LGBTQIA+?", a: "Sim. O foco da plataforma é exclusivamente histórias, cenas e produções com representatividade LGBTQIA+." },
                { q: "Posso cancelar o plano premium?", a: "Sim. O cancelamento pode ser feito a qualquer momento." },
                { q: "Funciona no celular?", a: "Sim. A plataforma é adaptada para celular, tablet e desktop." },
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

      {/* CTA FINAL */}
      <section className="py-16 sm:py-24 px-4 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fade} custom={0}>
          <Button
            size="lg"
            onClick={() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth" })}
            className="text-base sm:text-lg px-10 py-6 sm:py-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 glow-purple gap-3"
          >
            ACESSAR O QUEER SCENES
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </section>

      <footer className="border-t border-border py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
        <p>© 2026 Queer Scenes. Todos os direitos reservados. 🌈</p>
      </footer>
    </div>
  );
};

export default Index;
