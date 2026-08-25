import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const GENRES = [
  "GL Drama",
  "BL Drama",
  "Series",
  "Movie",
  "Soap Opera",
  "Reality Show",
  "Documentary",
  "Other",
];

const COUNTRIES = [
  "Thailand",
  "South Korea",
  "Japan",
  "China",
  "Philippines",
  "Brazil",
  "USA",
  "UK",
  "France",
  "Spain",
  "Other",
];

interface PublicRequest {
  id: string;
  display_name: string | null;
  title_name: string;
  genre: string | null;
  country: string | null;
  note: string | null;
  status: string;
  created_at: string;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h >= 1) return `${h}h ago`;
  const m = Math.floor(diff / 60000);
  return m >= 1 ? `${m}m ago` : "just now";
};

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [titleName, setTitleName] = useState("");
  const [genre, setGenre] = useState("");
  const [country, setCountry] = useState("");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState<PublicRequest[]>([]);

  useEffect(() => {
    document.title = "Wishlist — Request a title | Queer Scenes";
  }, []);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const loadRecent = async () => {
    const { data } = await (supabase as any).rpc("list_public_title_requests", { _limit: 20 });
    setRecent((data || []) as PublicRequest[]);
  };

  useEffect(() => { void loadRecent(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleName.trim()) { toast.error("Tell us the title name"); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("title_requests").insert({
        user_id: user?.id ?? null,
        email: email.trim().toLowerCase(),
        requester_name: name.trim() || null,
        title_name: titleName.trim().slice(0, 160),
        genre: genre || null,
        country: country || null,
        note: note.trim().slice(0, 800) || null,
      });
      if (error) throw error;
      toast.success("Request sent 💜 We'll email you if we add it.");
      setTitleName("");
      setNote("");
      setGenre("");
      setCountry("");
      await loadRecent();
    } catch (err: any) {
      toast.error(err.message || "Could not send your request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <Link to="/" style={{ fontFamily: "'Sora', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: ".22em", color: "#a855f7" }}>QUEER SCENES</Link>
          <Link to="/browse" className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground">Browse</Link>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-black text-center leading-tight">
          Is there a title you'd love to see on Queer Scenes?
        </h1>
        <p className="mt-3 text-sm text-muted-foreground text-center leading-relaxed">
          Tell us what you're looking for — a series, film, GL drama, soap opera.
          If we can find it, we'll bring it here and let you know by email.
        </p>

        <div className="mt-5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-center text-xs font-semibold text-foreground">
          💜 If we add a title you requested, we'll send you an email so you're the first to know.
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="text"
            value={titleName}
            onChange={(e) => setTitleName(e.target.value)}
            placeholder="Title name (e.g. 'Fingersmith', 'My Mister')"
            maxLength={160}
            className="w-full rounded-lg bg-card border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full rounded-lg bg-card border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Genre / Type</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg bg-card border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Country</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={800}
            placeholder="Tell us more — why do you love this title? Where did you watch it? Any details help us find it."
            className="w-full rounded-lg bg-card border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          />

          {!user && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                maxLength={60}
                className="w-full rounded-lg bg-card border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                maxLength={255}
                className="w-full rounded-lg bg-card border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="shine-cta w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send my request 💜
          </button>
        </form>

        <section className="mt-10">
          <h2 className="text-sm font-bold text-muted-foreground mb-3">Recent requests from the community</h2>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">No requests yet — be the first!</p>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card px-3 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {(r.display_name || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{r.display_name || "Someone"}</span>
                    {r.genre && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-semibold">{r.genre}</span>
                    )}
                    {r.status === "added" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/40 text-green-400 font-semibold">Added 💜</span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-foreground">
                    {r.title_name}{r.country ? ` — ${r.country}` : ""}
                  </p>
                  {r.note && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-3">{r.note}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Heart className="w-3.5 h-3.5 text-pink-500" /> Every request helps us build the catalog.
        </p>
      </main>
    </div>
  );
};

export default Wishlist;
