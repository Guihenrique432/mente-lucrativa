import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { Database } from "@/integrations/supabase/types";
import { assuntoInfo, textoLembrete } from "@/lib/lembretes";

const LOTE_MAXIMO = 500;
const JANELA_MINUTOS = 5;

function agoraSaoPaulo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date());
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  const diaSemanaMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    data: `${get("year")}-${get("month")}-${get("day")}`,
    minutos: Number(get("hour")) * 60 + Number(get("minute")),
    diaSemana: diaSemanaMap[get("weekday")] ?? 0,
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
      GET: async ({ request }) => processarNotificacoes(request),
      POST: async ({ request }) => processarNotificacoes(request),
    },
  },
});

async function processarNotificacoes(request: Request) {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env["CRON_SECRET"];
        const apiKey = request.headers.get("apikey");
        const chavesValidas = [
          process.env["SUPABASE_ANON_KEY"],
          process.env["SUPABASE_PUBLISHABLE_KEY"],
        ].filter(Boolean);
        const cronValido = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
        const apiKeyValida = Boolean(apiKey && chavesValidas.includes(apiKey));
        if (!cronValido && !apiKeyValida) {
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

        const { data, minutos, diaSemana } = agoraSaoPaulo();
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

        // lembretes ativos de cada usuário
        const { data: lembretes } = await supabase
          .from("lembretes")
          .select("id, user_id, horario, dias_semana, assunto, mensagem")
          .eq("ativo", true)
          .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

        type LembreteRow = NonNullable<typeof lembretes>[number];
        const porUsuario = new Map<string, LembreteRow[]>();
        for (const l of lembretes ?? []) {
          const lista = porUsuario.get(l.user_id) ?? [];
          lista.push(l);
          porUsuario.set(l.user_id, lista);
        }

        // quais lembretes deste usuário devem disparar agora?
        function devidos(userId: string) {
          return (porUsuario.get(userId) ?? []).filter((l) => {
            if (!l.dias_semana.includes(diaSemana)) return false;
            const m = paraMinutos(l.horario);
            return m !== null && minutos - m >= 0 && minutos - m < JANELA_MINUTOS;
          });
        }

        const { data: jaEnviadas } = await supabase
          .from("notificacoes_diarias")
          .select("user_id, lembrete_id, horario")
          .eq("data", data)
          .eq("canal", "push");
        const enviadosHoje = new Set(
          (jaEnviadas ?? []).map((r) => `${r.user_id}|${r.lembrete_id ?? r.horario}`),
        );

        let enviados = 0;
        let removidos = 0;
        let falhas = 0;
        let ignorados = 0;

        for (const inscricao of inscricoes ?? []) {
          const pendentes = devidos(inscricao.user_id).filter(
            (l) => !enviadosHoje.has(`${inscricao.user_id}|${l.id}`),
          );
          if (pendentes.length === 0) {
            ignorados++;
            continue;
          }
          try {
            for (const lembrete of pendentes) {
              const info = assuntoInfo(lembrete.assunto);
              const payload = await buildPushPayload(
                {
                  data: JSON.stringify({
                    title: "Lucro Real",
                    body: textoLembrete(lembrete.assunto, lembrete.mensagem),
                    url: info.url,
                  }),
                  options: { ttl: 6 * 60 * 60 },
                },
                {
                  endpoint: inscricao.endpoint,
                  expirationTime: null,
                  keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
                },
                { subject: vapidSubject, publicKey: vapidPublic, privateKey: vapidPrivate },
              );

              const res = await fetch(inscricao.endpoint, payload as unknown as RequestInit);

              if (res.status === 404 || res.status === 410) {
                await supabase.from("push_subscriptions").delete().eq("id", inscricao.id);
                removidos++;
                break;
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
                horario: lembrete.horario,
                lembrete_id: lembrete.id,
              });
              enviadosHoje.add(`${inscricao.user_id}|${lembrete.id}`);
              enviados++;
            }
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
}
