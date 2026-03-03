import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Lock, Sparkles, Diamond, Star, Zap, Heart, Film, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const Index = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/10 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-muted text-primary border border-border mb-8">
              🎬 Streaming LGBTQIA+
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            <span className="rainbow-text">QUEER SCENES</span>
          </motion.h1>

          <motion.p
            className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4 font-light"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            O streaming feito para a comunidade LGBTQIA+.
          </motion.p>

          <motion.p
            className="text-base sm:text-lg text-muted-foreground/80 max-w-xl mx-auto mb-10"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            Reviva os momentos mais icônicos, emocionantes e inesquecíveis do cinema e das séries com representatividade real.
            Uma plataforma feita para quem quer se ver na tela. 🌈
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
            <Button size="lg" className="text-lg px-10 py-6 rounded-full glow-primary bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <Play className="w-5 h-5" />
              ACESSAR O QUEER SCENES
            </Button>
          </motion.div>
        </div>
      </section>

      {/* LOGIN */}
      <section className="relative py-20 px-4">
        <div className="max-w-md mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Card className="bg-card border-border glow-rainbow rainbow-border overflow-hidden">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-2xl">ÁREA DE ACESSO</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Entre para continuar</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">E-mail</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Senha</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
                  ENTRAR
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Não tem conta?{" "}
                  <button className="text-primary hover:underline font-medium">Criar acesso</button>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* SOBRE */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <Film className="inline w-10 h-10 mr-3 text-primary" />
              SOBRE O <span className="rainbow-text">QUEER SCENES</span>
            </h2>
          </motion.div>

          <motion.p
            className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
          >
            O Queer Scenes é uma plataforma de streaming dedicada exclusivamente a histórias, cenas e produções com protagonismo LGBTQIA+.
          </motion.p>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Star, text: "Momentos icônicos do cinema queer" },
              { icon: Heart, text: "Séries com representatividade real" },
              { icon: Sparkles, text: "Cenas emocionantes que marcaram gerações" },
              { icon: Crown, text: "Conteúdos exclusivos para membros" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 2}
              >
                <Card className="bg-card border-border hover:border-primary/40 transition-colors group">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{item.text}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.p
            className="text-center text-muted-foreground mt-10 max-w-lg mx-auto"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={6}
          >
            Nossa missão é criar um espaço onde a comunidade possa assistir, se emocionar e se sentir representada.
          </motion.p>
        </div>
      </section>

      {/* DIFERENCIAL */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-muted/30" />
        <div className="relative max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <Diamond className="inline w-10 h-10 mr-3 text-accent" />
              POR QUE É <span className="rainbow-text">DIFERENTE</span>?
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              "Curadoria 100% LGBTQIA+",
              "Interface moderna e imersiva",
              "Conteúdo gratuito + exclusivo",
              "Experiência premium",
              "Comunidade que apoia representatividade",
            ].map((text, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
              >
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="text-foreground">{text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-14"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={7}
          >
            <p className="text-xl text-muted-foreground">Não é só assistir.</p>
            <p className="text-3xl font-bold rainbow-text mt-1">É pertencer.</p>
          </motion.div>
        </div>
      </section>

      {/* PLANOS */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <h2 className="text-4xl sm:text-5xl font-bold">
              🌈 <span className="rainbow-text">PLANOS</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="bg-card border-border h-full">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Free</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {["Acesso a conteúdos selecionados", "Atualizações semanais"].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="w-4 h-4 text-secondary shrink-0" />
                      <span>{t}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <Card className="border-primary/50 h-full glow-primary rainbow-border overflow-hidden bg-card">
                <CardHeader className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary mb-2">
                    RECOMENDADO
                  </span>
                  <CardTitle className="text-2xl rainbow-text">Premium</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Acesso completo",
                    "Conteúdos exclusivos",
                    "Lançamentos antecipados",
                    "Experiência sem limites",
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="w-4 h-4 text-accent shrink-0" />
                      <span>{t}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <Button size="lg" className="text-lg px-12 py-7 rounded-full glow-primary bg-primary text-primary-foreground hover:bg-primary/90 gap-3">
            ACESSAR O QUEER SCENES
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 Queer Scenes. Todos os direitos reservados. 🌈</p>
      </footer>
    </div>
  );
};

export default Index;
