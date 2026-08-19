import { useState } from "react";
import { Upload, X, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Linha = {
  tipo: "receita" | "despesa";
  valor: number;
  data: string;
  categoria: string;
  observacao: string;
};

const hoje = () => new Date().toISOString().slice(0, 10);
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });


function normalizarData(v: string): string {
  const s = (v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const br = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (br) {
    const [, d, m, a] = br;
    const ano = a.length === 2 ? `20${a}` : a;
    return `${ano}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return hoje();
}

function normalizarValor(v: string): number {
  let s = (v ?? "").replace(/[^\d,.\-]/g, "").trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function detectarTipo(campo: string, valor: number): "receita" | "despesa" {
  const t = (campo ?? "").toLowerCase();
  if (/receit|entrad|crédit|credit|venda|faturament/.test(t)) return "receita";
  if (/despes|saíd|said|débit|debit|gasto|pagament|fatura|compra/.test(t)) return "despesa";
  return valor < 0 ? "despesa" : "receita";
}

const RE_DATA = /(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?|\d{4}-\d{2}-\d{2})/;
const RE_VALOR = /(-?\s?(?:R\$\s?)?-?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\s?(?:R\$\s?)?-?\d+[.,]\d{2}|-?\s?(?:R\$\s?)?-?\d+)\s*(C|D)?$/i;

/** Converte linhas soltas de extrato/PDF ("01/08 Venda balcão 1.200,00") em CSV. */
function linhaLivreParaCsv(linha: string, sep: string): string | null {
  const mData = linha.match(RE_DATA);
  const mValor = linha.match(RE_VALOR);
  if (!mData || !mValor) return null;
  let valor = mValor[1].replace(/\s|R\$/gi, "");
  if ((mValor[2] ?? "").toUpperCase() === "D" && !valor.startsWith("-")) valor = `-${valor}`;
  const desc = linha
    .replace(mData[1], " ")
    .replace(mValor[0], " ")
    .replace(/\s+/g, " ")
    .trim();
  let data = mData[1];
  if (/^\d{1,2}[\/.-]\d{1,2}$/.test(data)) data = `${data}/${new Date().getFullYear()}`;
  return [data, desc || "Lançamento", valor].join(sep);
}

function parseLinhaCsv(l: string, sep: string): Linha | null {
  const c = l.split(sep).map((x) => x.replace(/^"|"$/g, "").trim());
  if (c.length < 2) return null;

  // formatos aceitos: data;tipo;valor;categoria;observacao  |  data;descricao;valor
  const data = normalizarData(c[0]);
  let tipoCampo = "";
  let valorBruto = "";
  let categoria = "";
  let observacao = "";

  if (c.length >= 4 && /receit|despes|entrad|saíd|said|crédit|débit|credit|debit/i.test(c[1])) {
    tipoCampo = c[1];
    valorBruto = c[2];
    categoria = c[3] || "Importado";
    observacao = c[4] ?? "";
  } else {
    observacao = c[1] ?? "";
    valorBruto = c[2] ?? c[1] ?? "";
    categoria = c[3] || "Importado";
    tipoCampo = observacao;
  }

  const valorNum = normalizarValor(valorBruto);
  if (!valorNum) return null;

  return {
    tipo: detectarTipo(tipoCampo, valorNum),
    valor: Math.abs(valorNum),
    data,
    categoria: categoria || "Importado",
    observacao: observacao.slice(0, 200),
  };
}

export function parseExtrato(texto: string): Linha[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!linhas.length) return [];

  const sep = linhas.some((l) => l.includes(";")) ? ";" : ",";
  const primeira = linhas[0].toLowerCase();
  const temCabecalho = /^[^\d]*\b(data|valor|tipo|categoria|descri)/.test(primeira) && primeira.includes(sep);
  const corpo = temCabecalho ? linhas.slice(1) : linhas;

  const out: Linha[] = [];
  for (const linhaOriginal of corpo) {
    const primeiroCampo = linhaOriginal.split(sep)[0]?.replace(/^"|"$/g, "").trim() ?? "";
    const pareceCsv = linhaOriginal.includes(sep) && new RegExp(`^(${RE_DATA.source})$`).test(primeiroCampo);
    let item = pareceCsv ? parseLinhaCsv(linhaOriginal, sep) : null;
    if (!item) {
      const convertida = linhaLivreParaCsv(linhaOriginal, "\u0001");
      if (convertida) item = parseLinhaCsv(convertida, "\u0001");
    }
    if (item) out.push(item);
  }
  return out;

}

export function ImportarDadosModal({ onClose, onDone }: { onClose: () => void; onDone?: () => void }) {
  const [texto, setTexto] = useState("");
  const [meta, setMeta] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  const previa = parseExtrato(texto);
  const totalEntradas = previa.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const totalSaidas = previa.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
  const lucroPrevisto = totalEntradas - totalSaidas;
  const metaNumPrevia = meta ? normalizarValor(meta) : 0;
  const progressoMeta = metaNumPrevia > 0 ? Math.max(0, Math.min(100, (lucroPrevisto / metaNumPrevia) * 100)) : 0;

  async function lerArquivo(file: File) {
    setErro("");
    setOk("");
    try {
      if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
        setLoading(true);
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = (
          await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
        ).default;
        const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const linhas: string[] = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const content = await (await doc.getPage(p)).getTextContent();
          const porLinha = new Map<number, string[]>();
          for (const item of content.items as any[]) {
            if (!item.str?.trim()) continue;
            const y = Math.round(item.transform[5]);
            const chave = [...porLinha.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
            porLinha.set(chave, [...(porLinha.get(chave) ?? []), item.str]);
          }
          [...porLinha.entries()]
            .sort((a, b) => b[0] - a[0])
            .forEach(([, partes]) => linhas.push(partes.join(" ").replace(/\s+/g, " ").trim()));
        }
        setTexto(linhas.join("\n"));
      } else {
        setTexto(await file.text());
      }
    } catch {
      setErro("Não consegui ler esse arquivo. Tente um CSV ou cole o texto.");
    } finally {
      setLoading(false);
    }
  }


  async function importar() {
    setErro("");
    setOk("");
    const metaNum = meta ? normalizarValor(meta) : 0;
    if (!previa.length && !metaNum) {
      setErro("Cole os lançamentos ou informe uma meta de lucro.");
      return;
    }
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Sessão expirada. Entre novamente.");

      const receitas = previa
        .filter((l) => l.tipo === "receita")
        .map((l) => ({ user_id: userId, valor: l.valor, categoria: l.categoria, observacao: l.observacao, data: l.data }));
      const despesas = previa
        .filter((l) => l.tipo === "despesa")
        .map((l) => ({ user_id: userId, valor: l.valor, categoria: l.categoria, observacao: l.observacao, data: l.data }));

      if (receitas.length) {
        const { error } = await supabase.from("receitas").insert(receitas);
        if (error) throw error;
      }
      if (despesas.length) {
        const { error } = await supabase.from("despesas").insert(despesas);
        if (error) throw error;
      }
      if (metaNum > 0) {
        const { data: existente } = await supabase
          .from("metas")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { error } = existente?.id
          ? await supabase.from("metas").update({ meta_lucro: metaNum }).eq("id", existente.id)
          : await supabase.from("metas").insert({ user_id: userId, meta_lucro: metaNum });
        if (error) throw error;
      }

      setOk(
        `Importado: ${receitas.length} entrada(s), ${despesas.length} saída(s)${metaNum > 0 ? " e meta atualizada" : ""}.`,
      );
      setTexto("");
      setMeta("");
      onDone?.();
    } catch (e: any) {
      setErro(e?.message || "Não consegui importar agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Importar dados reais</p>
          <button onClick={onClose} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-full bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Cole o extrato do banco ou a fatura do cartão (uma linha por lançamento) ou envie um arquivo CSV, TXT ou PDF.
          Aceita <strong>data;tipo;valor;categoria;observação</strong>, <strong>data;descrição;valor</strong> ou linhas
          soltas do extrato.
        </p>

        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" />
          Escolher arquivo CSV, TXT ou PDF
          <input
            type="file"
            accept=".csv,.txt,.pdf,text/csv,text/plain,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void lerArquivo(f);
            }}
          />
        </label>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={7}
          placeholder={"01/08/2026;Venda balcão;1200,00\n03/08/2026;Fatura cartão;-450,00"}
          className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-accent"
        />

        <label className="mt-3 block">
          <span className="text-xs text-muted-foreground">Meta de lucro mensal (opcional)</span>
          <input
            inputMode="decimal"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            placeholder="8000,00"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>

        {texto.trim() && (
          <div className="mt-3 space-y-2 rounded-xl bg-surface p-3 text-xs text-muted-foreground">
            <p>
              Prévia: <strong className="text-foreground">{previa.length}</strong> lançamento(s) reconhecido(s) —{" "}
              {previa.filter((l) => l.tipo === "receita").length} entrada(s) e{" "}
              {previa.filter((l) => l.tipo === "despesa").length} saída(s).
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p>Entrou</p>
                <p className="font-semibold text-success">{brl(totalEntradas)}</p>
              </div>
              <div>
                <p>Saiu</p>
                <p className="font-semibold text-danger">{brl(totalSaidas)}</p>
              </div>
              <div>
                <p>Sobra</p>
                <p className={`font-semibold ${lucroPrevisto < 0 ? "text-danger" : "text-foreground"}`}>
                  {brl(lucroPrevisto)}
                </p>
              </div>
            </div>
            {metaNumPrevia > 0 && (
              <div>
                <p>
                  Meta de lucro <strong className="text-foreground">{brl(metaNumPrevia)}</strong> —{" "}
                  {progressoMeta.toFixed(0)}% alcançada com esses lançamentos.
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full ${lucroPrevisto < 0 ? "bg-danger" : "bg-success"}`}
                    style={{ width: `${progressoMeta}%` }}
                  />
                </div>
              </div>
            )}
            {previa.length === 0 && <p className="text-danger">Não reconheci nenhum lançamento nesse texto.</p>}
          </div>
        )}


        {erro && <p className="mt-3 text-xs font-medium text-danger">{erro}</p>}
        {ok && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> {ok}
          </p>
        )}

        <button
          onClick={importar}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-hero)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? "Importando..." : "Importar dados"}
        </button>
      </div>
    </div>
  );
}
