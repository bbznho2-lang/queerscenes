import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Mail, HelpCircle, XCircle, Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPPORT_EMAIL = "scenes.queer@gmail.com";

type Purpose = "question" | "cancel";

const SupportDialog = ({ open, onOpenChange }: SupportDialogProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSupporter, setIsSupporter] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<Purpose>("question");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [showRetention, setShowRetention] = useState(false);


  useEffect(() => {
    if (!open) {
      setShowRetention(false);
      return;
    }
    if (user?.email) setEmail(user.email);
    if (!user) {
      setIsSupporter(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, is_premium, premium_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const composed = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
        if (composed) setName(composed);
        const notExpired = !data.premium_expires_at || new Date(data.premium_expires_at) > new Date();
        const expired = Boolean(data.premium_expires_at && new Date(data.premium_expires_at) <= new Date());
        setIsExpired(expired);
        setExpiredAt(expired ? data.premium_expires_at : null);
        setIsSupporter(Boolean(data.is_premium && notExpired));
      } else {
        setIsExpired(false);
        setExpiredAt(null);
        setIsSupporter(false);
      }
    })();
  }, [open, user]);

  const handlePurposeChange = (next: Purpose) => {
    if (next === "cancel") {
      setShowRetention(true);
      setPurpose("cancel");
    } else {
      setShowRetention(false);
      setPurpose("question");
    }
  };

  const retentionItems = [
    { icon: "🎬", text: "Fresh LGBTQIA+ films, series and reality shows subtitled every month" },
    { icon: "📺", text: "Rare premieres you won't find on any other streaming platform" },
    { icon: "👑", text: "Telegram community with new releases, updates and recommendations" },
    { icon: "💜", text: "Your support keeps the project alive, curated and growing for everyone" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email."); return; }
    if (purpose === "cancel" && !reason.trim()) {
      toast.error("Please tell us the reason for cancellation.");
      return;
    }
    if (purpose === "question" && !message.trim()) {
      toast.error("Please describe your question.");
      return;
    }

    const subject = purpose === "cancel"
      ? "Cancel subscription request"
      : "Support question";

    const expiredDate = expiredAt
      ? new Date(expiredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : null;
    const statusLine = isSupporter === true
      ? "Account status: Supporter ⭐"
      : isExpired
      ? `Account status: Supporter — plan expired${expiredDate ? ` on ${expiredDate}` : ""}`
      : isSupporter === false
      ? "Account status: Registered user (no active plan)"
      : "Account status: Not logged in";

    const bodyLines = [
      `From: ${name || "(no name)"} <${email}>`,
      statusLine,
      "",
      purpose === "cancel" ? "Request: Cancel subscription" : "Request: Question / help",
      "",
      purpose === "cancel" ? `Reason for cancellation:\n${reason}` : `Message:\n${message}`,
    ];

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
    window.location.href = mailto;
    toast.success("Opening your email app...");
    setTimeout(() => onOpenChange(false), 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="qs-modal w-[calc(100vw-2rem)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl text-grad-brand break-words">Support</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {showRetention ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--t1)] break-words leading-tight">
                Your support is what keeps Queer Scenes alive 💜
              </h3>
              <p className="text-sm text-[var(--t2)] break-words leading-snug">
                Every subscription helps us add new titles, keep the site running and support the community.
                If something is wrong — payment, access or content — talk to us first. Most problems are solved in minutes.
              </p>
              <ul className="space-y-2">
                {retentionItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2.5"
                  >
                    <span className="text-xl flex-shrink-0 leading-none pt-0.5">{item.icon}</span>
                    <span className="text-sm text-[var(--t1)] min-w-0 break-words leading-snug">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="qs-btn-primary w-full whitespace-normal h-auto min-h-[3rem] py-2 text-center leading-tight"
              >
                <span className="min-w-0 break-words">I want to keep supporting 💜</span>
              </Button>
              <button
                type="button"
                onClick={() => setShowRetention(false)}
                className="w-full text-xs text-[var(--t2)] hover:text-[var(--t1)] underline underline-offset-2 py-1"
              >
                I still want to cancel (not recommended)
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--t2)] break-words">
                Ask a question or get help with your subscription. We reply as soon as possible — for faster answers, use Telegram.
              </p>

              {/* Account line */}
              <div className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-xs flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--t2)]">Sending from</div>
                  <div className="text-[var(--t1)] truncate" translate="no">{email || "not logged in"}</div>
                </div>
                {isSupporter === true && (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                    <Crown className="w-3 h-3" /> Supporter
                  </span>
                )}
                {isSupporter === false && isExpired && (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-red-500/15 text-red-300 border border-red-400/30 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                    <Crown className="w-3 h-3" /> Expired
                  </span>
                )}
                {isSupporter === false && !isExpired && (
                  <span className="inline-flex flex-shrink-0 items-center rounded-full bg-white/5 text-[var(--t2)] border border-white/10 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                    No plan
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Purpose */}
                <div className="space-y-2">
                  <Label className="text-[var(--t2)] text-xs">What do you need?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePurposeChange("question")}
                      className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-sm text-center leading-tight transition-colors ${
                        purpose === "question"
                          ? "border-[rgba(139,43,226,.6)] bg-[rgba(139,43,226,.12)] text-[var(--t1)]"
                          : "border-white/10 bg-white/[.02] text-[var(--t2)] hover:text-[var(--t1)]"
                      }`}
                    >
                      <HelpCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="min-w-0 break-words">Ask a question</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePurposeChange("cancel")}
                      className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-sm text-center leading-tight transition-colors ${
                        purpose === "cancel"
                          ? "border-pink-500/60 bg-pink-500/10 text-[var(--t1)]"
                          : "border-white/10 bg-white/[.02] text-[var(--t2)] hover:text-[var(--t1)]"
                      }`}
                    >
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="min-w-0 break-words">Cancel subscription</span>
                    </button>
                  </div>
                </div>

                {/* Email (editable in case not logged in) */}
                {!user && (
                  <div className="space-y-1.5">
                    <Label className="text-[var(--t2)] text-xs">Your email</Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="qs-input"
                      maxLength={255}
                    />
                  </div>
                )}

                {purpose === "question" ? (
                  <div className="space-y-1.5">
                    <Label className="text-[var(--t2)] text-xs">Your question</Label>
                    <Textarea
                      placeholder="Describe your question or issue…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="qs-input min-h-[110px]"
                      maxLength={2000}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-pink-500/20 bg-pink-500/[.06] px-3 py-2.5 text-sm text-[var(--t1)] leading-snug">
                      Before you cancel, let us help. Most payment, access and content issues are fixed quickly on Telegram.
                      Your support keeps Queer Scenes online for the whole community.
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[var(--t2)] text-xs">
                        What's happening? <span className="text-pink-400">*required</span>
                      </Label>
                      <Textarea
                        placeholder="Tell us what's wrong — we'll do our best to fix it so you don't have to cancel."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="qs-input min-h-[110px]"
                        maxLength={2000}
                        required
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="qs-btn-primary w-full gap-2 whitespace-normal h-auto min-h-[3rem] py-2 text-center leading-tight">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="min-w-0 break-words">
                    {purpose === "cancel" ? "Send cancellation request" : "Send email to"}{" "}
                    {purpose !== "cancel" && <span translate="no">{SUPPORT_EMAIL}</span>}
                  </span>
                </Button>
              </form>

              <div className="border-t border-white/5 pt-4">
                <p className="text-xs text-[var(--t2)] text-center mb-2">Prefer a faster reply?</p>
                <a
                  href="https://t.me/L7kznr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-[rgba(139,43,226,.45)] text-[var(--brand-purple-light)] hover:bg-[rgba(139,43,226,.1)] transition-colors text-sm font-medium whitespace-normal text-center leading-tight"
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" /> <span className="min-w-0 break-words">Chat on Telegram</span>
                </a>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportDialog;
