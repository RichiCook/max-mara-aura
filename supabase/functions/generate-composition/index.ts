import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchImageAsBase64(url: string, supabaseUrl: string): Promise<string> {
  // Use our image proxy to bypass hotlink protections
  const proxyUrl = `${supabaseUrl}/functions/v1/export-image-proxy?url=${encodeURIComponent(url)}`;
  const resp = await fetch(proxyUrl, {
    headers: { "Accept": "image/*" },
  });
  if (!resp.ok) {
    // Fallback: try direct fetch
    const directResp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": new URL(url).origin + "/",
      },
    });
    if (!directResp.ok) throw new Error(`Failed to fetch image: ${url} (proxy: ${resp.status}, direct: ${directResp.status})`);
    const buffer = await directResp.arrayBuffer();
    const contentType = directResp.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
  }
  const buffer = await resp.arrayBuffer();
  const contentType = resp.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { compositionId, productImages, compositionName, styleTag } = await req.json();

    if (!compositionId || !productImages || productImages.length < 2) {
      return new Response(
        JSON.stringify({ error: "compositionId and at least 2 productImages required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if composition already exists in storage
    const filePath = `compositions/${compositionId}.png`;
    const { data: existingList } = await supabase.storage
      .from("look-images")
      .list("compositions", { search: `${compositionId}.png` });

    if (existingList && existingList.length > 0) {
      const { data: publicUrlData } = supabase.storage
        .from("look-images")
        .getPublicUrl(filePath);
      return new Response(
        JSON.stringify({ imageUrl: publicUrlData.publicUrl + `?t=${Date.now()}`, compositionId, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch product images as base64 to send to AI
    console.log(`Fetching ${productImages.length} product images for composition ${compositionId}...`);
    const base64Images: { url: string; name: string }[] = [];
    for (const img of productImages) {
      try {
        const b64 = await fetchImageAsBase64(img.url, supabaseUrl);
        base64Images.push({ url: b64, name: img.name });
        console.log(`Fetched image for ${img.name}`);
      } catch (e) {
        console.error(`Failed to fetch image for ${img.name}:`, e);
      }
    }

    if (base64Images.length < 2) {
      return new Response(
        JSON.stringify({ error: "Could not fetch enough product images" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageContents = base64Images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: img.url },
    }));

    const productNames = base64Images.map((img) => img.name).join(", ");

    const prompt = `Create an elegant luxury still life product composition photograph on a pure white background.
Arrange these Christian Louboutin products together beautifully: ${productNames}.
Composition theme: "${compositionName}" - ${styleTag}.

CRITICAL RULES:
- Pure white background with professional studio lighting
- Products arranged as a luxury editorial still life - like a Vogue or Harper's Bazaar product shoot
- Show each product clearly and completely — NO cropping
- Shoes should be at a 3/4 angle for dimensionality, not flat/frontal
- Bottles and beauty items can be slightly angled (5-10°) for depth
- Products should relate spatially — overlapping shadows, shared reflective surface
- Soft diffused lighting from above-left with gentle reflections on the surface
- Ultra high quality, photorealistic result
- No text, no logos, no watermarks, no additional elements`;

    console.log(`Calling AI for composition ${compositionId}...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageContents,
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in AI response:", JSON.stringify(data).substring(0, 500));
      throw new Error("No image generated by AI");
    }

    console.log(`AI generated image for ${compositionId}, uploading to storage...`);

    // Decode base64 and upload
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from("look-images")
      .upload(filePath, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload composition image");
    }

    const { data: publicUrlData } = supabase.storage
      .from("look-images")
      .getPublicUrl(filePath);

    console.log(`Composition ${compositionId} complete: ${publicUrlData.publicUrl}`);

    return new Response(
      JSON.stringify({ imageUrl: publicUrlData.publicUrl + `?t=${Date.now()}`, compositionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-composition error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
