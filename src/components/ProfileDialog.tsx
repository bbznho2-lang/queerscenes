import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email] = useState("user@email.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
      toast.success("Photo updated!");
    }
  };

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    toast.success("Password changed successfully!");
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="neon-text-purple text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            My Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-primary/40">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-muted text-2xl">QS</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors">
                <Camera className="w-4 h-4 text-primary-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <div className="px-3 py-2.5 rounded-md bg-muted/50 border border-border text-sm text-foreground">
              {email}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs">Change Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-muted/50 border-border pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-muted/50 border-border pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={handlePasswordChange}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple"
            >
              Change Password
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
