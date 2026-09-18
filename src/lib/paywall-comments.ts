export interface PaywallComment {
  name: string;
  quote: string;
  meta?: string;
}

export interface PaywallCommentContext {
  title?: string | null;
  type?: string | null;
  section?: string | null;
  hasMultipleSeasons?: boolean;
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

type Kind = "series" | "movie" | "reality";

const kindOf = (type?: string | null): Kind => {
  const value = String(type || "").toLowerCase();
  if (value === "reality") return "reality";
  if (["serie", "series", "novela", "anime"].includes(value)) return "series";
  return "movie";
};

const SERIES_OPENERS = [
  (title: string) => `started ${title} just to check the first episode and suddenly i was fully invested`,
  (title: string) => `${title} really has me counting the hours until i can watch another episode`,
  (title: string) => `the episodes of ${title} keep getting better and i genuinely can't stop watching`,
  (title: string) => `i said one episode of ${title} before bed... that was a lie lol`,
  (title: string) => `${title} is the kind of series that makes every episode feel way too short`,
  (title: string) => `caught up with ${title} here and now i'm completely obsessed with the story`,
  (title: string) => `the pacing in ${title} got me hooked so fast, every episode delivers`,
  (title: string) => `watching ${title} episode by episode here has become my favorite little routine`,
  (title: string) => `${title} had me saying “one more episode” until way too late`,
  (title: string) => `i'm following every episode of ${title} here and the story has me in a chokehold`,
  (title: string) => `the drama in ${title} is unreal, i need to know what happens after every episode`,
  (title: string) => `${title} is so easy to binge here, i completely lost track of time`,
];

const MOVIE_OPENERS = [
  (title: string) => `just finished ${title} and i'm still thinking about those final scenes`,
  (title: string) => `${title} was such a beautiful surprise, the performances felt so real`,
  (title: string) => `i had been searching for ${title} forever and it was absolutely worth the watch`,
  (title: string) => `${title} got me emotional in a way i really wasn't prepared for`,
  (title: string) => `the chemistry in ${title} carried every scene, i loved this movie`,
  (title: string) => `${title} is one of those films that stays in your head after the credits`,
  (title: string) => `pressed play on ${title} out of curiosity and ended up loving every minute`,
  (title: string) => `the acting and atmosphere in ${title} were honestly on another level`,
  (title: string) => `${title} had me completely silent by the ending, what a film`,
  (title: string) => `i already want to rewatch ${title} because there were so many little details`,
  (title: string) => `${title} made me laugh, cry and stare at the screen when it ended lol`,
  (title: string) => `so glad i found ${title} here, this movie deserved my full attention`,
];

const REALITY_OPENERS = [
  (title: string) => `the cast of ${title} is pure chaos and i mean that as the biggest compliment`,
  (title: string) => `every episode of ${title} gives me something new to scream about lol`,
  (title: string) => `${title} is dangerously easy to binge, the drama never takes a break`,
  (title: string) => `i opened ${title} for one episode and stayed for all the plot twists`,
  (title: string) => `keeping up with ${title} here is honestly the highlight of my week`,
  (title: string) => `the reactions and unexpected moments in ${title} have me fully entertained`,
  (title: string) => `${title} has exactly the kind of messy energy i wanted to watch`,
  (title: string) => `not me getting this emotionally invested in everyone on ${title}`,
];

const BL_GL_OPENERS = [
  (title: string) => `the chemistry in ${title} is so natural, every little look between them hits`,
  (title: string) => `${title} had me smiling at my screen and then emotionally destroyed me`,
  (title: string) => `the leads in ${title} are everything, i could watch their scenes all day`,
  (title: string) => `${title} balances the soft moments and the drama so well, i'm obsessed`,
  (title: string) => `i've watched a lot of bl/gl stories here but ${title} really stood out to me`,
  (title: string) => `the relationship in ${title} feels so genuine, i loved watching it unfold`,
  (title: string) => `${title} gave me butterflies and emotional damage in equal amounts lol`,
  (title: string) => `watching ${title} with proper subtitles made every conversation hit harder`,
  (title: string) => `${title} is exactly the kind of story i always hope to find on this site`,
  (title: string) => `the tension in ${title}??? i was staring at the screen the entire time`,
];

const CHARACTER_OPENERS = [
  (title: string, character: string) => `${character} in ${title} had me completely invested from the first scene`,
  (title: string, character: string) => `i'm still thinking about ${character}'s story in ${title}, it was handled so well`,
  (title: string, character: string) => `${character} made every episode of ${title} impossible to stop watching`,
  (title: string, character: string) => `the way ${character} develops through ${title} genuinely got me emotional`,
  (title: string, character: string) => `${character}'s scenes were my favorite part of ${title}, such a good performance`,
  (title: string, character: string) => `i started ${title} casually and now i'm way too attached to ${character}`,
];

const SITE_ENDINGS = [
  `the subtitles on the site made every detail so easy to follow`,
  `this is why i keep checking the site for something new to watch`,
  `watching it here was smooth and the video quality looked amazing`,
  `i love finding titles like this in the site's catalog`,
  `the site made it so easy to sit down and watch everything properly`,
  `so happy the site had it with subtitles that actually made sense`,
  `this one alone made supporting the site worth it for me`,
  `i've been following the releases here and this was such a good find`,
  `the player and subtitles here made the whole experience even better`,
  `exactly the kind of hidden gem i come to this site to find`,
  `i love being able to keep up with every episode in one place here`,
  `the catalog here keeps surprising me with stories i had never seen before`,
  `i found it on the site at the perfect time and couldn't put it down`,
  `honestly one of my favorite things i've watched on the site lately`,
  `the site always comes through with the titles i can't find anywhere else`,
];

const MULTI_SEASON_ENDINGS = [
  `having all the seasons together on the site made the binge so much better`,
  `i love that i can move between seasons here without losing where i was`,
  `catching up on every season here has been way too easy lol`,
  `the site keeps all the episodes organized, which saved my binge completely`,
];

const hashSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const pickUniqueIndex = (seed: number, slot: number, length: number, used: Set<number>) => {
  let index = (seed + slot * 17 + Math.floor(seed / (slot + 3))) % length;
  while (used.has(index)) index = (index + 1) % length;
  used.add(index);
  return index;
};

export const getPaywallComments = (
  key: string,
  count = 3,
  context?: PaywallCommentContext,
): PaywallComment[] => {
  const title = (context?.title || "this title").trim();
  const kind = kindOf(context?.type);
  const section = String(context?.section || "").toLowerCase();
  const isBlGl = section === "bl" || section === "gl" || section.includes("bl drama") || section.includes("gl drama");
  const characters = Array.from(
    new Set((context?.characters || []).map((name) => name.trim()).filter(Boolean)),
  );
  const total = Math.max(1, Math.min(count, 4));
  const seed = hashSeed(`${key}|${title.toLowerCase()}|${kind}|${section}`);
  const openingPool = isBlGl
    ? BL_GL_OPENERS
    : kind === "series"
      ? SERIES_OPENERS
      : kind === "reality"
        ? REALITY_OPENERS
        : MOVIE_OPENERS;
  const endings = context?.hasMultipleSeasons && kind === "series"
    ? [...SITE_ENDINGS, ...MULTI_SEASON_ENDINGS]
    : SITE_ENDINGS;
  const usedOpenings = new Set<number>();
  const usedEndings = new Set<number>();
  const usedNames = new Set<number>();

  return Array.from({ length: total }, (_, slot) => {
    const useCharacter = characters.length > 0 && slot === seed % total;
    const opening = useCharacter
      ? CHARACTER_OPENERS[(seed + slot * 7) % CHARACTER_OPENERS.length](
          title,
          characters[(seed + slot) % characters.length],
        )
      : openingPool[pickUniqueIndex(seed, slot, openingPool.length, usedOpenings)](title);
    const ending = endings[pickUniqueIndex(Math.floor(seed / 7), slot, endings.length, usedEndings)];
    const nameIndex = pickUniqueIndex(Math.floor(seed / 13), slot, NAMES.length, usedNames);

    return {
      name: NAMES[nameIndex],
      quote: `${opening}, ${ending}`,
      meta: METAS[(seed + slot * 5) % METAS.length],
    };
  });
};

export const PAYWALL_COMMENT_POOL: PaywallComment[] = getPaywallComments("queerscenes", 3);