import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { api } from "@/services/api";
import { Order } from "@/types";
import { Utils } from "@/utils";
import {
	FileText,
	Download,
	ExternalLink,
	Calendar,
	Loader2,
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
}

export const NotaFiscalModule: React.FC<Props> = ({ orders }) => {
	const [selectedMonth, setSelectedMonth] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	});
	const [generatedList, setGeneratedList] = useState<NfRecord[]>([]);
	const [generating, setGenerating] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	// Carrega lista de NFs já geradas
	const loadList = async () => {
		try {
			const res = await api.get("/nota-fiscal/list");
			setGeneratedList(res.data || []);
		} catch {
			console.error("Erro ao carregar lista de NFs");
		}
	};

	useEffect(() => {
		loadList();
	}, []);

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

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-900">Nota Fiscal</h1>
					<p className="text-sm text-slate-500 mt-1">
						Gere resumos mensais de NF em PDF e envie para o OneDrive
					</p>
				</div>
			</div>

			{/* Seletor de mês + botão gerar */}
			<Card>
				<div className="p-5">
					<div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
						<div className="flex-1 w-full sm:w-auto">
							<label className="block text-sm font-medium text-slate-700 mb-1.5">
								<Calendar className="w-4 h-4 inline mr-1" />
								Selecione o mês
							</label>
							<select
								value={selectedMonth}
								onChange={(e) => {
									setSelectedMonth(e.target.value);
									setMessage("");
									setError("");
								}}
								className="w-full sm:w-64 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
							>
								{monthOptions.map((o) => (
									<option key={o.value} value={o.value}>
										{o.label}
									</option>
								))}
							</select>
						</div>

						<button
							onClick={handleGenerate}
							disabled={generating || preview.length === 0}
							className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-medium text-sm hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
						>
							{generating ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<FileDown className="w-4 h-4" />
							)}
							{generating ? "Gerando..." : "Gerar PDF"}
						</button>
					</div>

					{message && (
						<div className="mt-3 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm flex items-center gap-2">
							<Receipt className="w-4 h-4 flex-shrink-0" />
							{message}
						</div>
					)}
					{error && (
						<div className="mt-3 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
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
						<div className="text-3xl font-bold text-indigo-600">{preview.length}</div>
						<div className="text-sm text-slate-500 mt-1">Ordens com NF</div>
					</div>
				</Card>
				<Card>
					<div className="p-5 text-center">
						<div className="text-3xl font-bold text-emerald-600">
							{Utils.formatCurrency(previewTotal)}
						</div>
						<div className="text-sm text-slate-500 mt-1">Total Faturado</div>
					</div>
				</Card>
				<Card>
					<div className="p-5 text-center">
						<div className="text-3xl font-bold text-violet-600">
							{preview.length > 0
								? Utils.formatCurrency(previewTotal / preview.length)
								: "R$ 0,00"}
						</div>
						<div className="text-sm text-slate-500 mt-1">Ticket Médio</div>
					</div>
				</Card>
			</div>

			{/* Preview das ordens do mês */}
			{preview.length > 0 && (
				<Card>
					<div className="p-5">
						<h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
							<FileText className="w-4 h-4" />
							Ordens do mês selecionado ({formatMonth(selectedMonth)})
						</h3>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-slate-200">
										<th className="text-left py-2 px-3 text-slate-500 font-medium">OS</th>
										<th className="text-left py-2 px-3 text-slate-500 font-medium">Data</th>
										<th className="text-left py-2 px-3 text-slate-500 font-medium">Cliente</th>
										<th className="text-right py-2 px-3 text-slate-500 font-medium">Total</th>
									</tr>
								</thead>
								<tbody>
									{preview.map((o) => (
										<tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
											<td className="py-2 px-3 font-medium text-indigo-600">#{o.id}</td>
											<td className="py-2 px-3 text-slate-600">
												{(o.data || "").slice(0, 10).split("-").reverse().join("/")}
											</td>
											<td className="py-2 px-3 text-slate-700">{o.cliente_nome}</td>
											<td className="py-2 px-3 text-right font-medium text-slate-900">
												{Utils.formatCurrency(o.total || 0)}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className="bg-slate-50">
										<td colSpan={3} className="py-2 px-3 font-bold text-slate-700">Total</td>
										<td className="py-2 px-3 text-right font-bold text-slate-900">
											{Utils.formatCurrency(previewTotal)}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					</div>
				</Card>
			)}

			{/* Lista de NFs geradas */}
			<Card>
				<div className="p-5">
					<h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
						<DollarSign className="w-4 h-4" />
						PDFs Gerados
					</h3>
					{generatedList.length === 0 ? (
						<p className="text-sm text-slate-400 text-center py-6">
							Nenhum PDF gerado ainda. Selecione um mês e clique em "Gerar PDF".
						</p>
					) : (
						<div className="space-y-2">
							{generatedList.map((nf) => (
								<div
									key={nf.month}
									className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100"
								>
									<div className="flex items-center gap-3">
										<div className="p-2 bg-indigo-100 rounded-lg">
											<FileText className="w-4 h-4 text-indigo-600" />
										</div>
										<div>
											<div className="font-medium text-slate-800 text-sm">
												{formatMonth(nf.month)}
											</div>
											<div className="text-xs text-slate-500">
												{nf.totalOrders} ordem(ns) &middot;{" "}
												{Utils.formatCurrency(nf.totalValue)} &middot; Gerado em{" "}
												{new Date(nf.generatedAt).toLocaleDateString("pt-BR")}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<button
											onClick={() => handleDownload(nf.month)}
											className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
										>
											<Download className="w-3.5 h-3.5" />
											Baixar PDF
										</button>
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
