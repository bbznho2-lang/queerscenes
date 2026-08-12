import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    // A supporter can have their entitlement stored by email (manual grants,
    // Stripe payments) even if the profile row lost the premium flag, so the
    // deletion log falls back to that record.
    const snapEmail = (profileSnap?.email ?? null);
    let entitlement: any = null;
    if (snapEmail) {
      const { data: ent } = await adminClient
        .from("pending_supporters")
        .select("plan, premium_expires_at, status")
        .eq("email", String(snapEmail).toLowerCase())
        .in("status", ["pending", "paid", "claimed"])
        .order("premium_expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      entitlement = ent;
    }

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Snapshot profile before wiping so we can log the deletion
    const { data: profileSnap } = await adminClient
      .from("profiles")
      .select("email, first_name, last_name, is_premium, premium_plan, premium_expires_at")
      .eq("user_id", user_id)
      .maybeSingle();

    const cleanupTargets = [
      adminClient.from("content_clicks").delete().eq("user_id", user_id),
      adminClient.from("watchlist").delete().eq("user_id", user_id),
      adminClient.from("user_roles").delete().eq("user_id", user_id),
      adminClient.from("profiles").delete().eq("user_id", user_id),
    ];

    const cleanupResults = await Promise.all(cleanupTargets);
    const cleanupError = cleanupResults.find((result) => result.error)?.error;

    if (cleanupError) {
      console.error("[delete-user] cleanup failed", cleanupError);
      return new Response(JSON.stringify({ error: "Cleanup failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("account_deletions").insert({
      deleted_user_id: user_id,
      email: profileSnap?.email ?? null,
      first_name: profileSnap?.first_name ?? null,
      last_name: profileSnap?.last_name ?? null,
      was_premium: Boolean(profileSnap?.is_premium) || Boolean(entitlement),
      premium_plan: profileSnap?.premium_plan ?? entitlement?.plan ?? null,
      premium_expires_at: profileSnap?.premium_expires_at ?? entitlement?.premium_expires_at ?? null,
      deleted_by: "admin",
      deleted_by_user_id: caller.id,
    });

    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error && !error.message.toLowerCase().includes("not found")) {
      console.error("[delete-user] auth deleteUser error", error);
      return new Response(JSON.stringify({ error: "Failed to delete user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, can_sign_up_again: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[delete-user] unhandled error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
