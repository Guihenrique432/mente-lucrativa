import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { Database } from "@/integrations/supabase/types";

const LOTE_MAXIMO = 500;
const MENSAGEM = "Vamos mostrar seu lucro real de hoje e quanto você gastou?";

function hojeSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/hooks/notificacao-diaria")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const chavesValidas = [
          process.env["SUPABASE_ANON_KEY"],
          process.env["SUPABASE_PUBLISHABLE_KEY"],
        ].filter(Boolean);
        if (!apiKey || !chavesValidas.includes(apiKey)) {
          return json({ error: "Não autorizado" }, 401);
        }

        const url = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const vapidPublic = process.env["VAPID_PUBLIC_KEY"];
        const vapidPrivate = process.env["VAPID_PRIVATE_KEY"];
        const vapidSubject = process.env["VAPID_SUBJECT"] ?? "mailto:contato@lucroreal.app";
        if (!url || !serviceKey || !vapidPublic || !vapidPrivate) {
          return json({ error: "Configuração de notificações incompleta" }, 500);
        }

        const supabase = createClient<Database>(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const data = hojeSaoPaulo();

        // trava de execução única por dia
        const { error: lockError } = await supabase
          .from("notificacao_execucoes")
          .insert({ data, status: "rodando" });
        if (lockError) {
          return json({ skipped: true, motivo: "execução já registrada hoje" });
        }

        const { data: inscricoes, error: subError } = await supabase
          .from("push_subscriptions")
          .select("id, user_id, endpoint, p256dh, auth")
          .limit(LOTE_MAXIMO);

        if (subError) {
          await supabase
            .from("notificacao_execucoes")
            .update({ status: "erro", detalhe: subError.message, finalizado_em: new Date().toISOString() })
            .eq("data", data);
          return json({ error: subError.message }, 500);
        }

        const { data: jaEnviadas } = await supabase
          .from("notificacoes_diarias")
          .select("user_id")
          .eq("data", data)
          .eq("canal", "push");
        const enviadosHoje = new Set((jaEnviadas ?? []).map((r) => r.user_id));

        let enviados = 0;
        let removidos = 0;
        let falhas = 0;

        for (const inscricao of inscricoes ?? []) {
          if (enviadosHoje.has(inscricao.user_id)) continue;
          try {
            const payload = await buildPushPayload(
              {
                data: JSON.stringify({ title: "Lucro Real", body: MENSAGEM, url: "/" }),
                options: { ttl: 6 * 60 * 60 },
              },
              {
                endpoint: inscricao.endpoint,
                expirationTime: null,
                keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
              },
              { subject: vapidSubject, publicKey: vapidPublic, privateKey: vapidPrivate }
            );

            const res = await fetch(inscricao.endpoint, payload as unknown as RequestInit);

            if (res.status === 404 || res.status === 410) {
              await supabase.from("push_subscriptions").delete().eq("id", inscricao.id);
              removidos++;
              continue;
            }

            if (!res.ok) {
              falhas++;
              console.error(`Push falhou [${res.status}]: ${await res.text()}`);
              continue;
            }

            await supabase
              .from("notificacoes_diarias")
              .insert({ user_id: inscricao.user_id, data, canal: "push", status: "enviado" });
            enviadosHoje.add(inscricao.user_id);
            enviados++;
          } catch (e) {
            falhas++;
            console.error("Erro ao enviar push:", e);
          }
        }

        await supabase
          .from("notificacao_execucoes")
          .update({
            status: "concluido",
            finalizado_em: new Date().toISOString(),
            detalhe: `enviados=${enviados} falhas=${falhas} removidos=${removidos}`,
          })
          .eq("data", data);

        return json({ success: true, enviados, falhas, removidos });
      },
    },
  },
});
