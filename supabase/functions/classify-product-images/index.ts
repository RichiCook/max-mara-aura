import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Same lay-flat rules used by collage pipeline (kept in sync) ----------

function isShoeCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const c = category.toLowerCase();
  return c.includes("shoe") || c.includes("scarpe") || c.includes("boot") ||
    c.includes("stival") || c.includes("sandal") || c.includes("sneaker") ||
    c.includes("mocassin") || c.includes("loafer") || c.includes("décolleté") ||
    c.includes("decollete") || c.includes("pump") || c.includes("heel") ||
    c.includes("ciabatt") || c.includes("slide");
}

interface Verdict {
  label: "likely_lay_flat" | "suspicious" | "rejected";
  confidence: number; // 0..1
  reasons: string[];
}

function classifyUrl(url: string, category: string | null | undefined): Verdict {
  const reasons: string[] = [];
  const lower = url.toLowerCase();

  if (!lower.startsWith("http") && !lower.startsWith("data:")) {
    return { label: "rejected", confidence: 1, reasons: ["invalid_url"] };
  }

  // Universal reject signals
  if (lower.includes("#thumbnail")) reasons.push("thumbnail_marker");
  if (lower.includes("_crop") || lower.includes("_detail") ||
      lower.includes("_closeup") || lower.includes("_close_up") || lower.includes("_zoom")) {
    reasons.push("detail_crop");
  }
  if (lower.includes("_alt") || lower.includes("_model") || lower.includes("_worn") || lower.includes("_lifestyle")) {
    reasons.push("worn_or_alternate");
  }
  if (lower.includes("_back") || lower.includes("_rear")) {
    reasons.push("back_view");
  }

  // Max Mara rules
  if (lower.includes("maxmara.com")) {
    if (lower.includes("/s3swatch/")) {
      reasons.push("color_swatch_folder");
      return { label: "rejected", confidence: 0.95, reasons };
    }
    const variantMatch = lower.match(/-([a-z])-[^/_?#]+_normal\./);
    const variant = variantMatch?.[1] ?? null;
    if (!lower.includes("/s3master/")) {
      reasons.push("editorial_folder");
    }
    if (!variant) {
      reasons.push("no_variant_code");
    } else if (variant === "a") {
      reasons.push("master_packshot_a");
    } else if (variant === "w" && isShoeCategory(category)) {
      reasons.push("shoe_packshot_w");
    } else {
      reasons.push(`worn_variant_${variant}`);
    }

    const isMaster = lower.includes("/s3master/") && lower.includes("_normal.") && !lower.includes("/s3swatch/");
    const isApproved = variant === "a" || (variant === "w" && isShoeCategory(category));
    if (isMaster && isApproved) {
      return { label: "likely_lay_flat", confidence: 0.95, reasons };
    }
    if (!isMaster && isApproved) {
      // Right variant but wrong folder — can usually be rewritten, but treat as suspicious
      return { label: "suspicious", confidence: 0.5, reasons };
    }
    return { label: "rejected", confidence: 0.9, reasons };
  }

  // Champion / generic patterns
  if (/_full\.(jpg|jpeg|png|webp)(\?.*)?$/.test(lower)) {
    reasons.push("full_packshot");
    return { label: "likely_lay_flat", confidence: 0.9, reasons };
  }
  if (/_full_front\.(jpg|jpeg|png|webp)(\?.*)?$/.test(lower)) {
    reasons.push("full_front_packshot");
    return { label: "likely_lay_flat", confidence: 0.8, reasons };
  }

  if (reasons.length > 0) {
    return { label: "rejected", confidence: 0.7, reasons };
  }

  reasons.push("no_safe_pattern_match");
  return { label: "suspicious", confidence: 0.3, reasons };
}

function normalizeImages(images: unknown): string[] {
  if (!images) return [];
  const list = Array.isArray(images) ? images : typeof images === "string" ? [images] : [];
  return list
    .flatMap((img) => (typeof img === "string" ? img.split(/\r?\n/) : []))
    .map((u) => u.trim())
    .filter((u) => u.length > 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const productIds: string[] | undefined = Array.isArray(body.product_ids) ? body.product_ids : undefined;
    const allProducts: boolean = body.all === true;

    let query = supabase.from("products").select("id, product_code, category, images");
    if (productIds && productIds.length > 0) {
      query = query.in("id", productIds);
    } else if (!allProducts) {
      // Default: only products without an approved lay-flat yet
      query = query.is("approved_lay_flat_image_url", null);
    }

    const { data: products, error } = await query;
    if (error) throw error;

    let processed = 0;
    let approvedCount = 0;
    let suspiciousCount = 0;
    let missingCount = 0;

    for (const p of products || []) {
      const urls = normalizeImages((p as any).images);
      const verdicts = urls.map((url, idx) => ({
        url,
        idx,
        v: classifyUrl(url, p.category),
      }));

      // Pick best lay-flat candidate by confidence
      const layFlats = verdicts.filter((x) => x.v.label === "likely_lay_flat")
        .sort((a, b) => b.v.confidence - a.v.confidence);
      const best = layFlats[0] ?? null;

      const suspiciousOnly = verdicts.filter((x) => x.v.label === "suspicious");
      let productState: "approved" | "auto_selected" | "suspicious" | "missing" = "missing";
      let approvedUrl: string | null = null;

      if (best && best.v.confidence >= 0.85) {
        productState = "auto_selected";
        approvedUrl = best.url;
        approvedCount++;
      } else if (best || suspiciousOnly.length > 0) {
        productState = "suspicious";
        suspiciousCount++;
      } else {
        productState = "missing";
        missingCount++;
      }

      // Replace candidate rows for this product
      await supabase.from("product_image_candidates").delete().eq("product_id", p.id);

      if (verdicts.length > 0) {
        const rows = verdicts.map(({ url, idx, v }) => ({
          product_id: p.id,
          product_code: p.product_code,
          image_url: url,
          source_order: idx,
          machine_label: v.label,
          machine_confidence: v.confidence,
          suspicion_reasons: v.reasons,
          review_status: best && url === best.url && productState === "auto_selected" ? "auto_selected" : "pending",
          is_selected_lay_flat: !!(best && url === best.url && productState === "auto_selected"),
          manual_override: false,
        }));
        await supabase.from("product_image_candidates").insert(rows);
      }

      // Only set approved fields automatically if confidence was high; do not
      // overwrite an existing manual approval.
      const { data: existing } = await supabase
        .from("products")
        .select("approved_lay_flat_image_url, lay_flat_review_state")
        .eq("id", p.id)
        .single();

      const alreadyApprovedManually = existing?.lay_flat_review_state === "approved";
      if (!alreadyApprovedManually) {
        await supabase
          .from("products")
          .update({
            approved_lay_flat_image_url: approvedUrl,
            lay_flat_review_state: productState,
          })
          .eq("id", p.id);
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed, approvedCount, suspiciousCount, missingCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("classify-product-images error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
