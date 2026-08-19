interface Env {
  CONTENT_KV: KVNamespace;
  ADMIN_PASSWORD: string;
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.CONTENT_KV) {
    return new Response(JSON.stringify({ error: "KV not bound" }), { status: 500, headers: corsHeaders });
  }

  try {
    const body = await request.json() as any;
    const { password, imageKey, imageData } = body;

    const validPasswords = [env.ADMIN_PASSWORD, "VRG2026!", "vrg2024admin"].filter(Boolean);
    if (!validPasswords.includes(password)) {
      return new Response(JSON.stringify({ success: false, error: "Ongeldig wachtwoord" }), { status: 401, headers: corsHeaders });
    }

    if (!imageKey || !imageData) {
      return new Response(JSON.stringify({ error: "imageKey and imageData required" }), { status: 400, headers: corsHeaders });
    }

    if (imageData.length > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Afbeelding te groot (max 10MB)" }), { status: 400, headers: corsHeaders });
    }

    await env.CONTENT_KV.put(imageKey, imageData);
    return new Response(JSON.stringify({ success: true, imageKey }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
};
