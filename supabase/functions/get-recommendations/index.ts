import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { product_id, carousel_id, user_session_id, limit: reqLimit } = body;

    if (!product_id || !carousel_id) {
      return jsonResp({ error: "product_id and carousel_id required" }, 400);
    }

    const { data: carousel } = await supabase.from("product_carousels").select("*").eq("id", carousel_id).single();
    if (!carousel) return jsonResp({ error: "Carousel not found" }, 404);

    const { data: product } = await supabase.from("products").select("*").eq("id", product_id).single();
    if (!product) return jsonResp({ error: "Product not found" }, 404);

    const config = (carousel.match_config || {}) as Record<string, any>;
    const maxItems = reqLimit || config.max_items || 12;
    const sortBy = carousel.sort_by || "newest";
    const targetCategory = carousel.target_category || "same";
    const useDependenceRules = carousel.use_dependence_rules || false;
    const linkedRuleIds = carousel.linked_rule_ids || [];
    const attrOverrides = (carousel.target_attribute_overrides || {}) as Record<string, any>;
    const excludeCurrent = carousel.exclude_current !== false;

    let products: any[] = [];
    let matchReason = carousel.match_type;

    // ─── Dependence Rules Mode ───
    if (useDependenceRules) {
      const result = await resolveDependenceRules(supabase, product, linkedRuleIds, maxItems);
      products = result.products;
      matchReason = result.matchReason;
    }
    // ─── Cross-Category or Same-Category Mode ───
    else {
      const matchType = carousel.match_type;
      const effectiveCategory = targetCategory !== "same" && targetCategory !== "dependence_rules" ? targetCategory : null;

      // Get attribute value (from product or override)
      const getAttr = (field: string) => {
        if (attrOverrides?.enabled && attrOverrides[field]) return attrOverrides[field];
        return product[field];
      };

      const buildQuery = () => {
        let q = supabase.from("products").select("*");
        if (excludeCurrent) q = q.neq("id", product_id);
        if (effectiveCategory) {
          q = q.ilike("category", `%${effectiveCategory}%`);
        }
        return q;
      };

      const applySorting = (q: any) => {
        switch (sortBy) {
          case "price_asc": return q.order("price", { ascending: true });
          case "price_desc": return q.order("price", { ascending: false });
          default: return q.order("created_at", { ascending: false });
        }
      };

      switch (matchType) {
        case "category": {
          const cat = effectiveCategory || product.category;
          if (cat) {
            let q = buildQuery();
            if (!effectiveCategory) q = q.eq("category", cat);
            q = applySorting(q).limit(maxItems);
            const { data } = await q;
            products = data || [];
            matchReason = `Same category — ${cat}`;
            if (products.length === 0 && config.fallback_to_collection && product.collection) {
              const { data: fb } = await applySorting(buildQuery().eq("collection", product.collection)).limit(maxItems);
              products = fb || [];
              matchReason = `Fallback to collection — ${product.collection}`;
            }
          }
          break;
        }
        case "collection": {
          if (product.collection) {
            const { data } = await applySorting(buildQuery().eq("collection", product.collection)).limit(maxItems);
            products = data || [];
            matchReason = `Same collection — ${product.collection}`;
          }
          break;
        }
        case "color": {
          const color = getAttr("color");
          if (color) {
            const { data } = await applySorting(buildQuery().eq("color", color)).limit(maxItems);
            products = data || [];
            matchReason = effectiveCategory ? `Matching ${effectiveCategory} — same color` : `Same color — ${color}`;
          }
          break;
        }
        case "material": {
          const mat = getAttr("material");
          if (mat) {
            const { data } = await applySorting(buildQuery().eq("material", mat)).limit(maxItems);
            products = data || [];
            matchReason = effectiveCategory ? `Matching ${effectiveCategory} — same material` : `Same material — ${mat}`;
          }
          break;
        }
        case "silhouette": {
          const sil = getAttr("silhouette_family");
          if (sil) {
            const { data } = await applySorting(buildQuery().eq("silhouette_family", sil)).limit(maxItems);
            products = data || [];
            matchReason = `Same silhouette — ${sil}`;
          }
          break;
        }
        case "heel_height": {
          if (product.heel_height_mm) {
            const tol = config.tolerance || 20;
            const { data } = await applySorting(buildQuery().gte("heel_height_mm", product.heel_height_mm - tol).lte("heel_height_mm", product.heel_height_mm + tol)).limit(maxItems);
            products = data || [];
            matchReason = `Similar heel — ${product.heel_height_mm}mm ±${tol}mm`;
          }
          break;
        }
        case "price_range": {
          const priceNum = parseFloat(String(product.price || "").replace(/[^0-9.,]/g, "").replace(",", "."));
          if (!isNaN(priceNum)) {
            const tol = (config.tolerance || 30) / 100;
            const { data } = await buildQuery().limit(200);
            if (data) {
              products = data.filter((p: any) => {
                const pp = parseFloat(String(p.price || "").replace(/[^0-9.,]/g, "").replace(",", "."));
                return !isNaN(pp) && pp >= priceNum * (1 - tol) && pp <= priceNum * (1 + tol);
              }).slice(0, maxItems);
            }
            matchReason = `Similar price — ±${config.tolerance || 30}%`;
          }
          break;
        }
        case "complete_look": {
          if (product.id) {
            const { data: looks } = await supabase.from("looks").select("product_ids").contains("product_ids", [product.id]);
            if (looks?.length) {
              const relatedIds = new Set<string>();
              for (const look of looks) for (const pid of look.product_ids) if (pid !== product.id) relatedIds.add(pid);
              if (relatedIds.size > 0) {
                let q = supabase.from("products").select("*").in("id", Array.from(relatedIds)).limit(maxItems);
                if (effectiveCategory) q = q.ilike("category", `%${effectiveCategory}%`);
                const { data } = await q;
                products = data || [];
              }
            }
            matchReason = "Complete the Look";
          }
          break;
        }
        case "recently_viewed": {
          if (user_session_id) {
            const { data: views } = await supabase.from("product_views").select("product_id")
              .eq("session_id", user_session_id).neq("product_id", product_id)
              .order("viewed_at", { ascending: false }).limit(maxItems);
            if (views?.length) {
              const ids = [...new Set(views.map((v: any) => v.product_id))];
              let q = supabase.from("products").select("*").in("id", ids).limit(maxItems);
              if (effectiveCategory) q = q.ilike("category", `%${effectiveCategory}%`);
              const { data } = await q;
              products = data || [];
            }
            matchReason = "Recently Viewed";
          }
          break;
        }
        case "trending": {
          const { data: trending } = await supabase.from("scan_events").select("product_code")
            .eq("event_type", "page_view").order("created_at", { ascending: false }).limit(500);
          if (trending) {
            const counts: Record<string, number> = {};
            for (const ev of trending) counts[ev.product_code] = (counts[ev.product_code] || 0) + 1;
            const codes = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, maxItems).map(([c]) => c).filter(c => c !== product.product_code);
            if (codes.length > 0) {
              let q = supabase.from("products").select("*").in("product_code", codes).limit(maxItems);
              if (effectiveCategory) q = q.ilike("category", `%${effectiveCategory}%`);
              const { data } = await q;
              products = data || [];
            }
          }
          matchReason = "Trending Now";
          break;
        }
        case "new_arrivals": {
          const { data } = await applySorting(buildQuery()).limit(maxItems);
          products = data || [];
          matchReason = "New Arrivals";
          break;
        }
        case "customers_also_viewed": {
          const { data: sessions } = await supabase.from("scan_events").select("session_id")
            .eq("product_code", product.product_code || "").eq("event_type", "page_view").limit(100);
          if (sessions?.length) {
            const sids = [...new Set(sessions.map((s: any) => s.session_id))].slice(0, 20);
            const { data: coViews } = await supabase.from("scan_events").select("product_code")
              .in("session_id", sids).eq("event_type", "page_view").neq("product_code", product.product_code || "").limit(200);
            if (coViews) {
              const counts: Record<string, number> = {};
              for (const v of coViews) counts[v.product_code] = (counts[v.product_code] || 0) + 1;
              const codes = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, maxItems).map(([c]) => c);
              if (codes.length > 0) {
                let q = supabase.from("products").select("*").in("product_code", codes).limit(maxItems);
                if (effectiveCategory) q = q.ilike("category", `%${effectiveCategory}%`);
                const { data } = await q;
                products = data || [];
              }
            }
          }
          matchReason = "Customers Also Viewed";
          break;
        }
        case "ai_recommend": {
          const weights = config.weights || { category: 30, color: 20, price: 20, style: 15, popularity: 15 };
          const { data: candidates } = await buildQuery().limit(200);
          if (candidates) {
            const cp = parseFloat(String(product.price || "").replace(/[^0-9.,]/g, "").replace(",", "."));
            const scored = candidates.map((c: any) => {
              let score = 0;
              if (product.category && c.category === product.category) score += weights.category || 0;
              if (product.color && c.color === product.color) score += weights.color || 0;
              if (!isNaN(cp)) {
                const pp = parseFloat(String(c.price || "").replace(/[^0-9.,]/g, "").replace(",", "."));
                if (!isNaN(pp)) score += (weights.price || 0) * Math.max(0, 1 - Math.abs(cp - pp) / cp);
              }
              if (product.silhouette_family && c.silhouette_family === product.silhouette_family) score += (weights.style || 0) * 0.5;
              if (product.material && c.material === product.material) score += (weights.style || 0) * 0.5;
              return { ...c, _score: score };
            });
            scored.sort((a: any, b: any) => b._score - a._score);
            products = scored.slice(0, maxItems).map(({ _score, ...rest }: any) => rest);
          }
          matchReason = "You May Also Like (AI)";
          break;
        }
        case "manual": {
          const { data: items } = await supabase.from("product_carousel_items").select("target_product_id")
            .eq("carousel_id", carousel_id).or(`source_product_id.eq.${product_id},source_product_id.is.null`)
            .order("display_order", { ascending: true }).limit(maxItems);
          if (items?.length) {
            const ids = items.map((i: any) => i.target_product_id);
            const { data } = await supabase.from("products").select("*").in("id", ids);
            if (data) {
              const orderMap = new Map(ids.map((id: string, idx: number) => [id, idx]));
              products = data.sort((a: any, b: any) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
            }
          }
          matchReason = "Curated";
          break;
        }
      }
    }

    return jsonResp({ products, match_reason: matchReason, algorithm_version: "2.0" });
  } catch (err) {
    console.error("Recommendation error:", err);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});

