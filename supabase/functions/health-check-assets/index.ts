import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: assets } = await supabase
      .from("campaign_assets")
      .select("id, original_url")
      .eq("enabled", true);

    if (!assets?.length) {
      return new Response(JSON.stringify({ checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let ok = 0, broken = 0, redirect = 0;

    for (const asset of assets) {
      try {
        const res = await fetch(asset.original_url, {
          method: "HEAD",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Lovable Health Check)" },
          redirect: "manual",
        });

        let status: string;
        if (res.status >= 200 && res.status < 300) { status = "ok"; ok++; }
        else if (res.status >= 300 && res.status < 400) { status = "redirect"; redirect++; }
        else { status = "broken"; broken++; }

        await supabase
          .from("campaign_assets")
          .update({ health_status: status, last_health_check: new Date().toISOString() })
          .eq("id", asset.id);
      } catch {
        await supabase
          .from("campaign_assets")
          .update({ health_status: "broken", last_health_check: new Date().toISOString() })
          .eq("id", asset.id);
        broken++;
      }
    }

    return new Response(
      JSON.stringify({ checked: assets.length, ok, broken, redirect }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Health check failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
