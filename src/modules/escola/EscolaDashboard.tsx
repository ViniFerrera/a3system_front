import React, { useCallback, useEffect, useState } from "react";
import {
	ComposedChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
	ResponsiveContainer, Legend, LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui";
import { useToast } from "@/components/ui";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { Utils } from "@/utils";
import { Wallet, CheckCircle2, Layers, Palette, FileText } from "lucide-react";
import { EscolaApi, EscolaDashboardData, SetorMetrica, ServicoMetrica } from "@/services/escolaApi";
import { periodoVigenteEscola } from "./periodo";

interface Props {
	instId: number;
	refreshKey: number;
}

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (ym: string) => {
	const [y, m] = ym.split("-").map(Number);
	return `${MESES_ABREV[(m || 1) - 1]}/${String(y).slice(2)}`;
};
const rotuloDia = (ymd: string) => ymd.slice(5).split("-").reverse().join("/");

const tooltip3 = (value: number, name: string) =>
	name === "Receita" ? Utils.formatCurrency(value) :
	name === "Impressões" ? `${value} impressões` : `${value} ordens`;

// Gráfico de 3 métricas: barras = impressões (esq.), linha = receita (dir.),
// rótulo = nº de ordens sobre cada barra.
const Grafico3: React.FC<{ titulo: string; sub?: string; dados: { nome: string; ordens: number; receita: number; impressoes: number }[] }> =
	({ titulo, sub, dados }) => (
	<Card className="p-5">
		<h4 className="text-base font-bold text-ink">{titulo}</h4>
		{sub && <p className="text-xs text-ink-faint mt-0.5 mb-3">{sub}</p>}
		<ResponsiveContainer width="100%" height={270}>
			<ComposedChart data={dados} margin={{ left: -5, right: 5, top: 20 }}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
				<XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} interval={0} />
				<YAxis yAxisId="q" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
				<YAxis yAxisId="r" orientation="right" axisLine={false} tickLine={false}
					tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
				<Tooltip formatter={tooltip3 as any}
					contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }} />
				<Legend wrapperStyle={{ fontSize: "11px" }} />
				<Bar yAxisId="q" dataKey="impressoes" name="Impressões" fill="#c7d2fe" radius={[5, 5, 0, 0]} barSize={24}>
					<LabelList dataKey="ordens" position="top" formatter={(v: any) => `${v} ord`}
						style={{ fontSize: 10, fill: "#6366f1", fontWeight: 700 }} />
				</Bar>
				<Line yAxisId="r" type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2.5}
					dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} />
			</ComposedChart>
		</ResponsiveContainer>
	</Card>
);

const dadosSetor = (arr: SetorMetrica[]) => arr.map((s) => ({ nome: s.setor, ordens: s.ordens, receita: s.receita, impressoes: s.impressoes }));
const dadosServico = (arr: ServicoMetrica[]) => arr.map((s) => ({ nome: s.servico, ordens: s.ordens, receita: s.receita, impressoes: s.impressoes }));

