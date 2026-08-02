import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import {
	Button,
	DataTable,
	Field,
	PageHeader,
	PageLoader,
	Select,
	TableHead,
	Th,
} from "@/components/ui";
import { api } from "@/services/api";
import { Order } from "@/types";
import { Utils } from "@/utils";
import {
	FileText,
	Download,
	ExternalLink,
	FileDown,
	Receipt,
	DollarSign,
	AlertCircle,
} from "lucide-react";

interface NfRecord {
	month: string;
	fileName: string;
	totalOrders: number;
	totalValue: number;
	webUrl: string;
	generatedAt: string;
}

interface Props {
	orders: Order[];
	quickAction?: { tab: string; action: string; nonce: number } | null;
}

// Mês corrente no fuso local — `toISOString()` devolveria UTC e viraria o mês
// anterior nas primeiras horas do dia no Brasil.
const mesCorrente = () => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export const NotaFiscalModule: React.FC<Props> = ({ orders, quickAction }) => {
	const [selectedMonth, setSelectedMonth] = useState(mesCorrente);
	const [generatedList, setGeneratedList] = useState<NfRecord[]>([]);
	const [generating, setGenerating] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	// Só cobre a montagem: as recargas após gerar um PDF acontecem com a página
	// já montada e não devem trocá-la por uma tela de carregamento.
	const [carregandoLista, setCarregandoLista] = useState(true);

	// Carrega lista de NFs já geradas
	const loadList = async () => {
		try {
			const res = await api.get("/nota-fiscal/list");
			setGeneratedList(res.data || []);
		} catch {
			console.error("Erro ao carregar lista de NFs");
		} finally {
			setCarregandoLista(false);
		}
	};

	useEffect(() => {
		loadList();
	}, []);

	// Ação rápida vinda da gaveta de atalhos: apenas seleciona o mês corrente.
	// Gerar o PDF continua sendo um clique explícito — uma segunda geração no
	// mesmo mês sobrescreveria o registro em `app_config`.
	useEffect(() => {
		if (quickAction?.tab === "nota-fiscal" && quickAction.action === "open") {
			setSelectedMonth(mesCorrente());
			setMessage("");
			setError("");
		}
	}, [quickAction?.nonce]);

	// Preview: ordens com NF paga no mês selecionado
	const preview = useMemo(() => {
		return orders.filter((o) => {
			const isNf = o.nota_fiscal === true || (o.nota_fiscal as any) === "true";
			const isPago = o.status_pagamento === "PAGO";
			const orderMonth = (o.data || "").slice(0, 7);
			return isNf && isPago && orderMonth === selectedMonth;
		});
	}, [orders, selectedMonth]);

	const previewTotal = useMemo(
		() => preview.reduce((sum, o) => sum + (o.total || 0), 0),
		[preview]
	);

	// Gerar meses disponíveis (últimos 12 meses)
	const monthOptions = useMemo(() => {
		const opts: { value: string; label: string }[] = [];
		const meses = [
			"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
			"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
		];
		const now = new Date();
		for (let i = 0; i < 12; i++) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			const lbl = `${meses[d.getMonth()]} ${d.getFullYear()}`;
			opts.push({ value: val, label: lbl });
		}
		return opts;
	}, []);

	const handleGenerate = async () => {
		if (preview.length === 0) {
			setError("Nenhuma ordem com NF paga encontrada neste mês.");
			return;
		}
		setGenerating(true);
		setMessage("");
		setError("");
		try {
			const res = await api.post("/nota-fiscal/generate", { month: selectedMonth });
			setMessage(
				`PDF gerado com sucesso! ${res.data.totalOrders} NF(s), total: ${Utils.formatCurrency(res.data.totalValue)}`
			);
			await loadList();
		} catch (e: any) {
			setError(e.response?.data?.error || "Erro ao gerar PDF");
		} finally {
			setGenerating(false);
		}
	};

	const handleDownload = async (month: string) => {
		try {
			const res = await api.get(`/nota-fiscal/download/${month}`, {
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const a = document.createElement("a");
			a.href = url;
			a.download = `NF_${month}.pdf`;
			a.click();
			window.URL.revokeObjectURL(url);
		} catch {
			setError("Erro ao baixar PDF");
		}
	};

	const formatMonth = (m: string) => {
		const meses = [
			"Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
			"Jul", "Ago", "Set", "Out", "Nov", "Dez",
		];
		const [y, mo] = m.split("-");
		return `${meses[parseInt(mo) - 1]} ${y}`;
	};

	if (carregandoLista) {
		return <PageLoader message="Carregando notas fiscais..." />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<PageHeader
				title="Nota Fiscal"
				subtitle="Gere resumos mensais de NF em PDF e envie para o OneDrive"
			/>

			{/* Seletor de mês + botão gerar */}
			<Card>
				<div className="p-5">
					<div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
						<div className="flex-1 w-full sm:w-auto">
							<Field
								label="Selecione o mês"
								className="w-full sm:w-64"
							>
								<Select
									value={selectedMonth}
									onChange={(e) => {
										setSelectedMonth(e.target.value);
										setMessage("");
										setError("");
									}}
								>
									{monthOptions.map((o) => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</Select>
							</Field>
						</div>

						{/* `loading` é obrigatório aqui: dois cliques gerariam o PDF duas
						    vezes e a segunda sobrescreveria o registro do mês. */}
						<Button
							onClick={handleGenerate}
							loading={generating}
							disabled={preview.length === 0}
							icon={<FileDown className="w-4 h-4" />}
						>
							{generating ? "Gerando..." : "Gerar PDF"}
						</Button>
					</div>

					{message && (
						<div className="mt-3 px-4 py-2.5 bg-success-50 border border-success-200 text-success-700 rounded-lg text-sm flex items-center gap-2">
							<Receipt className="w-4 h-4 flex-shrink-0" />
							{message}
						</div>
					)}
					{error && (
						<div className="mt-3 px-4 py-2.5 bg-danger-50 border border-danger-200 text-danger-700 rounded-lg text-sm flex items-center gap-2">
							<AlertCircle className="w-4 h-4 flex-shrink-0" />
							{error}
						</div>
					)}
				</div>
			</Card>

			{/* Preview do mês */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<div className="p-5 text-center">
						<div className="num text-3xl font-bold text-primary-600">{preview.length}</div>
						<div className="text-sm text-ink-muted mt-1">Ordens com NF</div>
					</div>
				</Card>
				<Card>
					<div className="p-5 text-center">
						<div className="num text-3xl font-bold text-success-600">
							{Utils.formatCurrency(previewTotal)}
						</div>
						<div className="text-sm text-ink-muted mt-1">Total Faturado</div>
					</div>
				</Card>
				<Card>
					<div className="p-5 text-center">
						<div className="num text-3xl font-bold text-violet-600">
							{preview.length > 0
								? Utils.formatCurrency(previewTotal / preview.length)
								: "R$ 0,00"}
						</div>
						<div className="text-sm text-ink-muted mt-1">Ticket Médio</div>
					</div>
				</Card>
			</div>

			{/* Preview das ordens do mês */}
			{preview.length > 0 && (
				<Card>
					<div className="p-5">
						<h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
							<FileText className="w-4 h-4" />
							Ordens do mês selecionado ({formatMonth(selectedMonth)})
						</h3>
						{/* A casca já é um cartão; dentro deste Card ela perde borda e sombra. */}
						<DataTable className="!border-0 !shadow-none !rounded-none">
							<TableHead>
								<tr className="border-b border-slate-200">
									<Th>OS</Th>
									<Th>Data</Th>
									<Th>Cliente</Th>
									<Th align="right">Total</Th>
								</tr>
							</TableHead>
							<tbody>
								{preview.map((o) => (
									<tr key={o.id} className="border-b border-slate-100 hover:bg-surface-sunken">
										<td className="num py-2 px-3 font-medium text-primary-600">#{o.id}</td>
										<td className="num py-2 px-3 text-ink-muted">
											{(o.data || "").slice(0, 10).split("-").reverse().join("/")}
										</td>
										<td className="py-2 px-3 text-ink">{o.cliente_nome}</td>
										<td className="num py-2 px-3 text-right font-medium text-ink">
											{Utils.formatCurrency(o.total || 0)}
										</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr className="bg-surface-sunken">
									<td colSpan={3} className="py-2 px-3 font-bold text-ink">Total</td>
									<td className="num py-2 px-3 text-right font-bold text-ink">
										{Utils.formatCurrency(previewTotal)}
									</td>
								</tr>
							</tfoot>
						</DataTable>
					</div>
				</Card>
			)}

			{/* Lista de NFs geradas */}
			<Card>
				<div className="p-5">
					<h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
						<DollarSign className="w-4 h-4" />
						PDFs Gerados
					</h3>
					{generatedList.length === 0 ? (
						<p className="text-sm text-ink-faint text-center py-6">
							Nenhum PDF gerado ainda. Selecione um mês e clique em "Gerar PDF".
						</p>
					) : (
						<div className="space-y-2">
							{generatedList.map((nf) => (
								<div
									key={nf.month}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-surface-sunken rounded-lg border border-slate-100"
								>
									<div className="flex items-center gap-3">
										<div className="p-2 bg-primary-100 rounded-lg">
											<FileText className="w-4 h-4 text-primary-600" />
										</div>
										<div>
											<div className="font-medium text-ink text-sm">
												{formatMonth(nf.month)}
											</div>
											<div className="num text-xs text-ink-muted">
												{nf.totalOrders} ordem(ns) &middot;{" "}
												{Utils.formatCurrency(nf.totalValue)} &middot; Gerado em{" "}
												{new Date(nf.generatedAt).toLocaleDateString("pt-BR")}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Button
											variant="subtle"
											size="sm"
											onClick={() => handleDownload(nf.month)}
											icon={<Download className="w-3.5 h-3.5" />}
										>
											Baixar PDF
										</Button>
										{nf.webUrl && (
											<a
												href={nf.webUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
											>
												<ExternalLink className="w-3.5 h-3.5" />
												OneDrive
											</a>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</Card>
		</div>
	);
};
