import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  { title: "About this notice", text: "This privacy notice concerns your use of Queer Scenes, its account features, catalog and Supporter subscriptions. For questions about your information, contact the Queer Scenes team at scenes.queer@gmail.com." },
  { title: "Your account and requests", text: "Information you provide can include your email, name, profile image, subtitle requests, wishlist suggestions and messages or attachments sent through the site. Your email connects your account with your Supporter access and account communications. Avoid including sensitive personal information in public comments or requests." },
  { title: "Subscriptions and payments", text: "Stripe processes Supporter payments. Queer Scenes uses subscription status, plan, expiration dates and payment references to manage access and assist with billing questions. You can manage your subscription through Profile → Manage subscription. Deleting your site account does not cancel your Stripe subscription; manage billing separately." },
  { title: "Site activity", text: "Queer Scenes records site interactions such as title clicks, referrals, Supporter plan selections, checkout activity and subscription portal openings. These records help the team understand site usage and resolve access or subscription problems. Browser storage is also used for sign-in sessions and preferences." },
  { title: "Messages and public contributions", text: "Messages sent through your site inbox are intended for the recipient and the administration team. Wishlist entries, comments and admin replies displayed publicly can be read by other visitors. Do not post passwords, payment details or private contact information in public contributions." },
  { title: "External services", text: "Payments, embedded video players and links to services such as Telegram involve external providers. Opening those services may involve their own cookies and handling of information under their privacy notices. Review the relevant provider's notice before using its services." },
  { title: "Your choices and questions", text: "You can edit available profile information, manage billing from your profile, and use the account deletion option. For questions about access to, correction of or deletion of your information, email scenes.queer@gmail.com from your account email. The team may need to verify that the request relates to your account. For questions about how long particular information is kept or which service providers handle it, contact the team." },
  { title: "Updates to this notice", text: "Queer Scenes may update this notice when its services change. Check this page for the current notice and contact the team if you need clarification." },
];

export default function PrivacyPolicy() {
  useEffect(() => { document.title = "Privacy policy | Queer Scenes"; }, []);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-5">
          <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Return to home"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <Link to="/" className="font-bold text-primary">QUEER SCENES</Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">Privacy policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Queer Scenes · Updated October 30, 2026</p>
        <div className="mt-10 space-y-8">
          {sections.map(section => <section key={section.title}>
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{section.text}</p>
          </section>)}
        </div>
        <a href="mailto:scenes.queer@gmail.com" className="mt-10 inline-block text-primary underline">scenes.queer@gmail.com</a>
      </article>
    </main>
  );
}