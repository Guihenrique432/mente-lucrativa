import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BLP4C349XYgnCWkh8PIZA6nK0MiBrGtFt_DTkxopUrQJoti52CdrH0JH6niMKKmaoz0FSJsMulJsh8iavd3Vxr8";

export function pushSuportado() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufferToBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function ativarNotificacoes(): Promise<{ ok: boolean; erro?: string }> {
  if (!pushSuportado()) {
    return { ok: false, erro: "Seu navegador não suporta notificações." };
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    return { ok: false, erro: "Você precisa permitir as notificações no navegador." };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existente = await registration.pushManager.getSubscription();
  const subscription =
    existente ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const p256dh = json.keys?.p256dh ?? bufferToBase64Url(subscription.getKey("p256dh"));
  const auth = json.keys?.auth ?? bufferToBase64Url(subscription.getKey("auth"));

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, erro: "Faça login novamente." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userData.user.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

export async function desativarNotificacoes(): Promise<{ ok: boolean; erro?: string }> {
  if (!pushSuportado()) return { ok: true };
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
  return { ok: true };
}

export async function notificacoesAtivas(): Promise<boolean> {
  if (!pushSuportado() || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  return !!subscription;
}
