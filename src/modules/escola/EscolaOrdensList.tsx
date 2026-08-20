import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge, Button, DataTable, TableHead, Th, Field, Select } from "@/components/ui";
import { useToast, useConfirm } from "@/components/ui";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { Utils } from "@/utils";
import { CheckCircle2, Download, FileText, Filter, ChevronDown, ChevronUp, List } from "lucide-react";
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
	const loading = useLoading();
	const [ordens, setOrdens] = useState<Order[]>([]);
	const [carregando, setCarregando] = useState(true);
	const [expandido, setExpandido] = useState<number | null>(null);
	const [fSetor, setFSetor] = useState("");
	const [fStatus, setFStatus] = useState("");
	const [fMes, setFMes] = useState("");

	const carregar = useCallback(async () => {
		setCarregando(true);
		loading.show("Carregando ordens...");
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
			loading.hide();
		}
	}, [instId, fSetor, fStatus, fMes, toast, loading]);

	useEffect(() => { carregar(); }, [carregar, refreshKey]);

	const concluir = async (o: Order) => {
		const ok = await confirm({
			title: "Concluir ordem",
			message: `Marcar a ordem ${o.inst_codigo} como concluída? Isso dá baixa no estoque.`,
			confirmLabel: "Concluir",
		});
		if (!ok) return;
		loading.show("Concluindo ordem...");
		try {
			await EscolaApi.atualizarOrdem(instId, o.id!, {
				status: "CONCLUIDA", data_conclusao: Utils.localIsoNow(),
			});
			toast.success("Ordem concluída.");
			carregar();
		} catch (e: any) {
			toast.error(e?.response?.data?.details || "Erro ao concluir.");
		} finally {
			loading.hide();
		}
	};

	const baixarComprovante = async (o: Order) => {
		loading.show("Gerando comprovante...");
		try {
			const blob = await EscolaApi.baixarComprovante(instId, o.id!);
			const url = URL.createObjectURL(blob as Blob);
			window.open(url, "_blank");
			setTimeout(() => URL.revokeObjectURL(url), 60000);
		} catch {
			toast.error("Erro ao gerar comprovante.");
		} finally {
			loading.hide();
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
					{ordens.map((o) => {
						const aberto = expandido === o.id;
						return (
							<React.Fragment key={o.id}>
								<tr
									className={`border-t border-slate-100 cursor-pointer transition-colors ${aberto ? "bg-primary-50/40" : "hover:bg-slate-50"}`}
									onClick={() => setExpandido(aberto ? null : (o.id ?? null))}
								>
									<td className="px-3 py-2 num font-semibold text-ink">{o.inst_codigo}</td>
									<td className="px-3 py-2 text-ink-muted">{(o as any).setor_nome}</td>
									<td className="px-3 py-2 text-ink-muted">{o.inst_solicitante || "—"}</td>
									<td className="px-3 py-2 num text-ink-muted">{(o.data || "").slice(0, 10).split("-").reverse().join("/")}</td>
									<td className="px-3 py-2"><Badge status={o.status || ""} /></td>
									<td className="px-3 py-2 num text-right font-semibold text-ink">{Utils.formatCurrency(o.total)}</td>
									<td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
										<div className="flex justify-end items-center gap-1">
											<Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={() => baixarComprovante(o)} title="Comprovante" />
											{o.status === "ABERTA" && (
												<Button size="sm" variant="subtle" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => concluir(o)}>Concluir</Button>
											)}
											<button onClick={() => setExpandido(aberto ? null : (o.id ?? null))}
												className="p-1.5 text-slate-400 hover:text-primary-600">
												{aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
											</button>
										</div>
									</td>
								</tr>
								{aberto && (
									<tr className="bg-slate-50/60">
										<td colSpan={7} className="px-4 py-4 border-b border-primary-100">
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
												<div className="md:col-span-2 bg-white p-4 rounded-[10px] border-l-4 border-primary-500 shadow-sm">
													<h5 className="text-2xs font-bold text-ink-muted uppercase mb-3 flex items-center gap-2">
														<List className="w-4 h-4 text-primary-500" /> Itens da solicitação
													</h5>
													<ul className="space-y-2">
														{(o.items || []).map((it, idx) => (
															<li key={idx} className="flex justify-between text-xs border-b border-slate-50 last:border-0 pb-2">
																<span className="text-ink-muted">
																	<strong className="text-primary-600">{it.quantidade}x</strong>{" "}
																	{Utils.displayName(it.servico)}
																	{Utils.displayName(it.material) ? ` — ${Utils.displayName(it.material)}` : ""}
																	{Utils.displayName(it.tamanho) ? ` · ${Utils.displayName(it.tamanho)}` : ""}
																	{Utils.displayName(it.cor) && (
																		<span className="text-ink-faint text-2xs ml-1">({Utils.displayName(it.cor)})</span>
																	)}
																	<span className="text-ink-faint text-2xs ml-1">· {Utils.formatCurrency(Number((it as any).unit_price ?? it.unitPrice ?? 0))}/un</span>
																</span>
																<span className="num font-bold text-ink-muted">{Utils.formatCurrency(it.total)}</span>
															</li>
														))}
														{(o.items || []).length === 0 && <li className="text-xs text-ink-faint">Sem itens.</li>}
													</ul>
													<div className="num flex justify-end mt-3 pt-2 border-t border-slate-100 text-sm font-bold text-primary-700">
														Total: {Utils.formatCurrency(o.total)}
													</div>
												</div>
												<div className="space-y-3">
													<div className="bg-white p-4 rounded-[10px] border-l-4 border-slate-400 shadow-sm">
														<h5 className="text-2xs font-bold text-ink-muted uppercase mb-2">Dados</h5>
														<div className="space-y-1.5 text-xs">
															<div className="flex justify-between"><span className="text-ink-faint">Setor</span><span className="font-semibold text-ink">{(o as any).setor_nome || "—"}</span></div>
															<div className="flex justify-between"><span className="text-ink-faint">Solicitante</span><span className="font-semibold text-ink">{o.inst_solicitante || "—"}</span></div>
															<div className="flex justify-between"><span className="text-ink-faint">Data</span><span className="font-semibold text-ink">{Utils.formatDateTime(o.data)}</span></div>
															<div className="flex justify-between items-center"><span className="text-ink-faint">Status</span><Badge status={o.status || ""} /></div>
														</div>
													</div>
													<div className="bg-white p-4 rounded-[10px] border-l-4 border-amber-400 shadow-sm">
														<h5 className="text-2xs font-bold text-ink-muted uppercase mb-2">Observações</h5>
														<p className="text-xs text-ink-muted italic leading-relaxed">{o.descricao || "Nenhuma observação registrada."}</p>
													</div>
													<div className="flex flex-wrap gap-2">
														<Button size="sm" variant="secondary" icon={<Download className="w-3.5 h-3.5" />} onClick={() => baixarComprovante(o)}>Comprovante</Button>
														{(o as any).inst_pasta_url && (
															<a href={(o as any).inst_pasta_url} target="_blank" rel="noopener noreferrer"
																className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline px-2">
																Abrir pasta
															</a>
														)}
													</div>
												</div>
											</div>
										</td>
									</tr>
								)}
							</React.Fragment>
						);
					})}
				</tbody>
			</DataTable>
		</div>
	);
};
