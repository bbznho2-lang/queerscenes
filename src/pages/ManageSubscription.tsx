import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CreditCard, Heart, LifeBuoy, Loader2, ShieldCheck, Sparkles, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SupportDialog from "@/components/SupportDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { trackSupporterEvent } from "@/lib/supporter-tracking";

const BILLING_PORTAL_URL = "https://billing.stripe.com/p/login/aFaaEY4o4gKC1MXf2xg3600";

type SubscriptionSummary = {
  is_premium: boolean;
  premium_plan: string | null;
  premium_expires_at: string | null;
};

const planNames: Record<string, string> = {
  monthly: "Monthly Supporter",
  quarterly: "Quarterly Supporter",
  yearly: "Yearly Supporter",
  annual: "Yearly Supporter",
  lifetime: "Lifetime Supporter",
};

const benefits = [
  { icon: Tv, title: "Your full catalog", text: "Rare queer films, series, reality shows, GL and BL dramas." },
  { icon: Sparkles, title: "Every new release", text: "Keep following new episodes and hand-subtitled premieres as they arrive." },
  { icon: Heart, title: "The project you support", text: "Your subscription keeps Queer Scenes curated, online and growing." },
];

const ManageSubscription = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [confirmPortal, setConfirmPortal] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (authLoading) return;
      if (!user) {
        if (active) setProfileLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("is_premium, premium_plan, premium_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (active) {
        setSummary(data ?? null);
        setProfileLoading(false);
      }
    };

    void loadProfile();
    return () => { active = false; };
  }, [authLoading, user]);

  const planName = summary?.premium_plan
    ? planNames[summary.premium_plan] ?? "Supporter"
    : "Supporter";
  const expiresAt = summary?.premium_expires_at ? new Date(summary.premium_expires_at) : null;
  const expired = Boolean(expiresAt && expiresAt <= new Date());
  const status = summary?.is_premium && !expired ? "Active" : expired ? "Expired" : "No active plan";

  const openPortal = async () => {
    await trackSupporterEvent(supabase, {
      event_type: "billing_portal_opened",
      source: "manage_subscription",
      metadata: {
        plan: summary?.premium_plan ?? null,
        subscription_status: status,
      },
    });
    window.location.assign(BILLING_PORTAL_URL);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-bold text-grad-brand">QUEER SCENES</span>
          <Button variant="ghost" size="icon" onClick={() => setSupportOpen(true)} aria-label="Subscription support">
            <LifeBuoy className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <p className="text-xs font-bold uppercase text-accent">Manage subscription</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">Before you make a change</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            We would love to keep you with us. Take a moment to see what your subscription makes possible and what you will lose if you cancel.
          </p>
        </section>

        <section className="mx-auto mt-8 max-w-3xl border-y border-border py-5">
          {profileLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your subscription…
            </div>
          ) : user ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Your plan</p>
                <p className="mt-1 text-lg font-bold">{planName}</p>
              </div>
              <div className="sm:text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  <Check className="h-3.5 w-3.5" /> {status}
                </span>
                {expiresAt && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {expired ? "Ended" : "Current period ends"} {expiresAt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-semibold">Sign in to see your current plan.</p>
              <p className="mt-1 text-xs text-muted-foreground">You can still continue to the secure billing portal below.</p>
              <Button variant="link" className="mt-1 text-accent" onClick={() => navigate("/#login")}>Go to sign in</Button>
            </div>
          )}
        </section>

        <section className="mx-auto mt-10 max-w-3xl">
          <h2 className="text-xl font-bold sm:text-2xl">What you keep by staying</h2>
          <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title} className="bg-card p-5">
                <Icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 text-sm font-bold">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-3xl border-t border-border pt-8 text-center">
          <Button className="qs-btn-primary h-12 w-full sm:w-auto sm:min-w-72" onClick={() => navigate("/browse")}>I want to keep supporting 💜</Button>
          <div className="mt-5">
            <Button variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setConfirmPortal(true)}>
              Continue to manage or cancel <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
          <button type="button" onClick={() => setSupportOpen(true)} className="mt-4 text-xs font-semibold text-accent underline underline-offset-4 hover:opacity-80">
            Have a billing question? Talk to Support
          </button>
        </section>
      </div>

      <AlertDialog open={confirmPortal} onOpenChange={setConfirmPortal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Continue to Stripe?</AlertDialogTitle>
            <AlertDialogDescription>
              You are leaving Queer Scenes for Stripe's secure billing portal. Use the same email as your subscription to update payment details, view invoices, or cancel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on Queer Scenes</AlertDialogCancel>
            <AlertDialogAction onClick={() => void openPortal()}>Open secure portal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </main>
  );
};

export default ManageSubscription;