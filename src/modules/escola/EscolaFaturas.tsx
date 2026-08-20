import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge, Button, DataTable, TableHead, Th } from "@/components/ui";
import { useToast, useConfirm } from "@/components/ui";
import { Utils } from "@/utils";
import { FileSpreadsheet, RefreshCw, CheckCircle2 } from "lucide-react";
import type { InstituicaoFatura } from "@/types";
import { EscolaApi } from "@/services/escolaApi";

const mesCorrente = () => {
	const n = new Date();
	return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};

interface Props {
	instId: number;
	refreshKey: number;
}

export const EscolaFaturas: React.FC<Props> = ({ instId, refreshKey }) => {
	const toast = useToast();
	const confirm = useConfirm();
	const [faturas, setFaturas] = useState<InstituicaoFatura[]>([]);
	const [competencia, setCompetencia] = useState(mesCorrente);
	const [carregando, setCarregando] = useState(true);
	const [ocupado, setOcupado] = useState(false);

	const carregar = useCallback(async () => {
		setCarregando(true);
		try {
			setFaturas(await EscolaApi.getFaturas(instId));
		} catch {
			toast.error("Erro ao carregar faturas.");
		} finally {
			setCarregando(false);
		}
	}, [instId, toast]);

	useEffect(() => { carregar(); }, [carregar, refreshKey]);

	const gerar = async () => {
		setOcupado(true);
		try {
			const r: any = await EscolaApi.gerarFatura(instId, competencia);
			toast.success(`Fatura de ${competencia} gerada: ${Utils.formatCurrency(r.total || 0)}`);
			carregar();
		} catch (e: any) {
			toast.error(e?.response?.data?.details || "Erro ao gerar fatura.");
		} finally {
			setOcupado(false);
		}
	};

	const receber = async (f: InstituicaoFatura) => {
		const ok = await confirm({
			title: "Registrar recebimento",
			message: `Confirmar o recebimento da fatura de ${f.competencia} (${Utils.formatCurrency(f.total)})?`,
			confirmLabel: "Recebi",
		});
		if (!ok) return;
		try {
			await EscolaApi.receberFatura(instId, f.id!, Utils.localIsoNow().slice(0, 10));
			toast.success("Recebimento registrado.");
			carregar();
		} catch (e: any) {
			toast.error(e?.response?.data?.details || "Erro ao registrar recebimento.");
		}
	};

	return (
		<div className="space-y-4">
			<Card className="p-4">
				<div className="flex flex-wrap items-end gap-3">
					<div>
						<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">Competência</p>
						<input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)}
							className="h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-[10px]" />
					</div>
					<Button icon={<RefreshCw className="w-4 h-4" />} loading={ocupado} onClick={gerar}>
						Gerar / atualizar fatura
					</Button>
					<p className="text-xs text-ink-faint">A fatura soma as ordens não-canceladas do mês. Só entra no DRE ao registrar o recebimento.</p>
				</div>
			</Card>

			<DataTable
				isLoading={carregando}
				isEmpty={!carregando && faturas.length === 0}
				emptyIcon={<FileSpreadsheet className="w-8 h-8" />}
				emptyTitle="Nenhuma fatura"
				emptyDescription="Gere a fatura da competência acima."
			>
				<TableHead>
					<tr>
						<Th>Competência</Th><Th>Status</Th><Th align="right">Total</Th>
						<Th>Recebida em</Th><Th align="right">Ações</Th>
					</tr>
				</TableHead>
				<tbody>
					{faturas.map((f) => (
						<tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
							<td className="px-3 py-2 num font-semibold text-ink">{f.competencia}</td>
							<td className="px-3 py-2"><Badge status={f.status === "PAGA" ? "PAGO" : "PENDENTE"} /></td>
							<td className="px-3 py-2 num text-right font-semibold text-ink">{Utils.formatCurrency(f.total)}</td>
							<td className="px-3 py-2 num text-ink-muted">
								{f.data_pagamento ? f.data_pagamento.slice(0, 10).split("-").reverse().join("/") : "—"}
							</td>
							<td className="px-3 py-2 text-right">
								{f.status === "ABERTA" && (
									<Button size="sm" variant="subtle" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => receber(f)}>
										Registrar recebimento
									</Button>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</DataTable>
		</div>
	);
};
