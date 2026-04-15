import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function inferAssetType(filename: string): string {
  const upper = filename.toUpperCase();
  if (upper.includes("STILL-LIFE")) return "still-life";
  if (upper.includes("LATEST-CO") || upper.includes("LATEST-COLLECTION")) return "hero";
  if (upper.includes("WEDDING") || upper.includes("BRIDAL")) return "hero";
  if (upper.includes("MENU-DROP-DOWN") || upper.includes("DROP-DOWN-MENU")) return "product";
  if (upper.includes("EXPAND")) return "editorial";
  return "editorial";
}

function inferLabel(filename: string): string {
  return filename
    .replace(/\.(jpg|jpeg|png|webp|gif|mp4)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(LATEST|COLLECTION|CO|REVAMP|EXPAND|EXPANDS|MENU|DROP|DOWN)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || "Untitled asset";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Create scrape log
    const { data: log } = await supabase
      .from("scrape_logs")
      .insert({ status: "running" })
      .select()
      .single();

    const logId = log?.id;

    // Get all sources
    const { data: sources } = await supabase
      .from("campaign_sources")
      .select("*");

    if (!sources?.length) {
      await supabase.from("scrape_logs").update({ status: "completed", completed_at: new Date().toISOString(), assets_found: 0 }).eq("id", logId);
      return new Response(JSON.stringify({ success: true, assets_found: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalFound = 0;
    let totalNew = 0;

    for (const source of sources) {
      try {
        const res = await fetch(source.page_url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Lovable Campaign Scraper)",
            Accept: "text/html",
          },
        });

        if (!res.ok) continue;
        const html = await res.text();

        // Extract image URLs
        const imgRegex = /https?:\/\/[^"'\s]*\/media\/wysiwyg\/[^"'\s]+\.(jpg|jpeg|png|webp|gif)/gi;
        const foundUrls = new Set<string>();
        let match;
        while ((match = imgRegex.exec(html)) !== null) {
          foundUrls.add(match[0]);
        }

        // Extract video poster/source URLs
        const videoPosterRegex = /<video[^>]*poster="([^"]+)"/gi;
        while ((match = videoPosterRegex.exec(html)) !== null) {
          foundUrls.add(match[1]);
        }
        const videoSrcRegex = /<source[^>]*src="([^"]+\.mp4)"/gi;
        while ((match = videoSrcRegex.exec(html)) !== null) {
          foundUrls.add(match[1]);
        }

        totalFound += foundUrls.size;

        // Get existing assets for this source
        const { data: existing } = await supabase
          .from("campaign_assets")
          .select("original_url")
          .eq("source_id", source.id);

        const existingUrls = new Set((existing || []).map((a: any) => a.original_url));

        // Insert new assets
        const newAssets = [...foundUrls]
          .filter((url) => !existingUrls.has(url))
          .map((url) => {
            const filename = url.split("/").pop() || "";
            const isVideo = /\.mp4$/i.test(filename);
            return {
              source_id: source.id,
              original_url: url,
              asset_type: inferAssetType(filename),
              media_type: isVideo ? "video" : "image",
              label: inferLabel(filename),
              enabled: false,
            };
          });

        if (newAssets.length > 0) {
          await supabase.from("campaign_assets").insert(newAssets);
          totalNew += newAssets.length;
        }
      } catch (err) {
        console.error(`Error scraping ${source.page_url}:`, err);
      }
    }

    await supabase.from("scrape_logs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      assets_found: totalFound,
      assets_new: totalNew,
    }).eq("id", logId);

    return new Response(
      JSON.stringify({ success: true, assets_found: totalFound, assets_new: totalNew }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Scrape failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
