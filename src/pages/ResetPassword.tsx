import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);

        const errorDescription = url.searchParams.get("error_description") || hashParams.get("error_description");
        const errorCode = url.searchParams.get("error") || hashParams.get("error");
        if (errorDescription || errorCode) {
          if (!cancelled) {
            setErrorMsg(errorDescription || "This recovery link is invalid or has expired. Please request a new one.");
            setChecking(false);
          }
          return;
        }

        // New flow: ?code=...
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            setErrorMsg("This recovery link is invalid or has expired. Please request a new one.");
            setChecking(false);
            return;
          }
          // Clean URL
          window.history.replaceState({}, "", url.pathname);
          setIsRecovery(true);
          setChecking(false);
          return;
        }

        // Legacy flow: #access_token=...&type=recovery
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        if (accessToken && refreshToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (cancelled) return;
          if (error) {
            setErrorMsg("This recovery link is invalid or has expired. Please request a new one.");
            setChecking(false);
            return;
          }
          window.history.replaceState({}, "", url.pathname);
          setIsRecovery(true);
          setChecking(false);
          return;
        }

        // Fallback: maybe a session already exists from PASSWORD_RECOVERY event
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) {
          setIsRecovery(true);
        }
        setChecking(false);
      } catch (e) {
        if (!cancelled) {
          setErrorMsg("Something went wrong validating your recovery link.");
          setChecking(false);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated! Redirecting...");
      setTimeout(() => navigate("/browse"), 1500);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Validating your recovery link...</p>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm sm:max-w-md">
          <Card className="bg-card neon-border-pink overflow-hidden">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                <Lock className="w-5 h-5 text-accent" />
              </div>
              <CardTitle className="text-xl sm:text-2xl neon-text-pink">RESET PASSWORD</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                {errorMsg ?? "Please use the link sent to your email."}
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple"
              >
                BACK TO HOME
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm sm:max-w-md">
        <Card className="bg-card neon-border-pink overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-accent" />
            </div>
            <CardTitle className="text-xl sm:text-2xl neon-text-pink">RESET PASSWORD</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">Enter your new password</p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-muted border-border focus:border-primary pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Confirm Password</label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-muted border-border focus:border-primary"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple"
              >
                {loading ? "Please wait..." : "UPDATE PASSWORD"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
