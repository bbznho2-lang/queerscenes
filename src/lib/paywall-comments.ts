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
  /** Catalog section (series, filmes, novelas, bl, gl, realities, exclusivos...). */
  section?: string | null;
  /** Whether the series has more than one season. Avoids "next season" comments when seasons already exist. */
  hasMultipleSeasons?: boolean;
  /** Character names configured in Edit details. */
  characters?: string[];
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

/** Title-specific comments written like real people talk — casual, lowercase, emojis. */
const TITLED: Record<Kind, ((t: string) => string)[]> = {
  series: [
    (t) => `omg ${t} ate me upppp i binged the whole thing in one weekend lol`,
    (t) => `the chemistry in ${t} is actually insane`,
    (t) => `i started ${t} at 11pm and didn't sleep. worth it`,
    (t) => `the acting in ${t}??? hello??? give them all awards`,
    (t) => `${t} had no business being this addictive`,
    (t) => `finally watching ${t} with decent subs, bless`,
    (t) => `${t} made me feel so seen i can't even explain`,
    (t) => `the reactions to ${t} every week are everything`,
    (t) => `i wait for every new drop of ${t} like it's an event`,
    (t) => `people are sleeping on ${t} and i'm tired`,
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
    (t) => `everyone's reaction to ${t} was so real`,
    (t) => `i put off ${t} for too long, so glad i finally watched`,
  ],
};

/** Extra series comments that only make sense when there's only one season. */
const SINGLE_SEASON_SERIES: ((t: string) => string)[] = [
  (t) => `i need a season 2 of ${t} asap`,
  (t) => `${t} ended and now i have a hole in my heart lol`,
  (t) => `they really left ${t} like that?? i need more episodes`,
];

/** BL/GL titles are usually closed stories — comments follow the site, not future seasons. */
const BLGL_TITLED: ((t: string) => string)[] = [
  (t) => `${t} is exactly the kind of story i only find here, i follow every new release on the site`,
  (t) => `been keeping up with everything dropping on the site and ${t} is easily my favorite so far`,
  (t) => `i check the site almost daily and ${t} was so worth the wait`,
  (t) => `${t} broke my heart in the best way, glad i caught it here`,
  (t) => `every time i open the site there's something new, but ${t} is the one i keep rewatching`,
  (t) => `the leads in ${t} have the most beautiful chemistry, watched it twice already`,
  (t) => `${t} had me smiling at my phone like an idiot, the site never misses`,
  (t) => `i follow all the bl/gl drops here and ${t} is top tier, trust me`,
  (t) => `${t} is so soft and so painful at the same time, i'm obsessed`,
  (t) => `watching ${t} here with proper subs made every scene hit harder`,
];

/** Reactions about the title itself — no chat groups, no promises of future seasons. */
const REACTION_STARTS = [
  "i clicked out of curiosity and ended up watching the whole thing",
  "was not ready for how invested i got",
  "i genuinely lost track of time watching this one",
  "me and my partner could not stop reacting to every scene",
  "i thought i'd watch ten minutes and suddenly it was over",
  "i'm still processing what i just watched",
  "the way i cancelled all my plans to finish this lol",
  "started watching on my phone and moved to the tv immediately",
  "i was hooked way faster than i expected",
  "this one had me pausing just to breathe",
  "i watched it twice in the same week, no regrets",
  "this was exactly the kind of story i wanted that night",
];

const REACTION_ENDS = [
  "the performances were sooo good",
  "and the subtitles made every little detail land",
  "definitely one i'm going to think about for a while",
  "the chemistry had me yelling at my screen",
  "honestly such a good find",
  "the ending had me completely silent",
  "i already know i'm rewatching it",
  "the emotional damage was real 😭",
  "the quality was way better than i expected ngl",
  "and somehow it got better with every scene",
  "i need everyone i know to watch this",
  "still thinking about those final scenes",
  "what a ride from beginning to end",
  "the cast really gave everything",
  "worth staying up way too late for",
];

/** Closing lines about loving the platform experience. */
const PLATFORM_ENDS = [
  "i love watching stuff like this on the platform",
  "watching here is always such a smooth experience, i love it",
  "i love that i can watch titles like this properly subtitled here",
  "honestly the reason i keep watching everything here",
  "i love how easy the platform makes it to just sit and watch",
  "watching on this platform has become my favorite way to unwind",
  "i love the catalog here, it never disappoints me",
  "the platform makes finding stories like this so worth it",
  "i've been following every release here and it never lets me down",
  "the site keeps dropping gems like this and i'm here for all of it",
  "i literally refresh the site to see what's new, that's how good it's been",
];

const CHARACTER_REACTIONS = [
  (t: string, c: string) => `${c} in ${t} had me completely invested`,
  (t: string, c: string) => `i could watch ${c} in ${t} for hours honestly`,
  (t: string, c: string) => `${c}'s scenes in ${t} were everything`,
  (t: string, c: string) => `the way ${c}'s story unfolds in ${t} really got me`,
  (t: string, c: string) => `${c} made ${t} impossible to stop watching`,
  (t: string, c: string) => `i'm still thinking about ${c} after watching ${t}`,
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
  const characters = (context?.characters || []).map((name) => name.trim()).filter(Boolean);

  // Build the title-specific pool. For series with multiple seasons, drop comments that ask for more seasons.
  const titledBase = TITLED[kind];
  const titledPool = kind === "series" && !hasMultipleSeasons
    ? [...titledBase, ...SINGLE_SEASON_SERIES]
    : titledBase;

  // Use the complete title context so two different titles cannot accidentally
  // receive the same selection merely because their id hashes share a remainder.
  const seed = hashSeed(`${key || "queerscenes"}|${title.toLowerCase()}|${kind}`);
  const total = Math.max(1, Math.min(count, 4));
  const out: PaywallComment[] = [];

  // 1 (sometimes 2) comment mentioning the title, the rest generic.
  const titledCount = title ? (seed % 3 === 0 ? 2 : 1) : 0;

  for (let i = 0; i < titledCount && i < total; i += 1) {
    const base = characters.length && i === 0
      ? CHARACTER_REACTIONS[(seed + i * 5) % CHARACTER_REACTIONS.length](title, characters[seed % characters.length])
      : titledPool[(seed + i * 5) % titledPool.length](title);
    out.push({
      name: NAMES[(seed + i * 7) % NAMES.length],
      quote: `${base}, ${PLATFORM_ENDS[(seed + i * 3) % PLATFORM_ENDS.length]}`,
      meta: METAS[(seed + i * 3) % METAS.length],
    });
  }

  const usedReactions = new Set<string>();
  let step = 0;
  while (out.length < total) {
    const slot = out.length;
    const startIdx = (seed + step * 11 + slot * 3) % REACTION_STARTS.length;
    const endIdx = (Math.floor(seed / 7) + step * 13 + slot * 5) % REACTION_ENDS.length;
    const platformIdx = (Math.floor(seed / 17) + slot * 7 + 5) % PLATFORM_ENDS.length;
    const subject = title || "this one";
    let quote = slot === total - 1
      ? `${subject} was such a good watch, ${PLATFORM_ENDS[platformIdx]}`
      : `${REACTION_STARTS[startIdx]}, ${REACTION_ENDS[endIdx]}`;
    while (usedReactions.has(quote)) {
      step += 1;
      const nextEnd = (endIdx + step) % REACTION_ENDS.length;
      quote = `${REACTION_STARTS[startIdx]}, ${REACTION_ENDS[nextEnd]}`;
    }

    usedReactions.add(quote);
    out.push({
      name: NAMES[(seed + (out.length + 2) * 7) % NAMES.length],
      quote,
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
