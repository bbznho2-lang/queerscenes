import {
  Instagram,
  Youtube,
  Facebook,
  Music2,
  Link as LinkIcon,
  Send,
  MessageCircle,
  Twitch,
  Globe,
  Mail,
  Github,
  Linkedin,
  type LucideIcon,
} from "lucide-react";
import { XIcon } from "@/components/icons/XIcon";

export const SOCIAL_ICONS: Record<string, LucideIcon | typeof XIcon> = {
  instagram: Instagram,
  tiktok: Music2,
  x: XIcon,
  youtube: Youtube,
  facebook: Facebook,
  telegram: Send,
  whatsapp: MessageCircle,
  twitch: Twitch,
  discord: MessageCircle,
  github: Github,
  linkedin: Linkedin,
  email: Mail,
  website: Globe,
  link: LinkIcon,
};

export const SOCIAL_ICON_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X / Twitter" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "twitch", label: "Twitch" },
  { value: "discord", label: "Discord" },
  { value: "github", label: "GitHub" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "website", label: "Website" },
  { value: "link", label: "Other link" },
];

export const getSocialIcon = (icon: string) => SOCIAL_ICONS[icon] || LinkIcon;
