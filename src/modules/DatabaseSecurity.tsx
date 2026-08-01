import React, { useState, useEffect, useCallback } from "react";
import {
	Download, Upload, RefreshCw, Database,
	CheckCircle2, AlertTriangle, HardDrive, Clock,
} from "lucide-react";
import {
	Button,
	DataTable,
	PageHeader,
	TableHead,
	Th,
	useConfirm,
} from "@/components/ui";
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
	const confirm = useConfirm();
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

		// Última barreira antes de sobrescrever o banco inteiro.
		const ok = await confirm({
			title: "Restaurar backup",
			message:
				"Restaurar um backup vai SUBSTITUIR todos os dados atuais do banco — " +
				"o que estiver salvo hoje será perdido. Recomendamos baixar um backup antes de continuar.",
			confirmLabel: "Restaurar",
			cancelLabel: "Cancelar",
			danger: true,
		});
		if (!ok) return;

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
			<PageHeader
				title="Segurança do Banco de Dados"
				subtitle="Backup, restauração e monitoramento"
				actions={
					<Button
						variant="secondary"
						onClick={loadStats}
						loading={loading}
						icon={<RefreshCw className="w-4 h-4" />}
					>
						Atualizar
					</Button>
				}
			/>

			{/* Alert */}
			{message && (
				<div className={`flex items-center gap-3 p-4 rounded-xl border ${message.type === "success" ? "bg-success-50 border-success-200 text-success-700" : "bg-danger-50 border-danger-200 text-danger-700"}`}>
					{message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
					<span className="text-sm font-semibold">{message.text}</span>
				</div>
			)}

			{/* KPI Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg">
					<Database className="w-5 h-5 mb-2 opacity-70" />
					<p className="text-white/70 text-2xs font-bold uppercase tracking-widest">Total de Registros</p>
					<p className="num text-2xl font-bold">{totalRecords.toLocaleString("pt-BR")}</p>
				</div>
				<div className="bg-gradient-to-br from-success-400 to-success-600 rounded-2xl p-5 text-white shadow-lg">
					<HardDrive className="w-5 h-5 mb-2 opacity-70" />
					<p className="text-white/70 text-2xs font-bold uppercase tracking-widest">Tabelas Ativas</p>
					<p className="num text-2xl font-bold">{stats.length}</p>
				</div>
				<div className="bg-gradient-to-br from-info-400 to-info-600 rounded-2xl p-5 text-white shadow-lg">
					<CheckCircle2 className="w-5 h-5 mb-2 opacity-70" />
					<p className="text-white/70 text-2xs font-bold uppercase tracking-widest">Status</p>
					<p className="text-2xl font-bold">{stats.length > 0 ? "Online" : "..."}</p>
				</div>
				<div className="bg-gradient-to-br from-warning-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
					<Clock className="w-5 h-5 mb-2 opacity-70" />
					<p className="text-white/70 text-2xs font-bold uppercase tracking-widest">Último Backup</p>
					<p className="num text-lg font-bold">{lastBackup || "Nenhum"}</p>
				</div>
			</div>

			{/* Actions */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
				<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-6">
					<h3 className="text-base font-bold text-ink flex items-center gap-2 mb-2">
						<Download className="w-5 h-5 text-success-500" /> Fazer Backup
					</h3>
					<p className="text-sm text-ink-faint mb-4">
						Baixa um arquivo JSON com todos os dados do sistema. Guarde em local seguro.
					</p>
					{/* Mantém o verde original: o kit não tem variante "success". */}
					<Button
						onClick={handleBackup}
						loading={backupLoading}
						icon={<Download className="w-4 h-4" />}
						className="w-full !h-12 !bg-success-500 hover:!bg-success-600 !shadow-success-200"
					>
						{backupLoading ? "Gerando..." : "Baixar Backup Completo"}
					</Button>
				</div>

				<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-6">
					<h3 className="text-base font-bold text-ink flex items-center gap-2 mb-2">
						<Upload className="w-5 h-5 text-warning-500" /> Restaurar Backup
					</h3>
					<p className="text-sm text-ink-faint mb-4">
						Restaura o banco a partir de um arquivo JSON de backup. <span className="text-danger-500 font-semibold">Substitui todos os dados atuais.</span>
					</p>
					{/* Segue sendo <label>: é ele que abre o seletor do arquivo escondido. */}
					<label className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-warning-300 text-warning-600 font-bold text-sm cursor-pointer hover:bg-warning-50 transition ${restoreLoading ? "opacity-50 pointer-events-none" : ""}`}>
						{restoreLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
						{restoreLoading ? "Restaurando..." : "Selecionar Arquivo de Backup (.json)"}
						<input type="file" accept=".json" className="hidden" onChange={handleRestore} disabled={restoreLoading} />
					</label>
				</div>
			</div>

			{/* Table Stats */}
			<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card overflow-hidden">
				<div className="p-6 border-b border-slate-200/60">
					<h3 className="text-base font-bold text-ink">Detalhamento por Tabela</h3>
					<p className="text-xs text-ink-faint mt-1">Registros em cada tabela do sistema</p>
				</div>
				{/* A casca já é um cartão; dentro deste bloco ela perde borda e sombra. */}
				<DataTable
					className="!border-0 !shadow-none !rounded-none"
					isEmpty={stats.length === 0}
					emptyTitle="Nenhuma estatística disponível"
					emptyDescription="Clique em Atualizar para recarregar as contagens."
					emptyIcon={<Database className="w-10 h-10" />}
				>
					<TableHead>
						<tr>
							<Th>Tabela</Th>
							<Th align="right">Registros</Th>
							<Th className="w-2/5">Ocupação</Th>
						</tr>
					</TableHead>
					<tbody className="divide-y divide-slate-100">
						{stats.map((s) => {
							const pct = totalRecords > 0 ? (s.count / totalRecords) * 100 : 0;
							return (
								<tr key={s.table} className="hover:bg-surface-sunken transition">
									<td className="p-4 font-semibold text-ink">{TABLE_LABELS[s.table] || s.table}</td>
									<td className="num p-4 text-right text-ink-muted">{s.count.toLocaleString("pt-BR")}</td>
									<td className="p-4">
										<div className="flex items-center gap-3">
											<div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
												<div className="h-full bg-primary-400 rounded-full transition-all" style={{ width: `${Math.max(pct, 0.5)}%` }} />
											</div>
											<span className="num text-2xs font-bold text-ink-faint w-10 text-right">{pct.toFixed(1)}%</span>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</DataTable>
			</div>
		</div>
	);
};
