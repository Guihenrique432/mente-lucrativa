import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { Database } from "@/integrations/supabase/types";

const LOTE_MAXIMO = 500;
const JANELA_MINUTOS = 5;
const MENSAGEM = "Vamos mostrar seu lucro real de hoje e quanto você gastou?";

function agoraSaoPaulo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  return {
    data: `${get("year")}-${get("month")}-${get("day")}`,
    minutos: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function paraMinutos(horario: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(horario.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
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

        const { data, minutos } = agoraSaoPaulo();
        const slot = `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

        // trava de execução única por dia + horário
        const { error: lockError } = await supabase
          .from("notificacao_execucoes")
          .insert({ data, horario: slot, status: "rodando" });
        if (lockError) {
          return json({ skipped: true, motivo: "execução já registrada neste horário" });
        }

        const { data: inscricoes, error: subError } = await supabase
          .from("push_subscriptions")
          .select("id, user_id, endpoint, p256dh, auth")
          .limit(LOTE_MAXIMO);

        if (subError) {
          await supabase
            .from("notificacao_execucoes")
            .update({ status: "erro", detalhe: subError.message, finalizado_em: new Date().toISOString() })
            .eq("data", data)
            .eq("horario", slot);
          return json({ error: subError.message }, 500);
        }

        const userIds = [...new Set((inscricoes ?? []).map((i) => i.user_id))];

        const { data: prefs } = await supabase
          .from("preferencias_notificacao")
          .select("user_id, horarios")
          .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

        const mapaPrefs = new Map((prefs ?? []).map((p) => [p.user_id, p.horarios ?? []]));

        // horário do usuário casa com a janela atual?
        function devoEnviar(userId: string) {
          const horarios = mapaPrefs.get(userId) ?? ["21:30"];
          return horarios.some((h) => {
            const m = paraMinutos(h);
            return m !== null && minutos - m >= 0 && minutos - m < JANELA_MINUTOS;
          });
        }

        // marca o slot escolhido pelo usuário (não o slot arredondado do cron)
        function slotDoUsuario(userId: string) {
          const horarios = mapaPrefs.get(userId) ?? ["21:30"];
          const achado = horarios.find((h) => {
            const m = paraMinutos(h);
            return m !== null && minutos - m >= 0 && minutos - m < JANELA_MINUTOS;
          });
          return achado ?? slot;
        }

        const { data: jaEnviadas } = await supabase
          .from("notificacoes_diarias")
          .select("user_id, horario")
          .eq("data", data)
          .eq("canal", "push");
        const enviadosHoje = new Set((jaEnviadas ?? []).map((r) => `${r.user_id}|${r.horario}`));

        let enviados = 0;
        let removidos = 0;
        let falhas = 0;
        let ignorados = 0;

        for (const inscricao of inscricoes ?? []) {
          if (!devoEnviar(inscricao.user_id)) {
            ignorados++;
            continue;
          }
          const horarioUsuario = slotDoUsuario(inscricao.user_id);
          if (enviadosHoje.has(`${inscricao.user_id}|${horarioUsuario}`)) continue;
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

            await supabase.from("notificacoes_diarias").insert({
              user_id: inscricao.user_id,
              data,
              canal: "push",
              status: "enviado",
              horario: horarioUsuario,
            });
            enviadosHoje.add(`${inscricao.user_id}|${horarioUsuario}`);
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
            detalhe: `enviados=${enviados} falhas=${falhas} removidos=${removidos} ignorados=${ignorados}`,
          })
          .eq("data", data)
          .eq("horario", slot);

        return json({ success: true, slot, enviados, falhas, removidos, ignorados });
      },
    },
  },
});
