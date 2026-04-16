import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Category mapping: English slugs ↔ French DB patterns ───
const CATEGORY_PATTERNS: Record<string, string[]> = {
  shoes: ["souliers", "escarpins", "sneakers", "bottines", "bottes", "sandales", "mocassins", "ballerines", "espadrilles"],
  bags: ["sacs", "pochettes", "cabas", "bandoulière", "portés main", "portés épaule"],
  accessories: ["accessoires", "ceintures", "lunettes", "porte-clés", "bijoux", "bracelets", "portefeuilles"],
  beauty: ["beauté", "teint", "lèvres", "yeux", "ongles", "parfums", "rouges à lèvres"],
  small_leather_goods: ["portefeuilles", "petits accessoires"],
  eyewear: ["lunettes"],
};

/** Check if a product category (French hierarchical) matches an English slug */
function categoryMatchesSlug(productCategory: string, slug: string): boolean {
  if (slug === "any") return true;
  const catLower = productCategory.toLowerCase();
  // Direct substring match (handles cases like "shoes" in English categories)
  if (catLower.includes(slug.toLowerCase())) return true;
  // French pattern match
  const patterns = CATEGORY_PATTERNS[slug.toLowerCase()];
  if (!patterns) return false;
  return patterns.some(p => catLower.includes(p));
}

/** Build an ilike filter for a target category slug */
function targetCategoryFilter(slug: string): string | null {
  if (slug === "any") return null;
  // Try French patterns first
  const patterns = CATEGORY_PATTERNS[slug.toLowerCase()];
  if (patterns && patterns.length > 0) return patterns[0]; // Use primary pattern
  return slug; // Fallback to raw slug
}

const DYNAMIC_TITLES: Record<string, string> = {
  bags: "Bags to Match",
  shoes: "Shoes to Match",
  accessories: "Complete Your Look",
  small_leather_goods: "Small Leather Goods",
  eyewear: "Eyewear to Match",
  beauty: "Beauty Picks",
};

