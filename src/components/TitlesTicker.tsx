import { motion } from "framer-motion";

const TITLES = [
  "Amor em Cores", "Vozes Livres", "Brilho Próprio", "Noites Queer",
  "Corações Rebeldes", "Arco-Íris Urbano", "O Primeiro Beijo", "Orgulho",
  "Identidade", "Nas Estrelas", "Laços Invisíveis", "Liberdade",
  "Neon Nights", "Respira Fundo", "QS: Raízes", "QS: Espelho",
  "QS: Pulso", "QS: Aurora", "Heartstopper", "Young Royals",
  "Euphoria", "Pose", "Elite", "Sex Education",
];

const TitlesTicker = () => {
  const doubled = [...TITLES, ...TITLES];

  return (
    <div className="overflow-hidden py-3 bg-muted/30 border-y border-border">
      <motion.div
        className="flex whitespace-nowrap gap-6"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((title, i) => (
          <span
            key={i}
            className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex-shrink-0"
          >
            {title}
            <span className="ml-6 text-primary/30">•</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
};

export default TitlesTicker;
