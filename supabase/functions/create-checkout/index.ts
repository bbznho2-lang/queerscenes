import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_PRICE_IDS = new Set([
  "price_1TdJouJ5xR4MDdjriK0vTZr3", // monthly €9.99
  "price_1TdJpxJ5xR4MDdjr6CYmpFZk", // quarterly €24.99
  "price_1TdJrtJ5xR4MDdjrEdxuGjSz", // yearly €89.99
  // legacy price IDs (kept for backward compat)
  "price_1TcrpkJ5xR4MDdjr0jHKThue",
  "price_1TcrrpJ5xR4MDdjrEx4LeBub",
  "price_1TcrtPJ5xR4MDdjrM2sTnTPr",
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

    const ALLOWED_ORIGINS = new Set([
      "https://queerscenes.lovable.app",
      "https://id-preview--fd2d5d8f-022f-4e0b-9296-7902e2ff85b2.lovable.app",
    ]);
    const rawOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : "https://queerscenes.lovable.app";

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