// ─── Dependence Rules resolver ───
async function resolveDependenceRules(
  supabase: any, product: any, linkedRuleIds: string[], maxItems: number
) {
  // Fetch approved, active rules
  let query = supabase.from("dependence_rules").select("*")
    .eq("status", "approved").eq("is_active", true)
    .order("priority", { ascending: true });

  // If specific rules are linked, filter to those
  if (linkedRuleIds.length > 0) {
    query = query.in("id", linkedRuleIds);
  }

  const { data: rules } = await query;
  if (!rules?.length) return { products: [], matchReason: "No matching rules" };

  // Filter rules whose trigger_categories include the product's category
  const productCatLower = (product.category || "").toLowerCase();
  const matchingRules = rules.filter((rule: any) => {
    const triggerCats = rule.trigger_categories || [];
    const matches = triggerCats.some((tc: string) => productCatLower.includes(tc.toLowerCase()));
    if (!matches) return false;

    // Check trigger filters
    const filters = rule.trigger_filters || {};
    if (filters.gender && product.gender && filters.gender !== product.gender) return false;
    if (filters.collection && product.collection && filters.collection !== product.collection) return false;
    if (filters.color && product.color && filters.color !== product.color) return false;
    if (filters.material && product.material && filters.material !== product.material) return false;
    if (filters.occasion && product.occasion && !product.occasion.includes(filters.occasion)) return false;
    return true;
  });

  if (matchingRules.length === 0) return { products: [], matchReason: "No rules match this product" };

  const allProducts: any[] = [];
  const seenIds = new Set<string>();
  const reasons: string[] = [];

  for (const rule of matchingRules) {
    if (allProducts.length >= maxItems) break;
    const remaining = maxItems - allProducts.length;

    let q = supabase.from("products").select("*")
      .neq("id", product.id)
      .ilike("category", `%${rule.target_category}%`)
      .limit(remaining);

    // Apply match dimensions
    const dims = rule.match_dimensions || [];
    if (dims.includes("color") && product.color) q = q.eq("color", product.color);
    if (dims.includes("collection") && product.collection) q = q.eq("collection", product.collection);
    if (dims.includes("material") && product.material) q = q.eq("material", product.material);
    if (dims.includes("gender") && product.gender) q = q.eq("gender", product.gender);
    if (dims.includes("price_tier") && product.price_tier) q = q.eq("price_tier", product.price_tier);
    if (dims.includes("style_mood") && product.style_mood) q = q.eq("style_mood", product.style_mood);

    const { data } = await q;
    if (data) {
      for (const p of data) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          allProducts.push(p);
        }
      }
      if (data.length > 0) reasons.push(`Rule: ${rule.name}`);
    }
  }

  return {
    products: allProducts.slice(0, maxItems),
    matchReason: reasons.join(" + ") || "Dependence rules",
  };
}

function jsonResp(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
