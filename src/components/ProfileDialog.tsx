import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SupportDialog from "./SupportDialog";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPlan, setPremiumPlan] = useState<string | null>(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-my-account");
      if (error) throw error;
      toast.success("Account deleted. You can sign up again with the same email.");
      await supabase.auth.signOut();
      onOpenChange(false);
      window.location.href = "/";
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, is_premium, premium_plan, premium_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setIsPremium(!!data.is_premium);
        setPremiumPlan(data.premium_plan || null);
        setPremiumExpiresAt(data.premium_expires_at || null);
      }
    };
    load();
  }, [open]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
      toast.success("Photo updated!");
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Error saving name.");
    else toast.success("Name updated!");
  };

  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "QS";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="qs-modal w-[calc(100vw-2rem)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl text-grad-brand">
            My Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-[rgba(139,43,226,.4)]">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="qs-avatar-gradient text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-grad-pb flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[var(--t2)] text-xs">First Name</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className="qs-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-[var(--t2)] text-xs">Last Name</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className="qs-input" />
            </div>
          </div>
          <Button onClick={handleSaveName} disabled={saving} className="qs-btn-primary w-full">
            {saving ? "Saving..." : "Save Name"}
          </Button>

          <div className="space-y-2">
            <Label className="text-[var(--t2)] text-xs">Email</Label>
            <div className="px-3 py-2.5 rounded-xl bg-[var(--s2)] border border-white/5 text-sm text-[var(--t1)] truncate" translate="no">
              {email}
            </div>

          </div>


          {(() => {
            const expired = !!(isPremium && premiumExpiresAt && new Date(premiumExpiresAt) <= new Date());
            const active = isPremium && !expired;
            const planLabel =
              premiumPlan === "monthly" ? "Monthly"
              : premiumPlan === "quarterly" ? "Quarterly"
              : premiumPlan === "yearly" || premiumPlan === "annual" ? "Yearly"
              : premiumPlan === "lifetime" ? "Lifetime"
              : "Supporter";
            return (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Supporter Plan</Label>
                <div className={`px-3 py-2.5 rounded-md border text-sm ${active ? 'bg-primary/10 border-primary/30 text-foreground' : expired ? 'bg-destructive/10 border-destructive/30 text-foreground' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                  {active ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">👑 {planLabel}</span>
                      <span className="text-xs text-muted-foreground">
                        {premiumExpiresAt ? `Active until ${new Date(premiumExpiresAt).toLocaleDateString("en-US")}` : "Lifetime"}
                      </span>
                    </div>
                  ) : expired ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">😢 Expired</span>
                      <span className="text-xs">
                        Expired on {new Date(premiumExpiresAt!).toLocaleDateString("en-US")}
                      </span>
                    </div>
                  ) : (
                    <span>No active plan — Free user</span>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="pt-4 border-t border-white/5">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive whitespace-normal h-auto min-h-10 py-2 leading-tight"
            >
              <Trash2 className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="min-w-0 break-words">Delete account permanently</span>
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2 text-center break-words">
              You can sign up again later with the same email.
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-3">
              <p className="text-[11px] text-muted-foreground text-center break-words">
                Deleting your profile does not cancel your subscription. If you want to know more, go to{" "}
                <button
                  type="button"
                  onClick={() => setSupportOpen(true)}
                  className="underline text-[var(--brand-purple-light)] hover:opacity-80 font-semibold"
                >
                  Support
                </button>
                .
              </p>
            </div>
          </div>
        </div>
      </DialogContent>

      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, profile, watchlist and activity.
              This action cannot be undone. You can sign up again later with the same email ({email}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Yes, delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ProfileDialog;
