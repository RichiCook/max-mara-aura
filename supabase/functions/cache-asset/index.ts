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
    const { asset_id } = await req.json();
    if (!asset_id) {
      return new Response(JSON.stringify({ error: "Missing asset_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get asset with source info
    const { data: asset } = await supabase
      .from("campaign_assets")
      .select("*, campaign_sources(slug)")
      .eq("id", asset_id)
      .single();

    if (!asset) {
      return new Response(JSON.stringify({ error: "Asset not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch image
    const imgRes = await fetch(asset.original_url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Lovable Cache)" },
    });

    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch: ${imgRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const blob = await imgRes.blob();
    const filename = asset.original_url.split("/").pop() || "image.jpg";
    const sourceSlug = (asset.campaign_sources as any)?.slug || "unknown";
    const storagePath = `${sourceSlug}/${filename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("campaign-assets")
      .upload(storagePath, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("campaign-assets")
      .getPublicUrl(storagePath);

    // Update asset record
    await supabase
      .from("campaign_assets")
      .update({
        cached_url: urlData.publicUrl,
        render_mode: "download",
      })
      .eq("id", asset_id);

    return new Response(
      JSON.stringify({ success: true, cached_url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Cache failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
