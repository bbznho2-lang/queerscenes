import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PRICE_TO_PLAN: Record<string, { plan: string; months: number }> = {
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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-12-18.acacia" as any,
  });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!webhookSecret || !signature) throw new Error("Missing webhook secret or signature");
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
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
      console.warn("Unknown priceId:", opts.priceId);
      return;
    }
    const expiresAt = opts.periodEnd
      ? new Date(opts.periodEnd * 1000)
      : addMonths(new Date(), mapping.months);

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
    if (pendErr) console.error("pending_supporters insert error", pendErr);

    // 2) If a profile already exists with that email, also promote it immediately.
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("email", email)
      .maybeSingle();
    if (existing?.user_id) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          is_premium: true,
          premium_plan: mapping.plan,
          premium_expires_at: expiresAt.toISOString(),
        })
        .eq("user_id", existing.user_id);
      if (upErr) console.error("profiles update error", upErr);

      await supabase
        .from("pending_supporters")
        .update({ status: "claimed", claimed_at: new Date().toISOString() })
        .ilike("email", email)
        .eq("status", "paid");
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = session.customer_email || (session.customer_details?.email ?? "");
      const priceId = (session.metadata?.price_id as string) || "";
      let periodEnd: number | null = null;
      let subId: string | null = null;

      if (session.subscription) {
        subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        periodEnd = (sub as any).current_period_end ?? null;
        if (!priceId && sub.items.data[0]?.price?.id) {
          await applySupporter({
            email,
            priceId: sub.items.data[0].price.id,
            customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
            subscriptionId: subId,
            periodEnd,
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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
