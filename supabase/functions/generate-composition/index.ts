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
  const proxyUrl = `${supabaseUrl}/functions/v1/export-image-proxy?url=${encodeURIComponent(url)}`;
  const resp = await fetch(proxyUrl, { headers: { "Accept": "image/*" } });
  if (!resp.ok) {
    const directResp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": new URL(url).origin + "/",
      },
    });
    if (!directResp.ok) throw new Error(`Failed to fetch image: ${url}`);
    const buffer = await directResp.arrayBuffer();
    const contentType = directResp.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
  }
  const buffer = await resp.arrayBuffer();
  const contentType = resp.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
}

// Build prompt from settings
function buildPrompt(
  productNames: string,
  compositionName: string,
  styleTag: string,
  settings: Record<string, unknown> | null
): string {
  const style = (settings?.style as string) || "editorial";
  const background = (settings?.background as string) || "white";
  const backgroundCustomColor = (settings?.backgroundCustomColor as string) || "#ffffff";
  const layout = (settings?.layout as string) || "balanced";
  const customPrompt = (settings?.customPrompt as string) || "";

  const styleDescriptions: Record<string, string> = {
    editorial: "Vogue/Harper's Bazaar editorial still life with dramatic elegance",
    minimal: "Minimal flat lay arrangement, clean and airy, shot from directly above",
    classic: "Classic product photography with traditional studio lighting",
    dramatic: "Dramatic chiaroscuro lighting with bold shadows and contrast",
    soft: "Soft, ethereal diffused light with a dreamy, romantic quality",
  };

  const backgroundDescriptions: Record<string, string> = {
    white: "Pure white background",
    cream: "Warm cream/off-white background",
    marble: "Elegant marble surface background",
    dark: "Dark black/charcoal background",
    gradient: "Soft neutral gradient background",
    custom: `Background color ${backgroundCustomColor}`,
  };

  const layoutDescriptions: Record<string, string> = {
    balanced: "Products arranged in a balanced, evenly-spaced composition",
    overlapping: "Products layered with overlapping elements creating depth",
    diagonal: "Products flowing along a dynamic diagonal line",
    hero: "One hero product prominently placed with smaller accent products around it",
  };

  const prompt = `Create an elegant luxury still life product composition photograph.
${backgroundDescriptions[background] || backgroundDescriptions.white}.
Style: ${styleDescriptions[style] || styleDescriptions.editorial}.
Arrange these Christian Louboutin products together: ${productNames}.
Composition theme: "${compositionName}" - ${styleTag}.
Layout: ${layoutDescriptions[layout] || layoutDescriptions.balanced}.

CRITICAL RULES:
- Show EVERY product FULLY visible — NO cropping, NO cutting off any product
- Each product must be complete and recognizable
- Square 1:1 aspect ratio composition
- Products should have breathing room — don't push them to the edges
- Shoes at a 3/4 angle for dimensionality
- Bottles/beauty items slightly angled (5-10°) for depth
- Products relate spatially with shared surface and overlapping shadows
- Professional studio lighting
- Ultra high quality, photorealistic
- No text, no logos, no watermarks${customPrompt ? `\n\nAdditional instructions: ${customPrompt}` : ""}`;

  return prompt;
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

    // Check cache
    const filePath = `compositions/${compositionId}.png`;
    const { data: existingList } = await supabase.storage
      .from("look-images")
      .list("compositions", { search: `${compositionId}.png` });

    if (existingList && existingList.length > 0) {
      const { data: publicUrlData } = supabase.storage.from("look-images").getPublicUrl(filePath);
      return new Response(
        JSON.stringify({ imageUrl: publicUrlData.publicUrl + `?t=${Date.now()}`, compositionId, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load composition settings
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "composition_settings")
      .single();

    const compSettings = (settingsData?.value as Record<string, unknown>) || null;

    // Fetch product images as base64
    console.log(`Fetching ${productImages.length} product images for composition ${compositionId}...`);
    const base64Images: { url: string; name: string }[] = [];
    for (const img of productImages) {
      try {
        const b64 = await fetchImageAsBase64(img.url, supabaseUrl);
        base64Images.push({ url: b64, name: img.name });
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

    const imageContents: Array<{ type: "image_url"; image_url: { url: string } }> = base64Images.map((img) => ({
      type: "image_url",
      image_url: { url: img.url },
    }));

    // Add reference images if configured
    const refImages = (compSettings?.referenceImages as string[]) || [];
    for (const refUrl of refImages.slice(0, 2)) {
      try {
        const b64 = await fetchImageAsBase64(refUrl, supabaseUrl);
        imageContents.push({ type: "image_url", image_url: { url: b64 } });
      } catch (e) {
        console.error("Failed to fetch reference image:", e);
      }
    }

    const productNames = base64Images.map((img) => img.name).join(", ");
    const prompt = buildPrompt(productNames, compositionName, styleTag, compSettings);

    const refNote = refImages.length > 0
      ? `\n\nUse the last ${Math.min(refImages.length, 2)} image(s) as STYLE REFERENCE ONLY — match their lighting, composition style, and mood. Do NOT reproduce those products.`
      : "";

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
              { type: "text", text: prompt + refNote },
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

    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const raw = atob(base64Data);
    const binaryData = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) binaryData[i] = raw.charCodeAt(i);

    const { error: uploadError } = await supabase.storage
      .from("look-images")
      .upload(filePath, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) throw new Error("Failed to upload composition image");

    const { data: publicUrlData } = supabase.storage.from("look-images").getPublicUrl(filePath);

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
