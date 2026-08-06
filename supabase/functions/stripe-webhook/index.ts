import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PRICE_TO_PLAN: Record<string, { plan: string; months: number }> = {
  // current prices
  price_1TmNFHJ5xR4MDdjr5915HBR2: { plan: "monthly", months: 1 },
  price_1TmNGNJ5xR4MDdjrsxC9bhtx: { plan: "quarterly", months: 3 },
  price_1TmNHMJ5xR4MDdjrTnNTQAHV: { plan: "yearly", months: 12 },
  // legacy prices
  price_1TdJouJ5xR4MDdjriK0vTZr3: { plan: "monthly", months: 1 },
  price_1TdJpxJ5xR4MDdjr6CYmpFZk: { plan: "quarterly", months: 3 },
  price_1TdJrtJ5xR4MDdjrEdxuGjSz: { plan: "yearly", months: 12 },
  price_1TcrpkJ5xR4MDdjr0jHKThue: { plan: "monthly", months: 1 },
  price_1TcrrpJ5xR4MDdjrEx4LeBub: { plan: "quarterly", months: 3 },
  price_1TcrtPJ5xR4MDdjrM2sTnTPr: { plan: "yearly", months: 12 },
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log("[stripe-webhook] Request received", { method: req.method });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-12-18.acacia" as any,
  });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  console.log("[stripe-webhook] Env check", {
    hasSecret: !!webhookSecret,
    hasSignature: !!signature,
    bodyLen: body.length,
  });

  let event: Stripe.Event;
  try {
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    if (!signature) throw new Error("Missing stripe-signature header");
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log("[stripe-webhook] Event verified", { type: event.type, id: event.id });
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Webhook verification failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  async function applySupporter(opts: {
    email: string;
    priceId: string;
    customerId?: string | null;
    subscriptionId?: string | null;
    periodEnd?: number | null;
  }) {
    const email = opts.email.trim().toLowerCase();
    const mapping = PRICE_TO_PLAN[opts.priceId];
    if (!mapping) {
      console.warn("[stripe-webhook] Unknown priceId:", opts.priceId);
      return;
    }
    const expiresAt = opts.periodEnd
      ? new Date(opts.periodEnd * 1000)
      : addMonths(new Date(), mapping.months);

    console.log("[stripe-webhook] applySupporter", {
      email,
      plan: mapping.plan,
      months: mapping.months,
      expiresAt: expiresAt.toISOString(),
      customerId: opts.customerId,
      subscriptionId: opts.subscriptionId,
    });

    // 1) Upsert pending_supporters (for users that haven't signed up yet)
    const { error: pendErr } = await supabase
      .from("pending_supporters")
      .insert({
        email,
        plan: mapping.plan,
        premium_expires_at: expiresAt.toISOString(),
        stripe_customer_id: opts.customerId ?? null,
        stripe_subscription_id: opts.subscriptionId ?? null,
        status: "paid",
      });
    if (pendErr) console.error("[stripe-webhook] pending_supporters insert error", pendErr);
    else console.log("[stripe-webhook] pending_supporters inserted for", email);

    // 2) If a profile already exists with that email, also promote it immediately.
    const { data: existing, error: lookupErr } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("email", email)
      .maybeSingle();
    if (lookupErr) console.error("[stripe-webhook] profile lookup error", lookupErr);

    if (existing?.user_id) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          is_premium: true,
          premium_plan: mapping.plan,
          premium_expires_at: expiresAt.toISOString(),
        })
        .eq("user_id", existing.user_id);
      if (upErr) console.error("[stripe-webhook] profiles update error", upErr);
      else console.log("[stripe-webhook] profile promoted directly", { user_id: existing.user_id });

      await supabase
        .from("pending_supporters")
        .update({ status: "claimed", claimed_at: new Date().toISOString() })
        .ilike("email", email)
        .eq("status", "paid");

      await sendWelcomeDM(existing.user_id);
    } else {
      console.log("[stripe-webhook] no profile yet for", email, "— will be claimed at next login");
    }
  }

  const ADMIN_SENDER_ID = "97109920-d00e-4242-8374-6d774914bd26";
  const WELCOME_DM_BODY = `Welcome to Queer Scenes 💜\n\nHii!! Some titles are available to watch directly on Telegram — we store them there because it's safer and provides a better viewing experience.\n\nAs a supporter, you also have access to our VIP group, where you'll receive news, updates, exclusive content, and new releases before anyone else.\n\nJoin the VIP group here: https://t.me/+36rmaWJhLU1kMjlh`;

  async function sendWelcomeDM(userId: string) {
    try {
      // Avoid duplicates: skip if a welcome DM already exists for this recipient.
      const { data: existingDm } = await supabase
        .from("direct_messages")
        .select("id")
        .eq("recipient_id", userId)
        .eq("sender_id", ADMIN_SENDER_ID)
        .ilike("body", "Welcome to Queer Scenes%")
        .maybeSingle();
      if (existingDm?.id) {
        console.log("[stripe-webhook] welcome DM already sent to", userId);
        return;
      }
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: ADMIN_SENDER_ID,
        recipient_id: userId,
        body: WELCOME_DM_BODY,
      });
      if (error) console.error("[stripe-webhook] welcome DM insert error", error);
      else console.log("[stripe-webhook] welcome DM sent to", userId);
    } catch (e) {
      console.error("[stripe-webhook] welcome DM failed", e);
    }
  }

  async function recordFunnelCompletion(opts: {
    userId: string | null;
    email: string | null;
    priceId: string | null;
    visitorId: string | null;
    sessionId: string | null;
    subscriptionId: string | null;
    refCode?: string | null;
  }) {
    try {
      let userId = opts.userId;
      // Fallback: resolve user_id by email so legacy/no-metadata payments still link.
      if (!userId && opts.email) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("email", opts.email)
          .maybeSingle();
        userId = prof?.user_id ?? null;
      }

      // Resolve the influencer that brought this user (metadata → visitor → email).
      let refCode = (opts.refCode || "").trim().toLowerCase();
      if (!refCode && opts.visitorId) {
        const { data: click } = await supabase
          .from("referral_events")
          .select("ref_code")
          .eq("visitor_id", opts.visitorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        refCode = click?.ref_code ?? "";
      }
      if (!refCode && opts.email) {
        const { data: byEmail } = await supabase
          .from("referral_events")
          .select("ref_code")
          .ilike("email", opts.email.trim().toLowerCase())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        refCode = byEmail?.ref_code ?? "";
      }

      await supabase.from("supporter_events").insert({
        user_id: userId,
        event_type: "checkout_completed",
        source: "stripe-webhook",
        metadata: {
          email: opts.email,
          price_id: opts.priceId,
          visitor_id: opts.visitorId,
          session_id: opts.sessionId,
          subscription_id: opts.subscriptionId,
          ref_code: refCode || null,
          linked_by: opts.userId ? "metadata" : userId ? "email" : "none",
        },
      });
    } catch (e) {
      console.error("[stripe-webhook] funnel insert failed", e);
    }
  }

    } catch (e) {
      console.error("[stripe-webhook] funnel insert failed", e);
    }
  }

  async function recordReferralPayment(opts: {
    refCode: string | null;
    visitorId: string | null;
    email: string | null;
    userId: string | null;
    amountCents: number | null;
    currency: string | null;
    sessionId: string | null;
  }) {
    try {
      let refCode = (opts.refCode || "").trim().toLowerCase();

      // Fallback 1: attribute by the visitor id that logged the original click.
      if (!refCode && opts.visitorId) {
        const { data: click } = await supabase
          .from("referral_events")
          .select("ref_code")
          .eq("event_type", "click")
          .eq("visitor_id", opts.visitorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        refCode = click?.ref_code ?? "";
      }

      // Fallback 2: attribute by the logged-in user id seen on an earlier event.
      if (!refCode && opts.userId) {
        const { data: byUser } = await supabase
          .from("referral_events")
          .select("ref_code")
          .eq("user_id", opts.userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        refCode = byUser?.ref_code ?? "";
      }

      // Fallback 3: attribute by email (user came back later on another device).
      if (!refCode && opts.email) {
        const { data: byEmail } = await supabase
          .from("referral_events")
          .select("ref_code")
          .ilike("email", opts.email.trim().toLowerCase())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        refCode = byEmail?.ref_code ?? "";
      }

      // Fallback 4: a paywall/funnel event from this visitor or user carried the ref code.
      if (!refCode && (opts.visitorId || opts.userId)) {
        const query = supabase
          .from("supporter_events")
          .select("metadata")
          .not("metadata->>ref_code", "is", null)
          .order("created_at", { ascending: false })
          .limit(1);
        const { data: ev } = opts.visitorId
          ? await query.eq("metadata->>visitor_id", opts.visitorId).maybeSingle()
          : await query.eq("user_id", opts.userId!).maybeSingle();
        refCode = ((ev as any)?.metadata?.ref_code as string) || "";
      }

      if (!refCode) return;


      // Avoid duplicates for the same checkout session.
      if (opts.sessionId) {
        const { data: dup } = await supabase
          .from("referral_events")
          .select("id")
          .eq("event_type", "payment")
          .eq("metadata->>session_id", opts.sessionId)
          .maybeSingle();
        if (dup?.id) return;
      }

      await supabase.from("referral_events").insert({
        ref_code: refCode,
        event_type: "payment",
        visitor_id: opts.visitorId,
        user_id: opts.userId,
        email: opts.email ? opts.email.trim().toLowerCase() : null,
        amount_cents: opts.amountCents,
        currency: opts.currency ?? "eur",
        metadata: { session_id: opts.sessionId },
      });
    } catch (e) {
      console.error("[stripe-webhook] referral payment insert failed", e);
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email || (session.customer_details?.email ?? "");
      const priceId = (session.metadata?.price_id as string) || "";
      const metaUserId = (session.metadata?.user_id as string) || session.client_reference_id || null;
      const visitorId = (session.metadata?.visitor_id as string) || null;
      let periodEnd: number | null = null;
      let subId: string | null = null;

      if (session.subscription) {
        subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        periodEnd = (sub as any).current_period_end ?? null;
        if (!priceId && sub.items.data[0]?.price?.id) {
          const resolvedPrice = sub.items.data[0].price.id;
          await applySupporter({
            email,
            priceId: resolvedPrice,
            customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
            subscriptionId: subId,
            periodEnd,
          });
          await recordFunnelCompletion({
            userId: metaUserId,
            email: email || null,
            priceId: resolvedPrice,
            visitorId,
            sessionId: session.id,
            subscriptionId: subId,
          });
          await recordReferralPayment({
            refCode: (session.metadata?.ref_code as string) || null,
            visitorId,
            email: email || null,
            userId: metaUserId,
            amountCents: session.amount_total ?? null,
            currency: session.currency ?? "eur",
            sessionId: session.id,
          });
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (email && priceId) {
        await applySupporter({
          email,
          priceId,
          customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          subscriptionId: subId,
          periodEnd,
        });
      }
      await recordFunnelCompletion({
        userId: metaUserId,
        email: email || null,
        priceId: priceId || null,
        visitorId,
        sessionId: session.id,
        subscriptionId: subId,
      });
      await recordReferralPayment({
        refCode: (session.metadata?.ref_code as string) || null,
        visitorId,
        email: email || null,
        userId: metaUserId,
        amountCents: session.amount_total ?? null,
        currency: session.currency ?? "eur",
        sessionId: session.id,
      });
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const email = invoice.customer_email || "";
      const priceId = invoice.lines.data[0]?.price?.id || "";
      const periodEnd = invoice.lines.data[0]?.period?.end ?? null;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;

      if (email && priceId) {
        await applySupporter({ email, priceId, customerId, subscriptionId: subId, periodEnd });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook handler error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
