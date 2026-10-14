import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const languages = ["English", "Español", "Français", "Deutsch", "Italiano", "Português", "Other"];

export default function SubtitleRequestForm({ titleId, userId, userEmail, active }: {
  titleId: string; userId?: string; userEmail?: string; active: boolean;
}) {
  const [language, setLanguage] = useState("English");
  const [other, setOther] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setEmail(userEmail || ""); }, [userEmail]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!active || !userId || sending) return;
    const selectedLanguage = (language === "Other" ? other : language).trim().replace(/\s+/g, " ");
    if (selectedLanguage.length < 2) { setError("Please enter the language you want."); return; }
    setSending(true);
    setError("");
    try {
      const { error: requestError } = await supabase.from("subtitle_requests").insert({
        title_id: titleId, user_id: userId, email: email.trim().toLowerCase(), language: selectedLanguage,
      });
      if (requestError) {
        setError(requestError.code === "23505" ? "You already requested this language for this title with this email." : requestError.message);
      } else setSent(true);
    } catch {
      setError("Request could not be sent. Please try again.");
    } finally { setSending(false); }
  };

  return (
    <div className="mt-5 max-w-md space-y-4">
      {!active && <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" />Only active Supporters can request subtitles.<Link to="/?highlight=supporter#supporter-card" className="text-primary underline">Become a Supporter</Link></p>}
      {sent ? <p role="status" className="text-sm text-foreground">Request sent! When we subtitle it, the message will arrive in your inbox here on the site.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={!active || sending} className="space-y-4 disabled:opacity-50">
            <div className="space-y-2">
              <Label htmlFor="subtitle-language">Language</Label>
              <Select value={language} onValueChange={setLanguage} disabled={!active || sending}>
                <SelectTrigger id="subtitle-language"><SelectValue /></SelectTrigger>
                <SelectContent>{languages.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {language === "Other" && <div className="space-y-2"><Label htmlFor="subtitle-other">Other language</Label><Input id="subtitle-other" value={other} onChange={(e) => setOther(e.target.value)} required minLength={2} maxLength={80} /></div>}
            <div className="space-y-2"><Label htmlFor="subtitle-email">Email</Label><Input id="subtitle-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></div>
            <Button type="submit" disabled={!active || sending}>{sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Request subtitles</Button>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
      )}
    </div>
  );
}