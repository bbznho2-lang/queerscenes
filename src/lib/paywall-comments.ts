export interface PaywallComment {
  name: string;
  quote: string;
  meta?: string;
}

// Friction-reducing supporter comments. Each title deterministically shows a
// different trio, so no two paywalls read the same.
export const PAYWALL_COMMENT_POOL: PaywallComment[] = [
  { name: "Ashley", quote: "I hesitated for two weeks and regretted it — subscribing took 40 seconds and I was watching the same minute.", meta: "Supporter since March" },
  { name: "Layla", quote: "Cheaper than one coffee a month and I get titles I couldn't find anywhere else. Easiest yes ever.", meta: "Quarterly supporter" },
  { name: "Camille", quote: "I stayed because something new drops every month. It never feels like I paid once and got nothing after.", meta: "Yearly supporter" },
  { name: "Lena", quote: "Signed up on my phone during a break. No app, no card drama, it just worked.", meta: "Monthly supporter" },
  { name: "Noor", quote: "The subtitles are actually good — that alone was worth it. Everything else is a bonus.", meta: "Supporter" },
  { name: "Manon", quote: "I kept looking for free links for months. Ten minutes here beat all of it.", meta: "Supporter since January" },
  { name: "Mila", quote: "Cancel whenever, so there was really nothing to think about. I never wanted to.", meta: "Quarterly supporter" },
  { name: "Hannah", quote: "I came for one title and stayed for the releases. My list is longer than my free time now.", meta: "Yearly supporter" },
  { name: "Yasmin", quote: "Support goes straight into subtitling more rare queer titles. That's why I renewed.", meta: "Supporter" },
  { name: "Elin", quote: "Instant access after paying — no waiting, no email chase. Watched it that night.", meta: "Monthly supporter" },
  { name: "Alina", quote: "I put it off thinking I'd find it elsewhere. I didn't. Just start now, honestly.", meta: "Supporter" },
  { name: "Chloé", quote: "Being a supporter feels like keeping a little queer cinema shelf alive. Worth every month.", meta: "Yearly supporter" },
  { name: "Anouk", quote: "The monthly plan is tiny and you can switch to yearly later. Zero risk to try.", meta: "Monthly supporter" },
  { name: "Léa", quote: "I watched three titles the first weekend. It paid for itself immediately.", meta: "Supporter" },
  { name: "Taylor", quote: "The whole point is staying — new episodes keep landing and I don't want to miss them.", meta: "Quarterly supporter" },
  { name: "Lucas", quote: "Clean player, no pop-ups, no sketchy sites. That comfort alone is the price.", meta: "Supporter" },
  { name: "Mariam", quote: "I asked for a title and they added it. Never had that anywhere else.", meta: "Yearly supporter" },
  { name: "Greta", quote: "Don't wait for a 'better moment'. The catalog is here now and it keeps growing.", meta: "Supporter since February" },
  { name: "Rachel", quote: "I renewed without thinking twice. Every month there's something I want to watch.", meta: "Monthly supporter" },
  { name: "Salma", quote: "Took me one minute to join and I've been here since. Nothing to lose.", meta: "Supporter" },
  { name: "Juliette", quote: "It's the only place I found this with proper subtitles. I stopped searching.", meta: "Quarterly supporter" },
  { name: "Zahra", quote: "Staying subscribed means I always catch premieres on day one.", meta: "Yearly supporter" },
];

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

/** Deterministic, distinct comments per title id. */
export const getPaywallComments = (key: string, count = 3): PaywallComment[] => {
  const pool = PAYWALL_COMMENT_POOL;
  const seed = hashSeed(key || "queerscenes");
  const step = 7; // coprime with most pool sizes → good spread
  const picked: PaywallComment[] = [];
  const used = new Set<number>();
  for (let i = 0; picked.length < Math.min(count, pool.length) && i < pool.length * 2; i += 1) {
    const idx = (seed + i * step) % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(pool[idx]);
  }
  return picked;
};
