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
      <DialogContent className="qs-modal max-w-md">
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
            <div className="px-3 py-2.5 rounded-xl bg-[var(--s2)] border border-white/5 text-sm text-[var(--t1)]">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
