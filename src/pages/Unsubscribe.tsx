import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State = "loading" | "valid" | "invalid" | "confirming" | "done" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    document.title = "Unsubscribe | Queer Scenes";
    if (!token) { setState("invalid"); return; }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then((r) => setState(r.ok ? "valid" : "invalid"))
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setState("confirming");
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setState(error ? "error" : "done");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <Link to="/" style={{ fontFamily: "'Sora', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: ".22em", color: "#a855f7" }}>QUEER SCENES</Link>
        {state === "loading" && <p className="text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking your link…</p>}
        {state === "invalid" && <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has already been used.</p>}
        {state === "valid" && (
          <>
            <h1 className="text-lg font-bold">Unsubscribe from Queer Scenes emails?</h1>
            <p className="text-sm text-muted-foreground">You'll stop receiving our emails. Sign-in and password emails keep working.</p>
            <button onClick={() => void confirm()} className="w-full rounded-full py-2.5 text-sm font-bold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 hover:opacity-95">
              Confirm unsubscribe
            </button>
          </>
        )}
        {state === "confirming" && <p className="text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Unsubscribing…</p>}
        {state === "done" && <p className="text-sm text-foreground">Done — you won't receive our emails anymore. 💜</p>}
        {state === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}
      </div>
    </div>
  );
};

export default Unsubscribe;