function generateDynamicTitle(rule: any): string {
  const overrides = rule.target_attribute_overrides || {};
  if (overrides.title_template) {
    const targetLabel = rule.target_category.charAt(0).toUpperCase() + rule.target_category.slice(1);
    const matchLabel = (rule.match_dimensions || [])[0] || "style";
    return overrides.title_template
      .replace("{target_category}", targetLabel)
      .replace("{match_type}", matchLabel);
  }
  const dims = rule.match_dimensions || [];
  const target = rule.target_category || "any";
  if (dims.includes("collection")) return "From the Same Collection";
  if (dims.includes("color")) return DYNAMIC_TITLES[target] || `${target.charAt(0).toUpperCase() + target.slice(1)} to Match`;
  if (dims.includes("material")) return `Same Material ${target.charAt(0).toUpperCase() + target.slice(1)}`;
  return DYNAMIC_TITLES[target] || "You Might Also Like";
}

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
    const excludeCurrent = carousel.exclude_current !== false;
    const fallbackBehavior = carousel.fallback_behavior || "use_match_type";

    // ─── Step 1: Try per-carousel rules ───
    const { data: rules } = await supabase
      .from("carousel_rules")
      .select("*")
      .eq("carousel_id", carousel_id)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (rules && rules.length > 0) {
      const result = await resolveCarouselRules(supabase, product, rules, maxItems);
      if (result.products.length > 0) {
        return jsonResp({
          products: result.products,
          match_reason: result.matchReason,
          dynamic_title: result.dynamicTitle,
          matched_rule_ids: result.matchedRuleIds,
          algorithm_version: "3.1",
        });
      }
    }

    // ─── Step 2: Fallback behavior ───
    if (rules && rules.length > 0 && fallbackBehavior === "hide") {
      return jsonResp({ products: [], match_reason: "No rules matched — hidden", algorithm_version: "3.1" });
    }

    if (rules && rules.length > 0 && fallbackBehavior === "featured_products") {
      const featuredIds = carousel.fallback_product_ids || [];
      if (featuredIds.length > 0) {
        const { data } = await supabase.from("products").select("*").in("id", featuredIds);
        return jsonResp({ products: data || [], match_reason: "Featured products fallback", algorithm_version: "3.1" });
      }
      return jsonResp({ products: [], match_reason: "No featured products", algorithm_version: "3.1" });
    }

    // ─── Step 3: Match type fallback (original logic) ───
    let products: any[] = [];
    let matchReason = carousel.match_type;
    const targetCategory = carousel.target_category || "same";
    const attrOverrides = (carousel.target_attribute_overrides || {}) as Record<string, any>;
    const matchType = carousel.match_type;
    const effectiveCategory = targetCategory !== "same" ? targetCategory : null;
    const effectiveCategoryPattern = effectiveCategory ? targetCategoryFilter(effectiveCategory) : null;

    const getAttr = (field: string) => {
      if (attrOverrides?.enabled && attrOverrides[field]) return attrOverrides[field];
      return product[field];
    };

    const buildQuery = () => {
      let q = supabase.from("products").select("*");
      if (excludeCurrent) q = q.neq("id", product_id);
      if (effectiveCategoryPattern) q = q.ilike("category", `%${effectiveCategoryPattern}%`);
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
          matchReason = `Same color — ${color}`;
        }
        break;
      }
      case "material": {
        const mat = getAttr("material");
        if (mat) {
          const { data } = await applySorting(buildQuery().eq("material", mat)).limit(maxItems);
          products = data || [];
          matchReason = `Same material — ${mat}`;
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
      case "cross_category": {
        // For cross_category match type without rules, use category_mappings config as legacy fallback
        const mappings = config.category_mappings || [];
        const matched = mappings.filter((m: any) => {
          if (m.source === "any") return true;
          return categoryMatchesSlug(product.category || "", m.source);
        });
        if (matched.length > 0) {
          const allProds: any[] = [];
          const seenIds = new Set<string>();
          const reasons: string[] = [];
          for (const mapping of matched) {
            if (allProds.length >= maxItems) break;
            const remaining = maxItems - allProds.length;
            let q = supabase.from("products").select("*").neq("id", product_id).limit(remaining);
            if (mapping.target !== "any") {
              const pattern = targetCategoryFilter(mapping.target);
              if (pattern) q = q.ilike("category", `%${pattern}%`);
            }
            const dims = mapping.match_by || [];
            if (dims.includes("color") && product.color) q = q.eq("color", product.color);
            if (dims.includes("collection") && product.collection) q = q.eq("collection", product.collection);
            if (dims.includes("material") && product.material) q = q.eq("material", product.material);
            if (dims.includes("gender") && product.gender) q = q.eq("gender", product.gender);
            if (dims.includes("price_tier") && product.price_tier) q = q.eq("price_tier", product.price_tier);
            if (dims.includes("silhouette_family") && product.silhouette_family) q = q.eq("silhouette_family", product.silhouette_family);
            q = applySorting(q);
            const { data } = await q;
            if (data) {
              for (const p of data) {
                if (!seenIds.has(p.id)) { seenIds.add(p.id); allProds.push(p); }
              }
              if (data.length > 0) reasons.push(`${mapping.source} → ${mapping.target}`);
            }
          }
          products = allProds.slice(0, maxItems);
          matchReason = reasons.length ? `Cross: ${reasons.join(" + ")}` : "Cross-Category";
        }
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

    return jsonResp({ products, match_reason: matchReason, algorithm_version: "3.1" });
  } catch (err) {
    console.error("Recommendation error:", err);
    return jsonResp({ error: "Internal server error" }, 500);
  }
});

