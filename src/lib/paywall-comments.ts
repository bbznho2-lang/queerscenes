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
  /** Whether the series has more than one season. Avoids "next season" comments when seasons already exist. */
  hasMultipleSeasons?: boolean;
}

const NAMES = [
  "Ashley", "Layla", "Camille", "Lena", "Noor", "Manon", "Mila", "Hannah",
  "Yasmin", "Elin", "Alina", "Chloé", "Anouk", "Léa", "Taylor", "Lucas",
  "Mariam", "Greta", "Rachel", "Salma", "Juliette", "Zahra", "Emily", "Omar",
  "Inès", "Aisha", "Fatima", "Megan", "Brittany", "Kayla", "Courtney", "Jessica",
  "Madison", "Amira", "Lina", "Huda", "Felix", "Matthias", "Khalid", "Jackson",
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

/** Title-specific comments written like real people talk — casual, lowercase, emojis, no direct ads. */
const TITLED: Record<Kind, ((t: string) => string)[]> = {
  series: [
    (t) => `omg ${t} ate me upppp i binged the whole thing in one weekend lol`,
    (t) => `the chemistry in ${t} is actually insane`,
    (t) => `${t} is so good it made me download telegram just to talk about it`,
    (t) => `i started ${t} at 11pm and didn't sleep. worth it`,
    (t) => `the acting in ${t}??? hello??? give them all awards`,
    (t) => `${t} had no business being this addictive`,
    (t) => `finally watching ${t} with decent subs, bless`,
    (t) => `${t} made me feel so seen i can't even explain`,
  ],
  movie: [
    (t) => `${t} wrecked me. still thinking about the ending`,
    (t) => `just watched ${t} and i'm actually emotional`,
    (t) => `${t} is so underrated it's criminal`,
    (t) => `the ending of ${t} lives in my head rent free`,
    (t) => `${t} made me cry and i don't even cry at movies`,
    (t) => `i've been looking for ${t} forever finally found it here`,
    (t) => `${t} is quiet and slow and completely worth it`,
    (t) => `${t} is one of those films that just stays with you`,
  ],
};

/** Extra series comments that only make sense when there's only one season. */
const SINGLE_SEASON_SERIES: ((t: string) => string)[] = [
  (t) => `i need a season 2 of ${t} asap`,
  (t) => `${t} ended and now i have a hole in my heart lol`,
  (t) => `they really left ${t} like that?? i need more episodes`,
];

/** Short, natural comments that sound like real users — no direct advertising. */
const GENERIC: string[] = [
  "no ads no virus no weird links lol finally",
  "the subs here are actually decent which is rare",
  "my friend sent me here and i haven't left since",
  "watched on my phone and it worked perfectly",
  "the quality is better than i expected ngl",
  "finally a place that actually has these titles",
  "i've been here for months and the updates keep getting better",
  "my partner and i watch something here every weekend",
  "worth it just to not deal with sketchy sites",
  "found so many titles i never heard of before",
  "simple and works, that's all i need",
  "the new drops every month keep me hooked",
  "took me a while to decide and i regret waiting",
  "honestly didn't expect the catalog to be this good",
  "this is the only place i found this with real subtitles",
  "been searching for ages, so glad i found this",
  "works on my tv through browser, no issues",
  "the rare titles here are everything",
  "i come back every week to see what's new",
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
  const kind = kindOf(context?.type);
  const hasMultipleSeasons = Boolean(context?.hasMultipleSeasons);

  // Build the title-specific pool. For series with multiple seasons, drop comments that ask for more seasons.
  const titledBase = TITLED[kind];
  const titledPool = kind === "series" && !hasMultipleSeasons
    ? [...titledBase, ...SINGLE_SEASON_SERIES]
    : titledBase;

  const seed = hashSeed(key || "queerscenes");
  const total = Math.max(1, Math.min(count, 4));
  const out: PaywallComment[] = [];

  // 1 (sometimes 2) comment mentioning the title, the rest generic.
  const titledCount = title ? (seed % 3 === 0 ? 2 : 1) : 0;

  for (let i = 0; i < titledCount && i < total; i += 1) {
    out.push({
      name: NAMES[(seed + i * 7) % NAMES.length],
      quote: titledPool[(seed + i * 5) % titledPool.length](title),
      meta: METAS[(seed + i * 3) % METAS.length],
    });
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
