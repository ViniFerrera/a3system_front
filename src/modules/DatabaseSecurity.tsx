import React, { useState, useEffect, useCallback } from "react";
import {
	Shield, Download, Upload, RefreshCw, Database,
	CheckCircle2, AlertTriangle, HardDrive, Clock,
} from "lucide-react";
import { api } from "@/services/api";

interface TableStat {
	table: string;
	count: number;
}

const TABLE_LABELS: Record<string, string> = {
	clients: "Clientes",
	orders: "Ordens de Serviço",
	order_items: "Itens de Ordens",
	stock: "Estoque",
	pricing: "Precificação",
	expenses: "Despesas",
	machinery: "Maquinário",
	machinery_stock: "Maquinário x Estoque",
	users: "Usuários",
	allowed_emails: "Emails Autorizados",
	app_config: "Configurações",
};

export const DatabaseSecurityModule = () => {
	const [stats, setStats] = useState<TableStat[]>([]);
	const [loading, setLoading] = useState(false);
	const [backupLoading, setBackupLoading] = useState(false);
	const [restoreLoading, setRestoreLoading] = useState(false);
	const [lastBackup, setLastBackup] = useState<string | null>(null);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const loadStats = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get("/admin/db-stats");
			setStats(res.data);
		} catch {
			setMessage({ type: "error", text: "Erro ao carregar estatísticas" });
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { loadStats(); }, [loadStats]);

	const totalRecords = stats.reduce((acc, s) => acc + s.count, 0);

	const handleBackup = async () => {
		setBackupLoading(true);
		setMessage(null);
		try {
			const res = await api.get("/admin/db-backup");
			const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `a3system_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
			a.click();
			URL.revokeObjectURL(url);
			setLastBackup(new Date().toLocaleString("pt-BR"));
			setMessage({ type: "success", text: "Backup baixado com sucesso!" });
		} catch {
			setMessage({ type: "error", text: "Erro ao gerar backup" });
		} finally {
			setBackupLoading(false);
		}
	};

	const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		e.target.value = "";

		if (!window.confirm(
			"ATENÇÃO: Restaurar um backup vai SUBSTITUIR todos os dados atuais do banco.\n\n" +
			"Tem certeza que deseja continuar?\n\n" +
			"Recomendamos fazer um backup antes de restaurar."
		)) return;

		setRestoreLoading(true);
		setMessage(null);
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			if (!data.tables) throw new Error("Formato inválido");
			await api.post("/admin/db-restore", data);
			setMessage({ type: "success", text: "Banco restaurado com sucesso! Recarregue a página." });
			await loadStats();
		} catch (err: any) {
			setMessage({ type: "error", text: err?.response?.data?.error || err.message || "Erro ao restaurar" });
		} finally {
			setRestoreLoading(false);
		}
	};

	return (
		<div className="space-y-6 pb-20 md:pb-0">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
						<Shield className="w-6 h-6 text-indigo-500" /> Segurança do Banco de Dados
					</h2>
					<p className="text-sm text-slate-400 mt-1">Backup, restauração e monitoramento</p>
				</div>
				<button onClick={loadStats} disabled={loading}
					className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-sm font-semibold">
					<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
				</button>
			</div>

			{/* Alert */}
			{message && (
				<div className={`flex items-center gap-3 p-4 rounded-xl border ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
					{message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
					<span className="text-sm font-semibold">{message.text}</span>
				</div>
			)}

			{/* KPI Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg">
					<Database className="w-5 h-5 mb-2 opacity-70" />
					<p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Total de Registros</p>
					<p className="text-2xl font-bold">{totalRecords.toLocaleString("pt-BR")}</p>
				</div>
				<div className="bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
					<HardDrive className="w-5 h-5 mb-2 opacity-70" />
					<p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Tabelas Ativas</p>
					<p className="text-2xl font-bold">{stats.length}</p>
				</div>
				<div className="bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl p-5 text-white shadow-lg">
					<CheckCircle2 className="w-5 h-5 mb-2 opacity-70" />
					<p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Status</p>
					<p className="text-2xl font-bold">{stats.length > 0 ? "Online" : "..."}</p>
				</div>
				<div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
					<Clock className="w-5 h-5 mb-2 opacity-70" />
					<p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Último Backup</p>
					<p className="text-lg font-bold">{lastBackup || "Nenhum"}</p>
				</div>
			</div>

			{/* Actions */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
						<Download className="w-5 h-5 text-emerald-500" /> Fazer Backup
					</h3>
					<p className="text-sm text-slate-400 mb-4">
						Baixa um arquivo JSON com todos os dados do sistema. Guarde em local seguro.
					</p>
					<button onClick={handleBackup} disabled={backupLoading}
						className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition shadow-md shadow-emerald-200 disabled:opacity-50">
						{backupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
						{backupLoading ? "Gerando..." : "Baixar Backup Completo"}
					</button>
				</div>

				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
						<Upload className="w-5 h-5 text-amber-500" /> Restaurar Backup
					</h3>
					<p className="text-sm text-slate-400 mb-4">
						Restaura o banco a partir de um arquivo JSON de backup. <span className="text-red-500 font-semibold">Substitui todos os dados atuais.</span>
					</p>
					<label className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 font-bold text-sm cursor-pointer hover:bg-amber-50 transition ${restoreLoading ? "opacity-50 pointer-events-none" : ""}`}>
						{restoreLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
						{restoreLoading ? "Restaurando..." : "Selecionar Arquivo de Backup (.json)"}
						<input type="file" accept=".json" className="hidden" onChange={handleRestore} disabled={restoreLoading} />
					</label>
				</div>
			</div>

			{/* Table Stats */}
			<div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
				<div className="p-6 border-b border-slate-100">
					<h3 className="text-base font-bold text-slate-800">Detalhamento por Tabela</h3>
					<p className="text-xs text-slate-400 mt-1">Registros em cada tabela do sistema</p>
				</div>
				<table className="w-full text-sm">
					<thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase">
						<tr>
							<th className="p-4 text-left">Tabela</th>
							<th className="p-4 text-right">Registros</th>
							<th className="p-4 text-left" style={{ width: "40%" }}>Ocupação</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{stats.map((s) => {
							const pct = totalRecords > 0 ? (s.count / totalRecords) * 100 : 0;
							return (
								<tr key={s.table} className="hover:bg-slate-50 transition">
									<td className="p-4 font-semibold text-slate-700">{TABLE_LABELS[s.table] || s.table}</td>
									<td className="p-4 text-right font-mono text-slate-600">{s.count.toLocaleString("pt-BR")}</td>
									<td className="p-4">
										<div className="flex items-center gap-3">
											<div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
												<div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${Math.max(pct, 0.5)}%` }} />
											</div>
											<span className="text-[10px] font-bold text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
};
