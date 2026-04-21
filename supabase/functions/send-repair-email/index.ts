import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Escape HTML special chars to prevent injection of links/scripts/markup
// into the rendered email body.
function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  const s = String(input);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length > 254) return false;
  // Pragmatic email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clamp(value: unknown, max: number): string {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, max);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      productName, productCode, damageType, damageDescription,
      photos, customerEmail, customerName, country, city,
      estimatedCostMin, estimatedCostMax, returnShippingCost, emailFields,
      isCustomerCopy,
    } = body as Record<string, unknown>;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up the brand repair email server-side. The caller is NOT trusted
    // to specify arbitrary `to` addresses — this prevents abuse of the email
    // sender for spam or phishing.
    const { data: settingsRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'repair_service')
      .maybeSingle();

    const settings = (settingsRow?.value ?? {}) as { repairEmail?: string; enabled?: boolean };
    const brandEmail = typeof settings.repairEmail === 'string' ? settings.repairEmail.trim() : '';

    // Determine recipient based on intent
    let recipient = '';
    if (isCustomerCopy) {
      // Customer copy: send only to the email the user submitted via the form
      if (!isValidEmail(customerEmail)) {
        return new Response(JSON.stringify({ error: 'Invalid customer email' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recipient = (customerEmail as string).trim();
    } else {
      // Brand copy: send only to the configured brand repair email
      if (!isValidEmail(brandEmail)) {
        return new Response(JSON.stringify({ error: 'Brand repair email not configured' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      recipient = brandEmail;
    }

    // Generate signed URLs for repair photos (bucket is private)
    const signedPhotoUrls: string[] = [];
    if (Array.isArray(photos) && photos.length > 0) {
      // Cap number of photos to avoid abuse
      const capped = photos.slice(0, 12);
      for (const photoPath of capped) {
        if (typeof photoPath !== 'string') continue;
        // Backwards compat: pass through full URLs (will be rendered escaped)
        if (/^https?:\/\//i.test(photoPath)) {
          signedPhotoUrls.push(photoPath);
          continue;
        }
        const { data, error } = await supabase.storage
          .from('repair-photos')
          .createSignedUrl(photoPath, 60 * 60 * 24 * 7); // 7 days
        if (!error && data?.signedUrl) {
          signedPhotoUrls.push(data.signedUrl);
        }
      }
    }

    // Sanitize all user-supplied content before interpolating into HTML
    const safeProductName = escapeHtml(clamp(productName, 200));
    const safeProductCode = escapeHtml(clamp(productCode, 100));
    const safeDamageType = escapeHtml(clamp(damageType, 100));
    const safeDamageDescription = escapeHtml(clamp(damageDescription, 2000));
    const safeCustomerName = escapeHtml(clamp(customerName, 200));
    const safeCustomerEmail = escapeHtml(clamp(customerEmail, 254));
    const safeCity = escapeHtml(clamp(city, 100));
    const safeCountry = escapeHtml(clamp(country, 100));
    const safeCostMin = Number.isFinite(Number(estimatedCostMin)) ? Number(estimatedCostMin) : null;
    const safeCostMax = Number.isFinite(Number(estimatedCostMax)) ? Number(estimatedCostMax) : null;
    const safeShipping = Number.isFinite(Number(returnShippingCost)) ? Number(returnShippingCost) : null;

    // Build email body based on enabled fields
    const enabledFieldIds = new Set(
      Array.isArray(emailFields)
        ? (emailFields as Array<{ id?: unknown }>).map((f) => String(f?.id ?? ''))
        : []
    );
    const lines: string[] = [];

    lines.push('<h2 style="font-family: sans-serif; color: #1a1a1a;">New Repair Request</h2>');

    if (enabledFieldIds.has('product_name_sku')) {
      lines.push(`<p><strong>Product:</strong> ${safeProductName || 'N/A'} · ${safeProductCode || 'N/A'}</p>`);
    }
    if (enabledFieldIds.has('damage_type')) {
      lines.push(`<p><strong>Damage Type:</strong> ${safeDamageType || 'N/A'}</p>`);
      if (safeDamageDescription) lines.push(`<p><em>${safeDamageDescription}</em></p>`);
    }
    if (enabledFieldIds.has('customer_name')) {
      lines.push(`<p><strong>Customer Name:</strong> ${safeCustomerName || 'N/A'}</p>`);
    }
    if (enabledFieldIds.has('customer_email')) {
      lines.push(`<p><strong>Customer Email:</strong> ${safeCustomerEmail || 'N/A'}</p>`);
    }
    if (enabledFieldIds.has('customer_location')) {
      lines.push(`<p><strong>Location:</strong> ${safeCity}, ${safeCountry}</p>`);
    }
    if (enabledFieldIds.has('estimated_cost') && safeCostMin != null) {
      lines.push(`<p><strong>Estimated Cost:</strong> €${safeCostMin} – €${safeCostMax ?? safeCostMin}</p>`);
      if (safeShipping != null) {
        lines.push(`<p><strong>Return Shipping:</strong> €${safeShipping}</p>`);
      }
    }
    if (enabledFieldIds.has('warranty_status')) {
      lines.push(`<p><strong>Warranty:</strong> To be verified upon inspection</p>`);
    }
    if (enabledFieldIds.has('date_of_request')) {
      lines.push(`<p><strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</p>`);
    }
    if (enabledFieldIds.has('damage_photos') && signedPhotoUrls.length > 0) {
      lines.push('<p><strong>Photos:</strong></p>');
      for (const url of signedPhotoUrls) {
        // URLs are signed by us (or pre-existing https URLs); still escape attribute context
        const safeUrl = escapeHtml(url);
        lines.push(`<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer"><img src="${safeUrl}" style="max-width:200px;border-radius:4px;margin:4px 0;" alt="repair photo" /></a></p>`);
      }
    }

    const htmlBody = lines.join('\n');

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@aitems.com';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subjectProduct = safeProductName || 'Product';
    const subjectDamage = safeDamageType || 'General';
    const subject = isCustomerCopy
      ? `Repair Request Received: ${subjectProduct}`
      : `Repair Request: ${subjectProduct} — ${subjectDamage}`;

    const customerHeader = isCustomerCopy
      ? '<p style="font-family: sans-serif; color: #555;">Thank you for submitting your repair request. Here is a summary of your claim:</p>'
      : '';

    // Only set reply_to to the customer email when sending the brand copy
    // (and only if it's a valid address)
    const replyTo = !isCustomerCopy && isValidEmail(customerEmail) ? (customerEmail as string) : undefined;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [recipient],
        reply_to: replyTo,
        subject,
        html: customerHeader + htmlBody,
      }),
    });

    const emailResult = await emailRes.json().catch(() => ({}));

    if (!emailRes.ok) {
      console.error('Resend error:', emailResult);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
