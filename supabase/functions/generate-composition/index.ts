import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the message with all product images
    const imageContents = productImages.map((img: { url: string; name: string }) => ({
      type: "image_url" as const,
      image_url: { url: img.url },
    }));

    const productNames = productImages.map((img: { name: string }) => img.name).join(", ");

    const prompt = `Create an elegant still life product composition on a pure white background. 
Arrange these luxury products together: ${productNames}.
Style: "${compositionName}" - ${styleTag}.

CRITICAL RULES:
- Pure white background, studio lighting
- Products should be arranged as a luxury editorial still life
- Show each product clearly — no cropping, no cutting off
- If there are shoes, angle them slightly (3/4 view) so they look dimensional, not flat
- If there are fragrances/bottles, they can stay frontal but angle them very slightly (5-10 degrees) for depth
- Products should relate to each other spatially — overlapping shadows, shared surface
- Soft, diffused lighting from above-left with gentle reflections
- The composition should feel like a high-end magazine editorial spread
- Make it look like a real photograph, ultra high quality
- No text, no logos added, no watermarks`;

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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    // Upload to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Decode base64
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const filePath = `compositions/${compositionId}.png`;

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

    return new Response(
      JSON.stringify({
        imageUrl: publicUrlData.publicUrl,
        compositionId,
      }),
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
