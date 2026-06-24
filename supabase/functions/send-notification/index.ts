// Supabase Edge Function: send-notification
//
// Invoked by the `enqueue_notification()` Postgres trigger (via pg_net) right
// after it writes a row to `notifications`. Looks up the user's registered
// Expo push tokens and forwards the message to Expo's push API. Delivery is
// best-effort — the in-app notification row already exists regardless of
// whether this succeeds.
//
// Deploy with: supabase functions deploy send-notification

import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  try {
    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id required" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, type, data")
      .eq("id", notification_id)
      .single();

    if (notifError || !notification) {
      return new Response(JSON.stringify({ error: "notification not found" }), { status: 404 });
    }

    const { data: tokens, error: tokenError } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", notification.user_id);

    if (tokenError) {
      return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      // No registered device — nothing to push, but not an error.
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const messages = tokens.map((t) => ({
      to: t.token,
      title: notification.title,
      body: notification.body,
      data: { type: notification.type, ...(notification.data ?? {}) },
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });

    const result = await pushResponse.json();
    return new Response(JSON.stringify({ sent: messages.length, result }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
