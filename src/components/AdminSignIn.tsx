import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getResetPasswordRedirectUrl } from "@/lib/auth-urls";

interface Props {
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
}

export default function AdminSignIn({ signIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) setError(result.error.message);
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!email.trim()) { setError("Enter your email first."); return; }
    setBusy(true);
    setError("");
    try {
      const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: getResetPasswordRedirectUrl() });
      if (result.error) setError(result.error.message);
      else setNotice("Password reset link sent. Check your email.");
    } catch {
      setError("Unable to send the reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
    <form onSubmit={submit} className="w-full max-w-sm space-y-5">
      <div className="space-y-2">
        <p className="text-primary font-bold">QUEER SCENES</p>
        <h1 className="text-2xl font-bold">Admin sign in</h1>
      </div>
      <div className="space-y-2">
        <label htmlFor="admin-email" className="text-sm font-medium">Email</label>
        <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <label htmlFor="admin-account-password" className="text-sm font-medium">Account password</label>
        <div className="relative">
          <Input id="admin-account-password" type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="pr-12" required />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait..." : "Sign in"}</Button>
      <Button type="button" variant="link" disabled={busy} onClick={reset}>Forgot password?</Button>
    </form>
  </main>;
}