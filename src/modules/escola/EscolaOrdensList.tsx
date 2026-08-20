import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge, Button, DataTable, TableHead, Th, Field, Select } from "@/components/ui";
import { useToast, useConfirm } from "@/components/ui";
import { Utils } from "@/utils";
import { CheckCircle2, Download, FileText, Filter } from "lucide-react";
import type { InstituicaoSetor, Order } from "@/types";
import { EscolaApi } from "@/services/escolaApi";

interface Props {
	instId: number;
	setores: InstituicaoSetor[];
	refreshKey: number;
}

export const EscolaOrdensList: React.FC<Props> = ({ instId, setores, refreshKey }) => {
	const toast = useToast();
	const confirm = useConfirm();
	const [ordens, setOrdens] = useState<Order[]>([]);
	const [carregando, setCarregando] = useState(true);
	const [fSetor, setFSetor] = useState("");
	const [fStatus, setFStatus] = useState("");
	const [fMes, setFMes] = useState("");

	const carregar = useCallback(async () => {
		setCarregando(true);
		try {
			const data = await EscolaApi.getOrdens(instId, {
				setor: fSetor ? Number(fSetor) : undefined,
				status: fStatus || undefined,
				mes: fMes || undefined,
			});
			setOrdens(data);
		} catch {
			toast.error("Erro ao carregar ordens.");
		} finally {
			setCarregando(false);
		}
	}, [instId, fSetor, fStatus, fMes, toast]);

	useEffect(() => { carregar(); }, [carregar, refreshKey]);

	const concluir = async (o: Order) => {
		const ok = await confirm({
			title: "Concluir ordem",
			message: `Marcar a ordem ${o.inst_codigo} como concluída? Isso dá baixa no estoque.`,
			confirmLabel: "Concluir",
		});
		if (!ok) return;
		try {
			await EscolaApi.atualizarOrdem(instId, o.id!, {
				status: "CONCLUIDA", data_conclusao: Utils.localIsoNow(),
			});
			toast.success("Ordem concluída.");
			carregar();
		} catch (e: any) {
			toast.error(e?.response?.data?.details || "Erro ao concluir.");
		}
	};

	const baixarComprovante = async (o: Order) => {
		try {
			const blob = await EscolaApi.baixarComprovante(instId, o.id!);
			const url = URL.createObjectURL(blob as Blob);
			window.open(url, "_blank");
			setTimeout(() => URL.revokeObjectURL(url), 60000);
		} catch {
			toast.error("Erro ao gerar comprovante.");
		}
	};

	return (
		<div className="space-y-4">
			<Card className="p-3">
				<div className="flex flex-wrap items-end gap-3">
					<Filter className="w-4 h-4 text-ink-faint mb-2" />
					<Field label="Setor" className="w-40">
						<Select value={fSetor} onChange={(e) => setFSetor(e.target.value)}>
							<option value="">Todos</option>
							{setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
						</Select>
					</Field>
					<Field label="Status" className="w-40">
						<Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
							<option value="">Todos</option>
							<option value="ABERTA">Aberta</option>
							<option value="CONCLUIDA">Concluída</option>
							<option value="CANCELADA">Cancelada</option>
						</Select>
					</Field>
					<Field label="Mês" className="w-40">
						<input type="month" value={fMes} onChange={(e) => setFMes(e.target.value)}
							className="w-full h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-[10px]" />
					</Field>
				</div>
			</Card>

			<DataTable
				isLoading={carregando}
				isEmpty={!carregando && ordens.length === 0}
				emptyIcon={<FileText className="w-8 h-8" />}
				emptyTitle="Nenhuma ordem"
				emptyDescription="Nenhuma ordem para os filtros atuais."
			>
				<TableHead>
					<tr>
						<Th>Código</Th><Th>Setor</Th><Th>Solicitante</Th><Th>Data</Th>
						<Th>Status</Th><Th align="right">Total</Th><Th align="right">Ações</Th>
					</tr>
				</TableHead>
				<tbody>
					{ordens.map((o) => (
						<tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
							<td className="px-3 py-2 num font-semibold text-ink">{o.inst_codigo}</td>
							<td className="px-3 py-2 text-ink-muted">{(o as any).setor_nome}</td>
							<td className="px-3 py-2 text-ink-muted">{o.inst_solicitante || "—"}</td>
							<td className="px-3 py-2 num text-ink-muted">{(o.data || "").slice(0, 10).split("-").reverse().join("/")}</td>
							<td className="px-3 py-2"><Badge status={o.status || ""} /></td>
							<td className="px-3 py-2 num text-right font-semibold text-ink">{Utils.formatCurrency(o.total)}</td>
							<td className="px-3 py-2">
								<div className="flex justify-end gap-1">
									<Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={() => baixarComprovante(o)} title="Comprovante" />
									{o.status === "ABERTA" && (
										<Button size="sm" variant="subtle" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => concluir(o)}>Concluir</Button>
									)}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</DataTable>
		</div>
	);
};
