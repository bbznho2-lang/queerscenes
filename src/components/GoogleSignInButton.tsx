import { useState } from "react";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

interface Props {
  redirectPath?: string;
  className?: string;
  label?: string;
}

export const GoogleSignInButton = ({ redirectPath, className, label = "Continue with Google" }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirect_uri = redirectPath ? `${origin}${redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`}` : origin;
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri });
      if (result.error) {
        toast.error((result.error as Error).message || "Google sign-in failed.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      // session set; let auth listener take it from here
    } catch (err: any) {
      toast.error(err?.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ||
        "w-full flex items-center justify-center gap-2 rounded-full bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-60 font-semibold py-2.5 text-sm transition-colors"
      }
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.7 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.9 6.1 29.7 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.6 0 10.6-2.1 14.4-5.6l-6.6-5.6c-2 1.4-4.7 2.3-7.8 2.3-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.6 5.6C41.3 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
      </svg>
      {loading ? "Redirecting..." : label}
    </button>
  );
};

export default GoogleSignInButton;
