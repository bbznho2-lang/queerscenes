import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { linkify } from "@/lib/linkify";

interface SiteNote {
  id: string;
  title: string;
  body: string;
  color: string;
  is_active: boolean;
  updated_at: string;
}

const SiteNoteBanner = () => {
  const [note, setNote] = useState<SiteNote | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("site_notes")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setNote(data);
        const key = `site_note_dismissed_${data.id}_${data.updated_at}`;
        if (sessionStorage.getItem(key)) setDismissed(true);
      }
    })();
  }, []);

  if (!note || dismissed || !note.body.trim()) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(`site_note_dismissed_${note.id}_${note.updated_at}`, "1");
    setDismissed(true);
  };

  return (
    <section className="px-4 pt-6">
      <div className="max-w-7xl mx-auto">
        <div
          className="relative rounded-2xl border p-4 sm:p-5 pr-12"
          style={{
            backgroundColor: `${note.color}1a`,
            borderColor: `${note.color}66`,
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: note.color, boxShadow: `0 0 12px ${note.color}` }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">
                {note.title}
              </h3>
              <p className="text-xs sm:text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {note.body}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default SiteNoteBanner;
