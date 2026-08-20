import React, { useCallback, useEffect, useState } from "react";
import {
	ComposedChart, LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
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

// Escala com folga no topo para o rótulo acima da barra/ponto não ser cortado.
const comFolga = (max: number) => Math.ceil((max || 1) * 1.18);

const tooltip3 = (value: number, name: string) =>
	name === "Receita" ? Utils.formatCurrency(value) :
	name === "Impressões" ? `${value} impressões` : `${value} ordens`;

// Gráfico de 3 métricas (vertical): barras = impressões (esq.), linha = receita
// (dir.), rótulo = nº de ordens sobre cada barra. Usado no gráfico de Serviços.
const Grafico3: React.FC<{ titulo: string; sub?: string; dados: { nome: string; ordens: number; receita: number; impressoes: number }[] }> =
	({ titulo, sub, dados }) => (
	<Card className="p-5">
		<h4 className="text-base font-bold text-ink">{titulo}</h4>
		{sub && <p className="text-xs text-ink-faint mt-0.5 mb-3">{sub}</p>}
		<ResponsiveContainer width="100%" height={280}>
			<ComposedChart data={dados} margin={{ left: 0, right: 8, top: 28 }}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
				<XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} interval={0} />
				<YAxis yAxisId="q" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }}
					domain={[0, (max: number) => comFolga(max)]} />
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

// Tooltip do funil — mostra as três métricas do setor.
const FunilTooltip = ({ active, payload }: any) => {
	if (!active || !payload?.length) return null;
	const d = payload[0].payload as { nome: string; ordens: number; receita: number; impressoes: number };
	return (
		<div style={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: 12, background: "#fff", padding: "8px 12px" }}>
			<p className="font-bold text-ink mb-0.5">{d.nome}</p>
			<p className="text-ink-muted">{d.impressoes} impressões</p>
			<p className="text-ink-muted">{Utils.formatCurrency(d.receita)}</p>
			<p className="text-ink-muted">{d.ordens} ordens</p>
		</div>
	);
};

// Funil horizontal: barras deitadas ordenadas do maior para o menor por
// impressões. Rótulo à direita = impressões; receita/ordens no tooltip.
const GraficoFunil: React.FC<{ titulo: string; sub?: string; dados: { nome: string; ordens: number; receita: number; impressoes: number }[] }> =
	({ titulo, sub, dados }) => {
	const ordenado = [...dados].sort((a, b) => b.impressoes - a.impressoes);
	const height = Math.max(180, ordenado.length * 46);
	return (
		<Card className="p-5">
			<h4 className="text-base font-bold text-ink">{titulo}</h4>
			{sub && <p className="text-xs text-ink-faint mt-0.5 mb-3">{sub}</p>}
			<ResponsiveContainer width="100%" height={height}>
				<BarChart layout="vertical" data={ordenado} margin={{ left: 8, right: 56, top: 4, bottom: 4 }}>
					<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
					<XAxis type="number" hide domain={[0, (max: number) => comFolga(max)]} />
					<YAxis type="category" dataKey="nome" width={92} axisLine={false} tickLine={false}
						tick={{ fill: "#64748b", fontSize: 11 }} />
					<Tooltip content={<FunilTooltip />} cursor={{ fill: "rgba(99,102,241,.06)" }} />
					<Bar dataKey="impressoes" name="Impressões" fill="#818cf8" radius={[0, 6, 6, 0]} barSize={22}>
						<LabelList dataKey="impressoes" position="right" formatter={(v: any) => `${v}`}
							style={{ fontSize: 11, fill: "#475569", fontWeight: 700 }} />
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</Card>
	);
};

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
								<LineChart data={data.diaADia} margin={{ left: 0, right: 8, top: 6 }}>
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

					{/* (c) Por setor A4 — funil horizontal */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<GraficoFunil titulo="A4 P&B por setor" sub="Impressões por setor (maior → menor)" dados={dadosSetor(data.porSetorA4PB)} />
						<GraficoFunil titulo="A4 Color por setor" sub="Impressões por setor (maior → menor)" dados={dadosSetor(data.porSetorA4Color)} />
					</div>

					{/* (d) Evolução 6 meses */}
					<Card className="p-5">
						<h4 className="text-base font-bold text-ink">Evolução — últimos 6 meses</h4>
						<p className="text-xs text-ink-faint mt-0.5 mb-3">Receita (barra) e volume de ordens (linha)</p>
						<ResponsiveContainer width="100%" height={320}>
							<ComposedChart data={data.ultimos6Meses} margin={{ left: 8, right: 12, top: 30 }}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
								<XAxis dataKey="mes" tickFormatter={rotuloMes} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
								<YAxis yAxisId="r" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }}
									tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} domain={[0, (max: number) => comFolga(max)]} />
								<YAxis yAxisId="v" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }}
									domain={[0, (max: number) => comFolga(max)]} />
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
