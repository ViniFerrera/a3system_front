import React, { useState, useEffect } from "react";
import { api } from "@/services/api";
import {
	Shield, UserPlus, Trash2, Mail, User, Calendar,
	CheckCircle2, AlertTriangle, RefreshCw, Lock,
} from "lucide-react";

interface AllowedEmail {
	email: string;
	added_by: string;
	created_at: string;
}

interface LoggedUser {
	id: number;
	email: string;
	name: string;
	picture: string;
	created_at: string;
}

export const UsersModule = () => {
	const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
	const [loggedUsers, setLoggedUsers] = useState<LoggedUser[]>([]);
	const [newEmail, setNewEmail] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

	const showMsg = (type: "ok" | "err", text: string) => {
		setMsg({ type, text });
		setTimeout(() => setMsg(null), 3500);
	};

	const fetchData = async () => {
		setLoading(true);
		try {
			const [emailsRes, usersRes] = await Promise.all([
				api.get("/admin/allowed-emails"),
				api.get("/admin/users"),
			]);
			setAllowedEmails(emailsRes.data);
			setLoggedUsers(usersRes.data);
		} catch {
			showMsg("err", "Erro ao carregar dados");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchData(); }, []);

	const handleAdd = async () => {
		const email = newEmail.trim().toLowerCase();
		if (!email || !email.includes("@")) { showMsg("err", "Email inválido"); return; }
		setSaving(true);
		try {
			await api.post("/admin/allowed-emails", { email });
			setNewEmail("");
			showMsg("ok", `${email} adicionado com sucesso.`);
			await fetchData();
		} catch {
			showMsg("err", "Erro ao adicionar email");
		} finally {
			setSaving(false);
		}
	};

	const handleRemove = async (email: string) => {
		if (!confirm(`Remover acesso de ${email}?`)) return;
		try {
			await api.delete(`/admin/allowed-emails/${encodeURIComponent(email)}`);
			showMsg("ok", "Acesso removido.");
			await fetchData();
		} catch (e: any) {
			showMsg("err", e?.response?.data?.error || "Erro ao remover email");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">

			{/* ── Header ── */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="bg-indigo-100 p-2.5 rounded-xl">
						<Shield className="w-6 h-6 text-indigo-600" />
					</div>
					<div>
						<h2 className="text-xl font-bold text-slate-800">Controle de Acesso</h2>
						<p className="text-sm text-slate-400">Gerencie quem pode acessar o sistema</p>
					</div>
				</div>
				<button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all">
					<RefreshCw className="w-3.5 h-3.5" /> Atualizar
				</button>
			</div>

			{/* ── Alert ── */}
			{msg && (
				<div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
					msg.type === "ok"
						? "bg-emerald-50 border-emerald-200 text-emerald-700"
						: "bg-red-50 border-red-200 text-red-700"
				}`}>
					{msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
					{msg.text}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

				{/* ── Emails Autorizados ── */}
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<div className="flex items-center gap-2 mb-1">
						<Lock className="w-4 h-4 text-indigo-500" />
						<h3 className="text-base font-bold text-slate-800">Emails Autorizados</h3>
					</div>
					<p className="text-xs text-slate-400 mb-5">
						Apenas esses emails conseguem fazer login pelo Google
					</p>

					{/* Add */}
					<div className="flex gap-2 mb-5">
						<input
							type="email"
							placeholder="email@exemplo.com"
							value={newEmail}
							onChange={(e) => setNewEmail(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAdd()}
							className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-slate-50 placeholder:text-slate-300"
						/>
						<button
							onClick={handleAdd}
							disabled={saving}
							className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex-shrink-0"
						>
							<UserPlus className="w-4 h-4" />
							{saving ? "..." : "Adicionar"}
						</button>
					</div>

					{/* List */}
					<div className="space-y-2">
						{allowedEmails.length === 0 ? (
							<div className="text-center py-8 text-slate-300 text-sm">
								Nenhum email cadastrado
							</div>
						) : (
							allowedEmails.map((ae) => (
								<div key={ae.email} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
									<div className="flex items-center gap-2.5 min-w-0">
										<div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ae.added_by === "system" ? "bg-indigo-100" : "bg-slate-100"}`}>
											<Mail className={`w-3.5 h-3.5 ${ae.added_by === "system" ? "text-indigo-500" : "text-slate-400"}`} />
										</div>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-slate-700 truncate">{ae.email}</p>
											<p className="text-[10px] text-slate-400">
												{ae.added_by === "system" ? "Administrador do sistema" : `Adicionado por: ${ae.added_by}`}
											</p>
										</div>
									</div>
									{ae.added_by !== "system" && (
										<button
											onClick={() => handleRemove(ae.email)}
											className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
											title="Remover acesso"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									)}
								</div>
							))
						)}
					</div>

					<div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
						<p className="text-[11px] text-amber-700 leading-relaxed">
							<strong>Atenção:</strong> quem não estiver nessa lista será bloqueado ao tentar fazer login, mesmo que possua conta Google válida.
						</p>
					</div>
				</div>

				{/* ── Histórico de Logins ── */}
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<div className="flex items-center gap-2 mb-1">
						<User className="w-4 h-4 text-slate-400" />
						<h3 className="text-base font-bold text-slate-800">Histórico de Logins</h3>
					</div>
					<p className="text-xs text-slate-400 mb-5">
						Usuários que já acessaram o sistema ({loggedUsers.length})
					</p>

					<div className="space-y-2">
						{loggedUsers.length === 0 ? (
							<div className="text-center py-8 text-slate-300 text-sm">
								Nenhum usuário registrado ainda
							</div>
						) : (
							loggedUsers.map((u) => (
								<div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
									{u.picture ? (
										<img
											src={u.picture}
											alt={u.name}
											className="w-9 h-9 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
										/>
									) : (
										<div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-sm">
											{u.name?.charAt(0) || "?"}
										</div>
									)}
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold text-slate-700 truncate">{u.name}</p>
										<p className="text-xs text-slate-400 truncate">{u.email}</p>
									</div>
									<div className="flex items-center gap-1 text-[10px] text-slate-400 flex-shrink-0">
										<Calendar className="w-3 h-3" />
										{new Date(u.created_at).toLocaleDateString("pt-BR")}
									</div>
								</div>
							))
						)}
					</div>
				</div>

			</div>
		</div>
	);
};
