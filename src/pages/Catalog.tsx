import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUniqueItemsByTitle } from "@/lib/top-content";
import { slugify } from "@/lib/slug";

interface CatalogItem {
  id: string;
  title: string;
  synopsis: string | null;
  tag: string | null;
  banner_url: string | null;
  is_archived?: boolean;
}

const PAGE_TITLE = "Catalog — LGBT series subtitled, queer movies & GL dramas | QueerScenes";
const PAGE_DESC = "Browse the full QueerScenes catalog of LGBTQIA+ movies, GL dramas, queer series and soap operas with subtitles.";
const CANONICAL = "https://queerscenes.lovable.app/catalog";

const setMeta = (selector: string, attr: string, value: string) => {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      (el as HTMLLinkElement).rel = "canonical";
    } else {
      el = document.createElement("meta");
      const m = selector.match(/\[(name|property)="([^"]+)"\]/);
      if (m) (el as HTMLMetaElement).setAttribute(m[1], m[2]);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

const Catalog = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = PAGE_TITLE;
    setMeta('meta[name="description"]', "content", PAGE_DESC);
    setMeta('meta[property="og:title"]', "content", PAGE_TITLE);
    setMeta('meta[property="og:description"]', "content", PAGE_DESC);
    setMeta('meta[property="og:url"]', "content", CANONICAL);
    setMeta('link[rel="canonical"]', "href", CANONICAL);
  }, []);

  useEffect(() => {
    supabase
      .from("contents")
      .select("id, title, synopsis, tag, banner_url, is_archived")
      .order("title")
      .then(({ data }) => {
        const visible = ((data ?? []) as CatalogItem[]).filter((c) => !c.is_archived);
        setItems(getUniqueItemsByTitle(visible));
        setLoading(false);
      });
  }, []);

  const movies = items.filter((i) => (i.tag || "").toLowerCase().includes("movie") || (i.tag || "").toLowerCase().includes("filme"));
  const series = items.filter((i) => !movies.includes(i));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">QueerScenes</Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="hover:text-primary">Home</Link>
            <Link to="/browse" className="hover:text-primary">Browse</Link>
            <Link to="/#planos" className="hover:text-primary">Plans</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold mb-3">Full catalog of LGBTQIA+ series and movies</h1>
        <p className="text-muted-foreground mb-10 max-w-3xl">
          Explore every title available on QueerScenes — LGBT series subtitled, queer movies, GL dramas, BL stories and soap operas. Sign up to watch the queer scenes you love.
        </p>

        {loading ? (
          <p className="text-muted-foreground">Loading catalog…</p>
        ) : (
          <>
            {series.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-semibold mb-4">Series & soap operas</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {series.map((c) => (
                    <li key={c.id} className="border border-border rounded-lg p-4 bg-card/40 hover:border-primary/40 transition-colors">
                      <Link to={`/title/${slugify(c.title)}`} className="block">
                        <h3 className="font-medium text-foreground">{c.title}</h3>
                        {c.synopsis && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{c.synopsis}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {movies.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4">Movies</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {movies.map((c) => (
                    <li key={c.id} className="border border-border rounded-lg p-4 bg-card/40">
                      <h3 className="font-medium text-foreground">{c.title}</h3>
                      {c.synopsis && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{c.synopsis}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {items.length === 0 && (
              <p className="text-muted-foreground">Catalog will be available soon.</p>
            )}
          </>
        )}

        <div className="mt-12 p-6 rounded-xl border border-primary/40 bg-primary/5">
          <h2 className="text-xl font-semibold mb-2">Watch the full queer scenes catalog</h2>
          <p className="text-muted-foreground mb-4">Sign up free and unlock subtitled LGBT series, GL dramas and queer movies.</p>
          <Link to="/" className="inline-block px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium">Get started</Link>
        </div>
      </main>
    </div>
  );
};

export default Catalog;
