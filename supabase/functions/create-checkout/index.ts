import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_PRICE_IDS = new Set([
  "price_1TcrpkJ5xR4MDdjr0jHKThue", // monthly
  "price_1TcrrpJ5xR4MDdjrEx4LeBub", // quarterly
  "price_1TcrtPJ5xR4MDdjrM2sTnTPr", // yearly
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, priceId } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!priceId || !ALLOWED_PRICE_IDS.has(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia" as any,
    });

    const origin = req.headers.get("origin") || "https://queerscenes.lovable.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email.trim().toLowerCase(),
      success_url: `${origin}/?supporter=success&email=${encodeURIComponent(email.trim().toLowerCase())}`,
      cancel_url: `${origin}/#planos`,
      allow_promotion_codes: true,
      metadata: { email: email.trim().toLowerCase(), price_id: priceId },
      subscription_data: {
        metadata: { email: email.trim().toLowerCase(), price_id: priceId },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
