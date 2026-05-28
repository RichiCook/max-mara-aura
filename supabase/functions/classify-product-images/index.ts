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
  // URL convention observed in DB:
  //   /s3master/  + -a- + _normal  => front shot ON MODEL (worn)        — NOT a flat lay for apparel
  //   /s3details/ + -w- + _normal  => true flat product packshot         — the lay-flat we want for apparel
  //   /s3details/ + -b/-d/-e/-f- + _normal => back / detail / closeup    — reject
  //   /s3swatch/                   => color chip                         — reject
  // For shoes the master -a- shot is already a flat packshot on white, so keep it as lay-flat.
  if (lower.includes("maxmara.com")) {
    if (lower.includes("/s3swatch/")) {
      reasons.push("color_swatch_folder");
      return { label: "rejected", confidence: 0.95, reasons };
    }

    const variantMatch = lower.match(/-([a-z])-[^/_?#]+_normal\./);
    const variant = variantMatch?.[1] ?? null;
    const inMaster = lower.includes("/s3master/");
    const inDetails = lower.includes("/s3details/");
    const isNormal = lower.includes("_normal.");
    const shoe = isShoeCategory(category);

    if (!variant) reasons.push("no_variant_code");
    else reasons.push(`variant_${variant}`);
    if (inMaster) reasons.push("folder_s3master");
    if (inDetails) reasons.push("folder_s3details");

    // Apparel: prefer /s3details/ -w- _normal as the true flat packshot
    if (!shoe && inDetails && variant === "w" && isNormal) {
      reasons.push("apparel_flat_packshot_w");
      return { label: "likely_lay_flat", confidence: 0.95, reasons };
    }

    // Shoes: /s3master/ -a- _normal is already a flat packshot
    if (shoe && inMaster && variant === "a" && isNormal) {
      reasons.push("shoe_master_packshot_a");
      return { label: "likely_lay_flat", confidence: 0.95, reasons };
    }

    // Apparel: master -a- is the worn/model shot — reject for collage use
    if (!shoe && inMaster && variant === "a") {
      reasons.push("apparel_worn_model_shot");
      return { label: "rejected", confidence: 0.9, reasons };
    }

    // Details with other variants are back/detail/closeup
    if (inDetails && variant && variant !== "w") {
      reasons.push("detail_or_back_view");
      return { label: "rejected", confidence: 0.85, reasons };
    }

    // Shoe in details/-w- as fallback
    if (shoe && inDetails && variant === "w" && isNormal) {
      reasons.push("shoe_details_w_fallback");
      return { label: "suspicious", confidence: 0.5, reasons };
    }

    reasons.push("maxmara_unrecognized_pattern");
    return { label: "suspicious", confidence: 0.3, reasons };
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
    const limit: number = Math.min(Math.max(Number(body.limit) || 200, 1), 500);

    // Select products + current state so we can preserve manual approvals without
    // a per-product round-trip.
    let query = supabase
      .from("products")
      .select("id, product_code, category, images, approved_lay_flat_image_url, lay_flat_review_state")
      .order("updated_at", { ascending: true })
      .limit(limit);

    if (productIds && productIds.length > 0) {
      query = query.in("id", productIds);
    } else if (!allProducts) {
      // Default: only products still in 'pending' (never classified).
      query = query.eq("lay_flat_review_state", "pending");
    }

    const { data: products, error } = await query;
    if (error) throw error;

    let processed = 0;
    let approvedCount = 0;
    let suspiciousCount = 0;
    let missingCount = 0;

    // Collect all candidate rows + product updates so we can write in bulk.
    const allCandidateRows: any[] = [];
    const productUpdates: { id: string; state: string; url: string | null }[] = [];
    const productIdsToClear: string[] = [];

    for (const p of products || []) {
      const urls = normalizeImages((p as any).images);
      const verdicts = urls.map((url, idx) => ({
        url,
        idx,
        v: classifyUrl(url, p.category),
      }));

      const layFlats = verdicts
        .filter((x) => x.v.label === "likely_lay_flat")
        .sort((a, b) => b.v.confidence - a.v.confidence);
      const best = layFlats[0] ?? null;
      const suspiciousOnly = verdicts.filter((x) => x.v.label === "suspicious");

      let productState: "auto_selected" | "suspicious" | "missing" = "missing";
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

      productIdsToClear.push(p.id);

      if (verdicts.length > 0) {
        for (const { url, idx, v } of verdicts) {
          const isAuto = !!(best && url === best.url && productState === "auto_selected");
          allCandidateRows.push({
            product_id: p.id,
            product_code: p.product_code,
            image_url: url,
            source_order: idx,
            machine_label: v.label,
            machine_confidence: v.confidence,
            suspicion_reasons: v.reasons,
            review_status: isAuto ? "auto_selected" : "pending",
            is_selected_lay_flat: isAuto,
            manual_override: false,
          });
        }
      }

      // Preserve manual approvals: never overwrite if already approved by a human.
      const alreadyApprovedManually = (p as any).lay_flat_review_state === "approved";
      if (!alreadyApprovedManually) {
        productUpdates.push({ id: p.id, state: productState, url: approvedUrl });
      }

      processed++;
    }

    // Bulk delete previous candidate rows for these products.
    if (productIdsToClear.length > 0) {
      await supabase.from("product_image_candidates").delete().in("product_id", productIdsToClear);
    }

    // Bulk insert candidates in chunks (Postgres has a parameter limit).
    const CHUNK = 500;
    for (let i = 0; i < allCandidateRows.length; i += CHUNK) {
      const slice = allCandidateRows.slice(i, i + CHUNK);
      const { error: insErr } = await supabase.from("product_image_candidates").insert(slice);
      if (insErr) console.error("candidate insert error:", insErr);
    }

    // Apply product updates grouped by (state, url) to minimize round-trips.
    // Group by state when url is null; otherwise update one-by-one.
    const stateGroups = new Map<string, string[]>();
    const urlUpdates: { id: string; url: string; state: string }[] = [];
    for (const u of productUpdates) {
      if (u.url) urlUpdates.push({ id: u.id, url: u.url, state: u.state });
      else {
        const arr = stateGroups.get(u.state) || [];
        arr.push(u.id);
        stateGroups.set(u.state, arr);
      }
    }
    for (const [state, ids] of stateGroups) {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        await supabase
          .from("products")
          .update({ approved_lay_flat_image_url: null, lay_flat_review_state: state })
          .in("id", slice);
      }
    }
    // url-bearing updates need per-row values; run in parallel batches.
    const PAR = 10;
    for (let i = 0; i < urlUpdates.length; i += PAR) {
      const slice = urlUpdates.slice(i, i + PAR);
      await Promise.all(
        slice.map((u) =>
          supabase
            .from("products")
            .update({ approved_lay_flat_image_url: u.url, lay_flat_review_state: u.state })
            .eq("id", u.id)
        )
      );
    }

    const remaining = !productIds && !allProducts
      ? Math.max(0, (await supabase.from("products").select("id", { count: "exact", head: true }).eq("lay_flat_review_state", "pending")).count || 0)
      : 0;

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        approvedCount,
        suspiciousCount,
        missingCount,
        remaining,
        hasMore: remaining > 0,
      }),
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

