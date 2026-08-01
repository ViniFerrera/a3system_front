import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, FileBarChart, Printer, AlertCircle } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { api } from "@/services/api";

/**
 * Pedidos anteriores a esta data são totais mensais agregados do sistema
 * antigo, não pedidos reais. Incluí-los distorceria ticket médio e contagem,
 * então o seletor não deixa ir antes disso (o backend também recusa).
 */
const PISO = "2025-12-01";

const hoje = () => {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const primeiroDiaDoMes = () => hoje().slice(0, 8) + "01";

const mesesAtras = (n: number) => {
	const d = new Date();
	d.setDate(1);
	d.setMonth(d.getMonth() - n);
	const p = (x: number) => String(x).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
};

const maiorQuePiso = (s: string) => (s < PISO ? PISO : s);

export const EstudoModule = ({
	quickAction,
}: {
	quickAction?: { tab: string; action: string; nonce: number } | null;
}) => {
	const [inicio, setInicio] = useState(() => maiorQuePiso(`${new Date().getFullYear()}-01-01`));
	const [fim, setFim] = useState(hoje);
	const [html, setHtml] = useState<string | null>(null);
	const [carregando, setCarregando] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const atalhos = useMemo(
		() => [
			{ label: "Este mês", i: primeiroDiaDoMes(), f: hoje() },
			{ label: "Últimos 3 meses", i: maiorQuePiso(mesesAtras(2)), f: hoje() },
			{ label: "Últimos 6 meses", i: maiorQuePiso(mesesAtras(5)), f: hoje() },
			{ label: "Este ano", i: maiorQuePiso(`${new Date().getFullYear()}-01-01`), f: hoje() },
			{ label: "Tudo", i: PISO, f: hoje() },
		],
		[]
	);

	const periodoInvalido = fim < inicio;

	const gerar = async (di = inicio, df = fim) => {
		if (df < di) {
			setErro("A data final não pode ser anterior à inicial.");
			return;
		}
		setCarregando(true);
		setErro(null);
		try {
			const res = await api.get(`/estudo?inicio=${di}&fim=${df}`, {
				responseType: "text",
				transformResponse: [(d) => d],
			});
			setHtml(res.data);
		} catch (e: any) {
			// A rota devolve JSON no erro e HTML no sucesso — com responseType
			// text, o corpo do erro chega como string e precisa ser parseado.
			let msg = "Não foi possível gerar o estudo.";
			try {
				const body = e?.response?.data;
				msg = (typeof body === "string" ? JSON.parse(body) : body)?.error || msg;
			} catch {
				/* mantém a mensagem padrão */
			}
			setErro(msg);
			setHtml(null);
		} finally {
			setCarregando(false);
		}
	};

	// Ação rápida vinda da gaveta de atalhos: só seleciona o período. Gerar
	// continua no botão, porque a chamada é cara.
	useEffect(() => {
		if (quickAction?.tab === "estudo" && quickAction.action === "open") {
			setInicio(primeiroDiaDoMes());
			setFim(hoje());
		}
	}, [quickAction?.nonce]);

	const aplicarAtalho = (i: string, f: string) => {
		setInicio(i);
		setFim(f);
		gerar(i, f);
	};

	const imprimir = () => {
		const win = iframeRef.current?.contentWindow;
		if (!win) return;
		win.focus();
		win.print();
	};

	return (
		<div className="flex flex-col space-y-4 sm:space-y-6 pb-12">
			<div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
				<div className="flex flex-col lg:flex-row gap-3 lg:items-end">
					<Field label="Período">
						{/* Controle composto: as duas datas moram na mesma moldura. */}
						<div className="flex items-center gap-2 border border-slate-200 rounded-[10px] p-2 bg-surface-sunken">
							<Calendar className="w-4 h-4 text-ink-faint flex-shrink-0" />
							<input
								type="date"
								min={PISO}
								max={fim}
								className="num bg-transparent text-sm outline-none text-ink-muted"
								value={inicio}
								onChange={(e) => setInicio(maiorQuePiso(e.target.value))}
							/>
							<span className="text-ink-faint">|</span>
							<input
								type="date"
								min={inicio}
								className="num bg-transparent text-sm outline-none text-ink-muted"
								value={fim}
								onChange={(e) => setFim(e.target.value)}
							/>
						</div>
					</Field>

					<div className="flex flex-wrap gap-1.5 flex-1">
						{atalhos.map((a) => (
							<Button
								key={a.label}
								variant="secondary"
								size="sm"
								onClick={() => aplicarAtalho(a.i, a.f)}
							>
								{a.label}
							</Button>
						))}
					</div>

					<div className="flex gap-2">
						<Button
							onClick={() => gerar()}
							loading={carregando}
							disabled={periodoInvalido}
							icon={<FileBarChart className="w-4 h-4" />}
						>
							{carregando ? "Gerando..." : "Gerar estudo"}
						</Button>
						{html && (
							<Button
								variant="secondary"
								onClick={imprimir}
								icon={<Printer className="w-4 h-4" />}
								title="Abre o diálogo de impressão — escolha 'Salvar como PDF'"
							>
								Exportar PDF
							</Button>
						)}
					</div>
				</div>

				<p className="text-2xs text-ink-faint flex items-start gap-1.5">
					<AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
					O estudo começa em dez/2025. Antes disso o sistema guardava apenas
					totais mensais agregados, que distorceriam ticket médio e contagem de
					pedidos.
				</p>
			</div>

			{erro && (
				<div className="bg-danger-50 border border-danger-200 text-danger-700 rounded-xl p-4 text-sm flex items-start gap-2">
					<AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
					{erro}
				</div>
			)}

			{html ? (
				// iframe e não div: o estudo traz <style> com seletores globais
				// (h2, table, p) que vazariam para o resto do sistema.
				<div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
					<iframe
						ref={iframeRef}
						srcDoc={html}
						title="Estudo Empresarial"
						className="w-full border-0"
						style={{ height: "calc(100vh - 260px)", minHeight: 520 }}
					/>
				</div>
			) : (
				!carregando && (
					<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
						<FileBarChart className="w-10 h-10 text-ink-faint/60 mx-auto mb-3" />
						<p className="text-ink-muted text-sm font-medium">
							Escolha um período e clique em <b>Gerar estudo</b>.
						</p>
						<p className="num text-ink-faint text-xs mt-1">
							12 capítulos com receita, volume, clientes, custos e tabela de preços.
						</p>
					</div>
				)
			)}
		</div>
	);
};