export const EscolaDashboard: React.FC<Props> = ({ instId, refreshKey }) => {
	const toast = useToast();
	const loading = useLoading();
	const [periodo, setPeriodo] = useState(periodoVigenteEscola);
	const [data, setData] = useState<EscolaDashboardData | null>(null);

	const carregar = useCallback(async () => {
		loading.show("Carregando dashboard...");
		try {
			setData(await EscolaApi.getDashboard(instId, periodo.inicio, periodo.fim));
		} catch {
			toast.error("Erro ao carregar o dashboard.");
		} finally {
			loading.hide();
		}
	}, [instId, periodo, toast, loading]);

	useEffect(() => { carregar(); }, [carregar, refreshKey]);

	return (
		<div className="space-y-4">
			{/* Filtro de período (ciclo 11→10) */}
			<Card className="p-3">
				<div className="flex flex-wrap items-end gap-3">
					<div>
						<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">Início</p>
						<input type="date" value={periodo.inicio} onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))}
							className="h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-[10px]" />
					</div>
					<div>
						<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">Fim</p>
						<input type="date" value={periodo.fim} onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))}
							className="h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-[10px]" />
					</div>
					<button type="button" onClick={() => setPeriodo(periodoVigenteEscola())}
						className="h-8 px-3 text-xs font-semibold text-primary-700 bg-primary-50 rounded-[10px]">
						Período vigente
					</button>
				</div>
			</Card>

			{!data ? (
				<Card className="p-8 text-center text-ink-faint">Carregando…</Card>
			) : (
				<>
					{/* (a) Cards numa linha */}
					<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
						<StatTile label="Serviços no período" value={Utils.formatCurrency(data.servicosPeriodo)}
							sub={`${data.nOrdens} ordens`} icon={<Wallet className="w-5 h-5" />} accent="from-emerald-500 to-teal-600" />
						<StatTile label="Ticket médio" value={Utils.formatCurrency(data.ticketMedio)}
							icon={<Layers className="w-5 h-5" />} accent="from-primary-500 to-violet-600" />
						<StatTile label="Abertas" value={String(data.abertas)}
							icon={<FileText className="w-5 h-5" />} accent="from-indigo-500 to-blue-600" />
						<StatTile label="Concluídas" value={String(data.concluidas)}
							icon={<CheckCircle2 className="w-5 h-5" />} accent="from-emerald-500 to-teal-600" />
						<StatTile label="Quantidades A4" value={`${data.qtdA4Color} / ${data.qtdA4PB}`}
							sub="Color / P&B" icon={<Palette className="w-5 h-5" />} accent="from-pink-500 to-rose-600" />
					</div>

					{/* (b) Dia a dia + Serviços */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<Card className="p-5">
							<h4 className="text-base font-bold text-ink">Dia a dia</h4>
							<p className="text-xs text-ink-faint mt-0.5 mb-3">Volume e receita por dia no período</p>
							<ResponsiveContainer width="100%" height={260}>
								<LineChart data={data.diaADia} margin={{ left: -5, right: 5 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
									<XAxis dataKey="dia" tickFormatter={rotuloDia} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
									<YAxis yAxisId="v" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
									<YAxis yAxisId="r" orientation="right" axisLine={false} tickLine={false}
										tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
									<Tooltip formatter={(value: number, name: string) => name === "Receita" ? Utils.formatCurrency(value) : `${value} ordens`}
										labelFormatter={rotuloDia}
										contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }} />
									<Legend wrapperStyle={{ fontSize: "11px" }} />
									<Line yAxisId="v" type="monotone" dataKey="volume" name="Volume" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 2 }} />
									<Line yAxisId="r" type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} />
								</LineChart>
							</ResponsiveContainer>
						</Card>

						<Grafico3 titulo="Serviços" sub="Ordens, receita e impressões por serviço" dados={dadosServico(data.porServico)} />
					</div>

					{/* (c) Por setor A4 */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<Grafico3 titulo="A4 P&B por setor" sub="Ordens, receita e impressões (A4 P&B)" dados={dadosSetor(data.porSetorA4PB)} />
						<Grafico3 titulo="A4 Color por setor" sub="Ordens, receita e impressões (A4 Color)" dados={dadosSetor(data.porSetorA4Color)} />
					</div>

					{/* (d) Evolução 6 meses */}
					<Card className="p-5">
						<h4 className="text-base font-bold text-ink">Evolução — últimos 6 meses</h4>
						<p className="text-xs text-ink-faint mt-0.5 mb-3">Receita (barra) e volume de ordens (linha)</p>
						<ResponsiveContainer width="100%" height={300}>
							<ComposedChart data={data.ultimos6Meses} margin={{ left: -5, right: 5, top: 22 }}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
								<XAxis dataKey="mes" tickFormatter={rotuloMes} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
								<YAxis yAxisId="r" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }}
									tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
								<YAxis yAxisId="v" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
								<Tooltip formatter={(value: number, name: string) => name === "Receita" ? Utils.formatCurrency(value) : `${value} ordens`}
									labelFormatter={rotuloMes}
									contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }} />
								<Legend wrapperStyle={{ fontSize: "11px" }} />
								<Bar yAxisId="r" dataKey="receita" name="Receita" fill="#a7f3d0" radius={[5, 5, 0, 0]} barSize={38}>
									<LabelList dataKey="receita" position="top" formatter={(v: any) => Utils.formatCurrency(v)}
										style={{ fontSize: 10, fill: "#0f766e", fontWeight: 700 }} />
								</Bar>
								<Line yAxisId="v" type="monotone" dataKey="volume" name="Volume" stroke="#6366f1" strokeWidth={2.5}
									dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}>
									<LabelList dataKey="volume" position="top" formatter={(v: any) => `${v}`}
										style={{ fontSize: 10, fill: "#6366f1", fontWeight: 700 }} />
								</Line>
							</ComposedChart>
						</ResponsiveContainer>
					</Card>
				</>
			)}
		</div>
	);
};