// ─── Per-carousel rules resolver ───
async function resolveCarouselRules(
  supabase: any, product: any, rules: any[], maxItems: number
) {
  const productCat = product.category || "";

  console.log(`[recommendations] Product: ${product.id}, category: "${productCat}", rules: ${rules.length}`);

  const matchingRules = rules.filter((rule: any) => {
    const triggerCats = rule.trigger_categories || [];
    if (!triggerCats.includes("any")) {
      const matches = triggerCats.some((tc: string) => categoryMatchesSlug(productCat, tc));
      console.log(`[recommendations] Rule ${rule.id}: triggers=${JSON.stringify(triggerCats)}, matches=${matches}`);
      if (!matches) return false;
    }

    const filters = rule.trigger_filters || {};
    if (filters.gender && product.gender && filters.gender !== product.gender) return false;
    if (filters.collection && product.collection && filters.collection !== product.collection) return false;
    if (filters.color && product.color && filters.color !== product.color) return false;
    if (filters.material && product.material && filters.material !== product.material) return false;
    if (filters.occasion && product.occasion && !product.occasion.includes(filters.occasion)) return false;
    return true;
  });

  console.log(`[recommendations] Matching rules: ${matchingRules.length}`);

  if (matchingRules.length === 0) return { products: [], matchReason: "No rules match this product", dynamicTitle: null, matchedRuleIds: [] };

  const allProducts: any[] = [];
  const seenIds = new Set<string>();
  const reasons: string[] = [];
  const matchedRuleIds: string[] = [];
  let dynamicTitle: string | null = null;

  for (const rule of matchingRules) {
    if (allProducts.length >= maxItems) break;
    const remaining = Math.min(rule.max_results || 8, maxItems - allProducts.length);

    let q = supabase.from("products").select("*")
      .neq("id", product.id)
      .limit(remaining);

    if (rule.target_category !== "any") {
      const pattern = targetCategoryFilter(rule.target_category);
      if (pattern) q = q.ilike("category", `%${pattern}%`);
    }

    const dims = rule.match_dimensions || [];
    const overrides = rule.target_attribute_overrides || {};

    // Match dimension logic — including price_range
    if (dims.includes("color") && product.color) q = q.eq("color", overrides.color || product.color);
    if (dims.includes("collection") && product.collection) q = q.eq("collection", overrides.collection || product.collection);
    if (dims.includes("material") && product.material) q = q.eq("material", overrides.material || product.material);
    if (dims.includes("gender") && product.gender) q = q.eq("gender", overrides.gender || product.gender);
    if (dims.includes("price_tier") && product.price_tier) q = q.eq("price_tier", product.price_tier);
    if (dims.includes("style_mood") && product.style_mood) q = q.eq("style_mood", product.style_mood);
    if (dims.includes("silhouette_family") && product.silhouette_family) q = q.eq("silhouette_family", product.silhouette_family);

    const sortBy = rule.sort_by || "best_sellers";
    switch (sortBy) {
      case "price_asc": q = q.order("price", { ascending: true }); break;
      case "price_desc": q = q.order("price", { ascending: false }); break;
      case "random": q = q.order("created_at", { ascending: false }); break;
      case "newest": q = q.order("created_at", { ascending: false }); break;
      default: q = q.order("created_at", { ascending: false });
    }

    const { data } = await q;

    // Handle price_range matching client-side
    let filtered = data || [];
    if (dims.includes("price_range") && product.price) {
      const priceNum = parseFloat(String(product.price).replace(/[^0-9.,]/g, "").replace(",", "."));
      if (!isNaN(priceNum)) {
        filtered = filtered.filter((p: any) => {
          const pp = parseFloat(String(p.price || "").replace(/[^0-9.,]/g, "").replace(",", "."));
          return !isNaN(pp) && pp >= priceNum * 0.7 && pp <= priceNum * 1.3;
        });
      }
    }

    if (filtered.length > 0) {
      for (const p of filtered) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          allProducts.push(p);
        }
      }
      const triggerLabel = rule.trigger_categories.includes("any") ? "Any" : rule.trigger_categories.join("/");
      reasons.push(`${triggerLabel} → ${rule.target_category}`);
      matchedRuleIds.push(rule.id);

      // Use the first matching rule's title
      if (!dynamicTitle) {
        dynamicTitle = generateDynamicTitle(rule);
      }
    }
  }

  return {
    products: allProducts.slice(0, maxItems),
    matchReason: reasons.length ? `Rules: ${reasons.join(" + ")}` : "Carousel rules",
    dynamicTitle,
    matchedRuleIds,
  };
}

function jsonResp(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
