export interface PaywallComment {
  name: string;
  quote: string;
  meta?: string;
}

export interface PaywallCommentContext {
  /** Title name, e.g. "Love of Siam". */
  title?: string | null;
  /** Raw content type from the database (movie, serie, novela, reality...). */
  type?: string | null;
}

const NAMES = [
  "Ashley", "Layla", "Camille", "Lena", "Noor", "Manon", "Mila", "Hannah",
  "Yasmin", "Elin", "Alina", "Chloé", "Anouk", "Léa", "Taylor", "Lucas",
  "Mariam", "Greta", "Rachel", "Salma", "Juliette", "Zahra", "Emily", "Omar",
];

const METAS = [
  "Monthly supporter",
  "Quarterly supporter",
  "Yearly supporter",
  "Supporter since March",
  "Supporter since January",
  "Supporter",
];

type Kind = "series" | "movie";

const kindOf = (type?: string | null): Kind => {
  const t = String(type || "").toLowerCase();
  return t === "serie" || t === "series" || t === "novela" || t === "reality" || t === "anime"
    ? "series"
    : "movie";
};

/** Comments that mention the title by name — only one is used per paywall. */
const TITLED: Record<Kind, ((t: string) => string)[]> = {
  series: [
    (t) => `${t} caught me off guard. I only meant to watch one episode.`,
    (t) => `Been looking for ${t} with decent subtitles for ages. Finally.`,
    (t) => `${t} is the kind of story I wish I'd had when I was younger.`,
    (t) => `The chemistry in ${t} is unreal. Second season when?`,
    (t) => `Finished ${t} last night and I'm still not over that ending.`,
    (t) => `${t} deserves way more attention than it ever got.`,
  ],
  movie: [
    (t) => `${t} wrecked me in the best way. Watched it twice.`,
    (t) => `Couldn't find ${t} anywhere else, honestly.`,
    (t) => `${t} is quiet and slow and completely worth it.`,
    (t) => `Still thinking about the last ten minutes of ${t}.`,
    (t) => `Put ${t} on expecting nothing. Ended up crying.`,
    (t) => `${t} is one of those films that just stays with you.`,
  ],
};

/** Short, natural comments that don't name the title and don't advertise. */
const GENERIC: string[] = [
  "Subtitles are actually well done here, which is rare.",
  "Watched on my phone on the train, worked perfectly.",
  "No ads, no weird redirects. That alone is worth it.",
  "Took me a while to decide and I regret waiting.",
  "The catalogue keeps surprising me honestly.",
  "Finally somewhere I can watch this stuff in peace.",
  "Been here a few months now, no complaints.",
  "Quality is better than I expected, not gonna lie.",
  "My girlfriend and I watch something here every weekend.",
  "Nice to have all of this in one place for once.",
  "Simple, works, nothing else to say really.",
  "Found so many titles I'd never even heard of.",
];

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

/** Deterministic, title-aware comments per content id. */
export const getPaywallComments = (
  key: string,
  count = 3,
  context?: PaywallCommentContext,
): PaywallComment[] => {
  const title = (context?.title || "").trim();
  const titled = TITLED[kindOf(context?.type)];
  const seed = hashSeed(key || "queerscenes");
  const total = Math.max(1, Math.min(count, 4));
  const out: PaywallComment[] = [];

  // 1 (sometimes 2) comment mentioning the title, the rest generic.
  const titledCount = title ? (seed % 3 === 0 ? 2 : 1) : 0;

  for (let i = 0; i < titledCount && i < total; i += 1) {
    out.push({
      name: NAMES[(seed + i * 7) % NAMES.length],
      quote: titled[(seed + i * 5) % titled.length],
      meta: METAS[(seed + i * 3) % METAS.length],
    } as unknown as PaywallComment);
    out[out.length - 1].quote = titled[(seed + i * 5) % titled.length](title);
  }

  const usedGeneric = new Set<number>();
  let step = 0;
  while (out.length < total) {
    let idx = (seed + step * 11) % GENERIC.length;
    while (usedGeneric.has(idx)) idx = (idx + 1) % GENERIC.length;
    usedGeneric.add(idx);
    out.push({
      name: NAMES[(seed + (out.length + 2) * 7) % NAMES.length],
      quote: GENERIC[idx],
      meta: METAS[(seed + out.length * 3) % METAS.length],
    });
    step += 1;
  }

  // Avoid duplicate display names.
  const seen = new Set<string>();
  return out.map((c) => {
    let name = c.name;
    let bump = 1;
    while (seen.has(name)) {
      name = NAMES[(NAMES.indexOf(c.name) + bump) % NAMES.length];
      bump += 1;
    }
    seen.add(name);
    return { ...c, name };
  });
};

/** Kept for compatibility with older imports. */
export const PAYWALL_COMMENT_POOL: PaywallComment[] = getPaywallComments("queerscenes", 3);
