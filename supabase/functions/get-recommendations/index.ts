import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  product_id: string;
  carousel_id: string;
  user_session_id?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: ReqBody = await req.json();
    const { product_id, carousel_id, user_session_id, limit: reqLimit } = body;

    if (!product_id || !carousel_id) {
      return new Response(
        JSON.stringify({ error: "product_id and carousel_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch carousel config
    const { data: carousel, error: carouselErr } = await supabase
      .from("product_carousels")
      .select("*")
      .eq("id", carousel_id)
      .single();

    if (carouselErr || !carousel) {
      return new Response(
        JSON.stringify({ error: "Carousel not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch current product
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (prodErr || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matchType = carousel.match_type;
    const config = (carousel.match_config || {}) as Record<string, any>;
    const maxItems = reqLimit || config.max_items || 12;
    const excludeCurrent = carousel.exclude_current !== false;
    const sortBy = carousel.sort_by || "newest";

    let products: any[] = [];
    let matchReason = matchType;

    // Build base query helper
    const buildQuery = () => {
      let q = supabase.from("products").select("*");
      if (excludeCurrent) q = q.neq("id", product_id);
      return q;
    };

    const applySorting = (q: any) => {
      switch (sortBy) {
        case "price_asc": return q.order("price", { ascending: true });
        case "price_desc": return q.order("price", { ascending: false });
        case "newest": return q.order("created_at", { ascending: false });
        default: return q.order("created_at", { ascending: false });
      }
    };

    switch (matchType) {
      case "category": {
        if (product.category) {
          let q = buildQuery().eq("category", product.category).limit(maxItems);
          q = applySorting(q);
          const { data } = await q;
          products = data || [];
          matchReason = `Same category — ${product.category}`;
          // Fallback to collection
          if (products.length === 0 && config.fallback_to_collection && product.collection) {
            let fq = buildQuery().eq("collection", product.collection).limit(maxItems);
            fq = applySorting(fq);
            const { data: fb } = await fq;
            products = fb || [];
            matchReason = `Fallback to collection — ${product.collection}`;
          }
        }
        break;
      }
      case "collection": {
        if (product.collection) {
          let q = buildQuery().eq("collection", product.collection).limit(maxItems);
          q = applySorting(q);
          const { data } = await q;
          products = data || [];
          matchReason = `Same collection — ${product.collection}`;
        }
        break;
      }
      case "color": {
        if (product.color) {
          let q = buildQuery().eq("color", product.color).limit(maxItems);
          q = applySorting(q);
          const { data } = await q;
          products = data || [];
          matchReason = `Same color — ${product.color}`;
        }
        break;
      }
      case "material": {
        if (product.material) {
          let q = buildQuery().eq("material", product.material).limit(maxItems);
          q = applySorting(q);
          const { data } = await q;
          products = data || [];
          matchReason = `Same material — ${product.material}`;
        }
        break;
      }
      case "silhouette": {
        if (product.silhouette_family) {
          let q = buildQuery().eq("silhouette_family", product.silhouette_family).limit(maxItems);
          q = applySorting(q);
          const { data } = await q;
          products = data || [];
          matchReason = `Same silhouette — ${product.silhouette_family}`;
        }
        break;
      }
      case "heel_height": {
        if (product.heel_height_mm) {
          const tolerance = config.tolerance || 20;
          const min = product.heel_height_mm - tolerance;
          const max = product.heel_height_mm + tolerance;
          let q = buildQuery().gte("heel_height_mm", min).lte("heel_height_mm", max).limit(maxItems);
          q = applySorting(q);
          const { data } = await q;
          products = data || [];
          matchReason = `Similar heel height — ${product.heel_height_mm}mm ±${tolerance}mm`;
        }
        break;
      }
      case "price_range": {
        if (product.price) {
          const priceNum = parseFloat(String(product.price).replace(/[^0-9.,]/g, "").replace(",", "."));
          if (!isNaN(priceNum)) {
            const tolerance = (config.tolerance || 30) / 100;
            const min = Math.round(priceNum * (1 - tolerance));
            const max = Math.round(priceNum * (1 + tolerance));
            // Price is text, so we fetch all and filter
            let q = buildQuery().limit(200);
            const { data } = await q;
            if (data) {
              products = data.filter((p: any) => {
                const pp = parseFloat(String(p.price || "").replace(/[^0-9.,]/g, "").replace(",", "."));
                return !isNaN(pp) && pp >= min && pp <= max;
              }).slice(0, maxItems);
            }
            matchReason = `Similar price — ±${config.tolerance || 30}%`;
          }
        }
        break;
      }
      case "complete_look": {
        // Use product_code to find compositions where this product is included
        if (product.product_code) {
          // Look for looks that include this product
          const { data: looks } = await supabase
            .from("looks")
            .select("product_ids")
            .contains("product_ids", [product.id]);

          if (looks && looks.length > 0) {
            const relatedIds = new Set<string>();
            for (const look of looks) {
              for (const pid of look.product_ids) {
                if (pid !== product.id) relatedIds.add(pid);
              }
            }
            if (relatedIds.size > 0) {
              const { data } = await supabase
                .from("products")
                .select("*")
                .in("id", Array.from(relatedIds))
                .limit(maxItems);
              products = data || [];
            }
          }
          matchReason = "Complete the Look";
        }
        break;
      }
      case "recently_viewed": {
        if (user_session_id) {
          const window = config.time_window || "7_days";
          const interval = window === "session" ? "1 day" : window === "7_days" ? "7 days" : "30 days";
          
          let q = supabase
            .from("product_views")
            .select("product_id")
            .eq("session_id", user_session_id)
            .neq("product_id", product_id)
            .order("viewed_at", { ascending: false })
            .limit(maxItems);

          const { data: views } = await q;
          if (views && views.length > 0) {
            const ids = [...new Set(views.map((v: any) => v.product_id))];
            const { data } = await supabase
              .from("products")
              .select("*")
              .in("id", ids)
              .limit(maxItems);
            products = data || [];
          }
          matchReason = "Recently Viewed";
        }
        break;
      }
      case "trending": {
        const window = config.time_window || "7_days";
        // Use scan_events as a proxy for views
        const { data: trending } = await supabase
          .from("scan_events")
          .select("product_code")
          .eq("event_type", "page_view")
          .order("created_at", { ascending: false })
          .limit(500);

        if (trending) {
          const counts: Record<string, number> = {};
          for (const ev of trending) {
            counts[ev.product_code] = (counts[ev.product_code] || 0) + 1;
          }
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, maxItems);
          const codes = sorted.map(([code]) => code).filter(c => c !== product.product_code);
          if (codes.length > 0) {
            const { data } = await supabase
              .from("products")
              .select("*")
              .in("product_code", codes)
              .limit(maxItems);
            products = data || [];
          }
        }
        matchReason = "Trending Now";
        break;
      }
      case "new_arrivals": {
        let q = buildQuery().order("created_at", { ascending: false }).limit(maxItems);
        const { data } = await q;
        products = data || [];
        matchReason = "New Arrivals";
        break;
      }
      case "customers_also_viewed": {
        // Use scan_events session co-views
        const { data: sessions } = await supabase
          .from("scan_events")
          .select("session_id")
          .eq("product_code", product.product_code || "")
          .eq("event_type", "page_view")
          .limit(100);

        if (sessions && sessions.length > 0) {
          const sessionIds = [...new Set(sessions.map((s: any) => s.session_id))];
          const { data: coViews } = await supabase
            .from("scan_events")
            .select("product_code")
            .in("session_id", sessionIds.slice(0, 20))
            .eq("event_type", "page_view")
            .neq("product_code", product.product_code || "")
            .limit(200);

          if (coViews) {
            const counts: Record<string, number> = {};
            for (const v of coViews) counts[v.product_code] = (counts[v.product_code] || 0) + 1;
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, maxItems);
            const codes = top.map(([c]) => c);
            if (codes.length > 0) {
              const { data } = await supabase.from("products").select("*").in("product_code", codes).limit(maxItems);
              products = data || [];
            }
          }
        }
        matchReason = "Customers Also Viewed";
        break;
      }
      case "ai_recommend": {
        // Multi-signal scoring
        const weights = config.weights || { category: 30, color: 20, price: 20, style: 15, popularity: 15 };
        const { data: candidates } = await buildQuery().limit(200);
        
        if (candidates) {
          const currentPrice = parseFloat(String(product.price || "").replace(/[^0-9.,]/g, "").replace(",", "."));
          
          const scored = candidates.map((c: any) => {
            let score = 0;
            if (product.category && c.category === product.category) score += weights.category || 0;
            if (product.color && c.color === product.color) score += weights.color || 0;
            if (!isNaN(currentPrice)) {
              const cp = parseFloat(String(c.price || "").replace(/[^0-9.,]/g, "").replace(",", "."));
              if (!isNaN(cp)) {
                const delta = Math.abs(currentPrice - cp) / currentPrice;
                score += (weights.price || 0) * Math.max(0, 1 - delta);
              }
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
        // Fetch manual items
        const { data: items } = await supabase
          .from("product_carousel_items")
          .select("target_product_id")
          .eq("carousel_id", carousel_id)
          .or(`source_product_id.eq.${product_id},source_product_id.is.null`)
          .order("display_order", { ascending: true })
          .limit(maxItems);

        if (items && items.length > 0) {
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
      default:
        matchReason = "Unknown match type";
    }

    return new Response(
      JSON.stringify({
        products,
        match_reason: matchReason,
        algorithm_version: "1.0",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Recommendation error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
