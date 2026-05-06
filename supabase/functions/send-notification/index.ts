import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  expoPushToken?: string;
}

interface ExpoPushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: string;
}

function validatePayload(payload: unknown): payload is NotificationPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (typeof p.userId !== "string" || p.userId.length === 0) return false;
  if (typeof p.title !== "string" || p.title.length === 0) return false;
  if (typeof p.body !== "string" || p.body.length === 0) return false;
  if (typeof p.type !== "string" || p.type.length === 0) return false;
  return true;
}

async function sendExpoPush(token: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  const message: ExpoPushMessage = {
    to: token,
    sound: "default",
    title,
    body,
    data: data ?? {},
    priority: "high",
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Host: "exp.host",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("Expo push HTTP error:", response.status, response.statusText);
      return;
    }

    const result = await response.json();

    if (result.data?.some((d: any) => d.status === "error")) {
      console.error("Expo push error:", JSON.stringify(result));
    }
  } catch (err) {
    console.error("Expo push network error:", err);
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!validatePayload(payload)) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: userId, title, body, type" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Verify the caller is authorized to send notifications to this user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authorization required" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 1. Validate the JWT to ensure the caller is genuinely authenticated
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    console.error("JWT Validation failed:", authError?.message);
    return new Response(
      JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 2. Use the Service Role Key ONLY for the elevated insertion, after identity is proven
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: inserted, error: insertError } = await supabase
    .from("notifications")
    .insert({
      user_id: payload.userId,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      data: payload.data ?? null,
      is_read: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to insert notification:", insertError.message);
    return new Response(
      JSON.stringify({ error: "Failed to create notification", details: insertError.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (payload.expoPushToken) {
    try {
      await sendExpoPush(payload.expoPushToken, payload.title, payload.body, payload.data);
    } catch (err: any) {
      console.error("Expo push delivery failed:", err);
      // ARCHITECTURE / RESILIENCE FIX: If the push notification fails to send,
      // we must not lie to the client with a 200 OK. We return a 502 Bad Gateway
      // so the client app knows it must retry or handle the failure.
      return new Response(
        JSON.stringify({ error: "Failed to deliver push notification", details: err.message }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response(
    JSON.stringify({ success: true, notification: inserted }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});