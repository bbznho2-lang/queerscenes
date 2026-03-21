const PUBLISHED_APP_URL = "https://queerscenes.lovable.app";

const isPreviewOrigin = (origin: string) =>
  origin.includes("lovableproject.com") || origin.includes("id-preview--");

export const getAppBaseUrl = () => {
  if (typeof window === "undefined") return PUBLISHED_APP_URL;

  const origin = window.location.origin;
  return isPreviewOrigin(origin) ? PUBLISHED_APP_URL : origin;
};

export const getEmailRedirectUrl = () => getAppBaseUrl();

export const getResetPasswordRedirectUrl = () => `${getAppBaseUrl()}/reset-password`;