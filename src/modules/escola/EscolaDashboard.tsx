import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui";
import { useToast } from "@/components/ui";
import { Utils } from "@/utils";
import { Wallet, CheckCircle2, Receipt, Layers, Palette, FileText } from "lucide-react";
import { EscolaApi, EscolaDashboardData } from "@/services/escolaApi";

const mesCorrente = () => {
	const n = new Date();
	return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};

interface Props {
	instId: number;
	refreshKey: number;
}

const Barras: React.FC<{ titulo: string; itens: { label: string; valor: number }[]; icon?: React.ReactNode }> = ({ titulo, itens, icon }) => {
	const max = Math.max(1, ...itens.map((i) => i.valor));
	return (
		<Card className="p-4">
			<h3 className="text-sm font-bold text-ink flex items-center gap-2 mb-3">{icon}{titulo}</h3>
			{itens.length === 0 ? (
				<p className="text-xs text-ink-faint">Sem dados no período.</p>
			) : (
				<div className="space-y-2">
					{itens.map((i) => (
						<div key={i.label}>
							<div className="flex justify-between text-xs mb-0.5">
								<span className="text-ink-muted truncate">{i.label}</span>
								<span className="num font-semibold text-ink">{Utils.formatCurrency(i.valor)}</span>
							</div>
							<div className="h-2 bg-slate-100 rounded-full overflow-hidden">
								<div className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full"
									style={{ width: `${(i.valor / max) * 100}%` }} />
							</div>
						</div>
					))}
				</div>
			)}
		</Card>
	);
};

export const EscolaDashboard: React.FC<Props> = ({ instId, refreshKey }) => {
	const toast = useToast();
	const [competencia, setCompetencia] = useState(mesCorrente);
	const [data, setData] = useState<EscolaDashboardData | null>(null);
	const [carregando, setCarregando] = useState(true);

	const carregar = useCallback(async () => {
		setCarregando(true);
		try {
			setData(await EscolaApi.getDashboard(instId, competencia));
		} catch {
			toast.error("Erro ao carregar o dashboard.");
		} finally {
			setCarregando(false);
		}
	}, [instId, competencia, toast]);

	useEffect(() => { carregar(); }, [carregar, refreshKey]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)}
					className="h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-[10px]" />
				{data && (
					<span className="text-xs text-ink-faint">
						Fatura: {data.faturaStatus === "PAGA" ? "recebida" : data.faturaStatus === "ABERTA" ? "aberta" : "não gerada"}
					</span>
				)}
			</div>

			{carregando || !data ? (
				<Card className="p-8 text-center text-ink-faint">Carregando…</Card>
			) : (
				<>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						<StatTile label="A receber no mês" value={Utils.formatCurrency(data.aReceber)}
							icon={<Wallet className="w-5 h-5" />} accent="from-amber-500 to-orange-600" />
						<StatTile label="Recebido (total)" value={Utils.formatCurrency(data.recebido)}
							icon={<Receipt className="w-5 h-5" />} accent="from-emerald-500 to-teal-600" />
						<StatTile label="Total do mês" value={Utils.formatCurrency(data.totalMes)}
							sub={`${data.nOrdens} ordens`} icon={<FileText className="w-5 h-5" />} />
						<StatTile label="Ticket médio" value={Utils.formatCurrency(data.ticketMedio)}
							icon={<Layers className="w-5 h-5" />} accent="from-primary-500 to-violet-600" />
					</div>

					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						<StatTile label="Cópias Color" value={String(data.qtdColor)} icon={<Palette className="w-5 h-5" />} accent="from-pink-500 to-rose-600" />
						<StatTile label="Cópias P&B" value={String(data.qtdPB)} icon={<Palette className="w-5 h-5" />} accent="from-slate-400 to-slate-600" />
						<StatTile label="Abertas" value={String(data.abertas)} icon={<FileText className="w-5 h-5" />} accent="from-indigo-500 to-blue-600" />
						<StatTile label="Concluídas" value={String(data.concluidas)} icon={<CheckCircle2 className="w-5 h-5" />} accent="from-emerald-500 to-teal-600" />
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<Barras titulo="Por setor" icon={<Layers className="w-4 h-4" />}
							itens={data.porSetor.map((s) => ({ label: s.setor, valor: s.valor }))} />
						<Barras titulo="Por serviço" icon={<FileText className="w-4 h-4" />}
							itens={data.mixServico.map((s) => ({ label: s.servico, valor: s.valor }))} />
					</div>

					<Barras titulo="Evolução mensal" icon={<Wallet className="w-4 h-4" />}
						itens={data.evolucao.map((e) => ({ label: e.competencia, valor: e.total }))} />
				</>
			)}
		</div>
	);
};
