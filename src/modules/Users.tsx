import React, { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import {
	Button,
	Field,
	Input,
	PageHeader,
	PageLoader,
	useConfirm,
} from "@/components/ui";
import {
	UserPlus, Trash2, Mail, User, Calendar,
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
	const confirm = useConfirm();
	const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
	const [loggedUsers, setLoggedUsers] = useState<LoggedUser[]>([]);
	const [newEmail, setNewEmail] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
	// O módulo fica montado para sempre: sem guardar o timer, ele sobreviveria
	// ao componente e ainda dispararia um setState depois.
	const msgTimer = useRef<number | null>(null);

	const showMsg = (type: "ok" | "err", text: string) => {
		if (msgTimer.current !== null) window.clearTimeout(msgTimer.current);
		setMsg({ type, text });
		msgTimer.current = window.setTimeout(() => setMsg(null), 3500);
	};

	useEffect(
		() => () => {
			if (msgTimer.current !== null) window.clearTimeout(msgTimer.current);
		},
		[]
	);

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
		const ok = await confirm({
			title: "Remover acesso",
			message: `Remover acesso de ${email}?`,
			confirmLabel: "Remover",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/admin/allowed-emails/${encodeURIComponent(email)}`);
			showMsg("ok", "Acesso removido.");
			await fetchData();
		} catch (e: any) {
			showMsg("err", e?.response?.data?.error || "Erro ao remover email");
		}
	};

	if (loading) {
		return <PageLoader message="Carregando controle de acesso..." />;
	}

	return (
		<div className="space-y-6">

			{/* ── Header ── */}
			<PageHeader
				title="Controle de Acesso"
				subtitle="Gerencie quem pode acessar o sistema"
				actions={
					<Button
						variant="ghost"
						size="sm"
						onClick={fetchData}
						icon={<RefreshCw className="w-3.5 h-3.5" />}
					>
						Atualizar
					</Button>
				}
			/>

			{/* ── Alert ── */}
			{msg && (
				<div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${
					msg.type === "ok"
						? "bg-success-50 border-success-200 text-success-700"
						: "bg-danger-50 border-danger-200 text-danger-700"
				}`}>
					{msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
					{msg.text}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

				{/* ── Emails Autorizados ── */}
				<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-6">
					<div className="flex items-center gap-2 mb-1">
						<Lock className="w-4 h-4 text-primary-500" />
						<h3 className="text-base font-bold text-ink">Emails Autorizados</h3>
					</div>
					<p className="text-xs text-ink-faint mb-5">
						Apenas esses emails conseguem fazer login pelo Google
					</p>

					{/* Add */}
					<div className="flex gap-2 mb-5">
						<Field className="flex-1">
							{/* `!` obrigatório: `bg-white` do kit vence `bg-surface-sunken`. */}
							<Input
								type="email"
								placeholder="email@exemplo.com"
								value={newEmail}
								onChange={(e) => setNewEmail(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleAdd()}
								className="!bg-surface-sunken"
							/>
						</Field>
						<Button
							onClick={handleAdd}
							loading={saving}
							icon={<UserPlus className="w-4 h-4" />}
							className="flex-shrink-0"
						>
							Adicionar
						</Button>
					</div>

					{/* List */}
					<div className="space-y-2">
						{allowedEmails.length === 0 ? (
							<div className="text-center py-8 text-ink-faint text-sm">
								Nenhum email cadastrado
							</div>
						) : (
							allowedEmails.map((ae) => (
								<div key={ae.email} className="flex items-center justify-between p-3 bg-surface-sunken rounded-xl border border-slate-100 group">
									<div className="flex items-center gap-2.5 min-w-0">
										<div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ae.added_by === "system" ? "bg-primary-100" : "bg-slate-100"}`}>
											<Mail className={`w-3.5 h-3.5 ${ae.added_by === "system" ? "text-primary-500" : "text-ink-faint"}`} />
										</div>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-ink truncate">{ae.email}</p>
											<p className="text-2xs text-ink-faint">
												{ae.added_by === "system" ? "Administrador do sistema" : `Adicionado por: ${ae.added_by}`}
											</p>
										</div>
									</div>
									{/* O e-mail do administrador do sistema não pode ser removido. */}
									{ae.added_by !== "system" && (
										<button
											type="button"
											onClick={() => handleRemove(ae.email)}
											className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-faint hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-all flex-shrink-0"
											title="Remover acesso"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									)}
								</div>
							))
						)}
					</div>

					<div className="mt-4 p-3 bg-warning-50 border border-warning-100 rounded-xl">
						<p className="text-2xs text-warning-700 leading-relaxed">
							<strong>Atenção:</strong> quem não estiver nessa lista será bloqueado ao tentar fazer login, mesmo que possua conta Google válida.
						</p>
					</div>
				</div>

				{/* ── Histórico de Logins ── */}
				<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-6">
					<div className="flex items-center gap-2 mb-1">
						<User className="w-4 h-4 text-ink-faint" />
						<h3 className="text-base font-bold text-ink">Histórico de Logins</h3>
					</div>
					<p className="num text-xs text-ink-faint mb-5">
						Usuários que já acessaram o sistema ({loggedUsers.length})
					</p>

					<div className="space-y-2">
						{loggedUsers.length === 0 ? (
							<div className="text-center py-8 text-ink-faint text-sm">
								Nenhum usuário registrado ainda
							</div>
						) : (
							loggedUsers.map((u) => (
								<div key={u.id} className="flex items-center gap-3 p-3 bg-surface-sunken rounded-xl border border-slate-100">
									{u.picture ? (
										<img
											src={u.picture}
											alt={u.name}
											className="w-9 h-9 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
										/>
									) : (
										<div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-600 font-bold text-sm">
											{u.name?.charAt(0) || "?"}
										</div>
									)}
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold text-ink truncate">{u.name}</p>
										<p className="text-xs text-ink-faint truncate">{u.email}</p>
									</div>
									<div className="num flex items-center gap-1 text-2xs text-ink-faint flex-shrink-0">
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
