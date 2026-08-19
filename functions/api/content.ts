// Cloudflare Pages Function: GET/POST content naar KV voor VRG
interface Env {
  CONTENT_KV: KVNamespace;
  ADMIN_PASSWORD: string;
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: corsHeaders });

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.CONTENT_KV) {
    return new Response(JSON.stringify({ success: true, data: {}, exists: false, note: "KV not bound" }), { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const all = url.searchParams.get("all");

  try {
    if (all === "true") {
      const list = await env.CONTENT_KV.list();
      const data: Record<string, any> = {};
      for (const item of list.keys) {
        const val = await env.CONTENT_KV.get(item.name);
        if (val !== null) {
          try { data[item.name] = JSON.parse(val); } catch { data[item.name] = val; }
        }
      }
      return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
    }

    if (!key) {
      return new Response(JSON.stringify({ error: "key required" }), { status: 400, headers: corsHeaders });
    }

    const value = await env.CONTENT_KV.get(key);
    if (value === null) {
      return new Response(JSON.stringify({ success: true, value: null, exists: false }), { headers: corsHeaders });
    }

    let parsed: any = value;
    try { parsed = JSON.parse(value); } catch { /* keep as string */ }

    return new Response(JSON.stringify({ success: true, value: parsed, exists: true }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.CONTENT_KV) {
    return new Response(JSON.stringify({ error: "KV not bound" }), { status: 500, headers: corsHeaders });
  }

  try {
    const body = await request.json() as any;
    const { password, key, value, bulk } = body;

    const validPasswords = [env.ADMIN_PASSWORD, "VRG2026!", "Voetreflex2026!", "BitScorpio01!", "vrg2024admin"].filter(Boolean);
    if (!validPasswords.includes(password)) {
      return new Response(JSON.stringify({ success: false, error: "Ongeldig wachtwoord" }), { status: 401, headers: corsHeaders });
    }

    if (bulk && typeof bulk === "object") {
      for (const [k, v] of Object.entries(bulk)) {
        const storeVal = typeof v === "string" ? v : JSON.stringify(v);
        await env.CONTENT_KV.put(k, storeVal);
      }
      return new Response(JSON.stringify({ success: true, saved: Object.keys(bulk).length }), { headers: corsHeaders });
    }

    if (!key) {
      return new Response(JSON.stringify({ error: "key required" }), { status: 400, headers: corsHeaders });
    }

    const storeVal = typeof value === "string" ? value : JSON.stringify(value);
    await env.CONTENT_KV.put(key, storeVal);

    return new Response(JSON.stringify({ success: true, key }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
};
