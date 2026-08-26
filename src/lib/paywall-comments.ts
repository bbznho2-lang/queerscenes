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

/**
 * Templates praising the specific title, then the site, then inviting the
 * reader to join the community and follow the next releases.
 */
const TEMPLATES: Record<Kind, ((t: string) => string)[]> = {
  series: [
    (t) => `${t} is genuinely one of the best queer series I've watched — the acting got me from the first episode. Queer Scenes subtitles it properly, which nobody else does. Join us and you'll catch every new release first.`,
    (t) => `I binged ${t} in two nights and I'm still thinking about it. The site is clean, no pop-ups, no broken links — being part of this community means new episodes keep landing every month.`,
    (t) => `${t} has the kind of story we rarely get to see, and Queer Scenes is the only place keeping it alive with real subtitles. Becoming a supporter is how you get the next premieres too.`,
    (t) => `Every episode of ${t} hit harder than the last. Honestly the platform itself is a joy to use — join the community and you'll never miss what drops next.`,
    (t) => `${t} deserves way more attention. The team here subtitled it with so much care, and supporting means more series like it arrive every single month.`,
    (t) => `Started ${t} out of curiosity and stayed for the whole season. Queer Scenes keeps adding rare titles — joining is the easiest way to follow every new release.`,
  ],
  movie: [
    (t) => `${t} is a beautiful film — I cried and then rewatched it the same week. Queer Scenes subtitles rare queer cinema like this properly, and supporters get every new premiere.`,
    (t) => `I looked everywhere for ${t} and only found it here, with subtitles that actually make sense. The site is smooth, and joining means you follow all the upcoming releases.`,
    (t) => `${t} stayed with me for days. What I love is that this community keeps rescuing films like it — become a supporter and the next premieres come to you.`,
    (t) => `Watched ${t} on my phone during a break and it completely got me. No ads, no sketchy links, just a great platform — and new titles land every month for supporters.`,
    (t) => `${t} is exactly the kind of queer film that never gets a proper release. Queer Scenes gave it one. Joining keeps that going and gets you every new drop.`,
    (t) => `Gorgeous movie, gorgeous subtitles. ${t} alone was worth joining, and then the community kept surprising me with new releases.`,
  ],
};

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
  const title = (context?.title || "").trim() || "this title";
  const templates = TEMPLATES[kindOf(context?.type)];
  const seed = hashSeed(key || "queerscenes");
  const total = Math.min(count, templates.length);
  const out: PaywallComment[] = [];
  for (let i = 0; i < total; i += 1) {
    const tIdx = (seed + i * 5) % templates.length;
    const nIdx = (seed + i * 7) % NAMES.length;
    const mIdx = (seed + i * 3) % METAS.length;
    out.push({ name: NAMES[nIdx], quote: templates[tIdx](title), meta: METAS[mIdx] });
  }
  return out;
};

/** Kept for compatibility with older imports. */
export const PAYWALL_COMMENT_POOL: PaywallComment[] = getPaywallComments("queerscenes", 3);
