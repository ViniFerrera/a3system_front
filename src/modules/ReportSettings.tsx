import React, { useState, useEffect, useCallback } from "react";
import {
	Mail, Plus, Trash2, Send, Copy, Check, Eye, EyeOff,
	RefreshCw, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";
import { Button, Input, PageHeader, PageLoader, useConfirm } from "@/components/ui";
import { api } from "@/services/api";

interface CronConfig {
	secret: string;
	urlSemanal: string;
	urlFechamento: string;
}

const CARD = "bg-white border border-slate-200/60 rounded-2xl shadow-card p-6";

/** Copia e confirma visualmente por 2s — sem isso não há sinal de que o clique funcionou. */
const BotaoCopiar = ({ valor, rotulo }: { valor: string; rotulo: string }) => {
	const [copiado, setCopiado] = useState(false);
	const [erro, setErro] = useState(false);
	const copiar = async () => {
		try {
			await navigator.clipboard.writeText(valor);
			setCopiado(true);
			setTimeout(() => setCopiado(false), 2000);
		} catch {
			// Permissão negada, contexto sem HTTPS, etc. — sem isso o clique falha em
			// silêncio e o admin acha que copiou um valor que nunca chegou.
			setErro(true);
			setTimeout(() => setErro(false), 2000);
		}
	};
	return (
		<button
			type="button"
			onClick={copiar}
			aria-label={`Copiar ${rotulo}`}
			className="shrink-0 p-2 rounded-lg text-ink-faint hover:text-ink hover:bg-slate-100 transition"
		>
			{copiado ? (
				<Check className="w-4 h-4 text-success-500" />
			) : erro ? (
				<AlertTriangle className="w-4 h-4 text-danger-500" />
			) : (
				<Copy className="w-4 h-4" />
			)}
		</button>
	);
};

const CampoCopiavel = ({ valor, rotulo }: { valor: string; rotulo: string }) => (
	<div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl pl-3">
		<code className="num flex-1 py-2.5 text-xs text-ink break-all">{valor}</code>
		<BotaoCopiar valor={valor} rotulo={rotulo} />
	</div>
);

export const ReportSettingsModule = () => {
	const confirm = useConfirm();
	const [emails, setEmails] = useState<string[]>([]);
	const [novoEmail, setNovoEmail] = useState("");
	const [cron, setCron] = useState<CronConfig | null>(null);
	const [secretVisivel, setSecretVisivel] = useState(false);
	const [primeiraCarga, setPrimeiraCarga] = useState(true);
	const [salvando, setSalvando] = useState(false);
	const [rotacionando, setRotacionando] = useState(false);
	const [testando, setTestando] = useState<"weekly" | "month-close" | null>(null);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const carregar = useCallback(async () => {
		try {
			const [cfgEmails, cfgCron] = await Promise.all([
				api.get("/config/report_recipient_emails"),
				api.get("/admin/reports/cron-config"),
			]);
			const bruto = cfgEmails.data?.value;
			const lista = bruto ? JSON.parse(bruto) : [];
			setEmails(Array.isArray(lista) ? lista : []);
			setCron(cfgCron.data);
		} catch {
			setMessage({ type: "error", text: "Erro ao carregar as configurações de relatório" });
		} finally {
			setPrimeiraCarga(false);
		}
	}, []);

	useEffect(() => { carregar(); }, [carregar]);

	const salvarEmails = async (lista: string[]) => {
		setSalvando(true);
		setMessage(null);
		try {
			await api.post("/config", {
				key: "report_recipient_emails",
				value: JSON.stringify(lista),
			});
			setEmails(lista);
			setMessage({ type: "success", text: "Lista de destinatários atualizada" });
		} catch {
			setMessage({ type: "error", text: "Erro ao salvar destinatários" });
		} finally {
			setSalvando(false);
		}
	};

	const adicionar = () => {
		const email = novoEmail.trim().toLowerCase();
		if (!email.includes("@")) {
			setMessage({ type: "error", text: "Informe um email válido" });
			return;
		}
		if (emails.includes(email)) {
			setMessage({ type: "error", text: "Este email já está na lista" });
			return;
		}
		setNovoEmail("");
		salvarEmails([...emails, email]);
	};

	const rotacionarSecret = async () => {
		const ok = await confirm({
			title: "Gerar novo secret",
			message:
				"O secret atual deixa de funcionar imediatamente. Você precisará atualizar o " +
				"header X-Cron-Secret nos dois jobs do cron-job.org, ou os relatórios param de ser enviados.",
			confirmLabel: "Gerar novo",
			cancelLabel: "Cancelar",
			danger: true,
		});
		if (!ok) return;

		setRotacionando(true);
		setMessage(null);
		try {
			const res = await api.post("/admin/reports/cron-secret/rotate");
			setCron((atual) => (atual ? { ...atual, secret: res.data.secret } : atual));
			setSecretVisivel(true);
			setMessage({ type: "success", text: "Novo secret gerado — atualize os jobs do cron" });
		} catch {
			setMessage({ type: "error", text: "Erro ao gerar novo secret" });
		} finally {
			setRotacionando(false);
		}
	};

	const enviarTeste = async (tipo: "weekly" | "month-close") => {
		setTestando(tipo);
		setMessage(null);
		try {
			await api.post("/admin/reports/test-send", { tipo });
			setMessage({ type: "success", text: "Email de teste enviado" });
		} catch (err: any) {
			setMessage({
				type: "error",
				text: err?.response?.data?.error || "Erro ao enviar email de teste",
			});
		} finally {
			setTestando(null);
		}
	};

	if (primeiraCarga) {
		return <PageLoader message="Carregando configurações de relatórios..." />;
	}

	return (
		<div className="space-y-6 pb-20 md:pb-0">
			<PageHeader
				title="Relatórios por Email"
				subtitle="Resumo semanal e fechamento mensal enviados automaticamente"
			/>

			{message && (
				<div
					className={`flex items-center gap-3 p-4 rounded-xl border ${
						message.type === "success"
							? "bg-success-50 border-success-200 text-success-700"
							: "bg-danger-50 border-danger-200 text-danger-700"
					}`}
				>
					{message.type === "success" ? (
						<CheckCircle2 className="w-5 h-5" />
					) : (
						<AlertTriangle className="w-5 h-5" />
					)}
					<span className="text-sm font-semibold">{message.text}</span>
				</div>
			)}

			{/* Destinatários */}
			<div className={CARD}>
				<h3 className="text-base font-bold text-ink flex items-center gap-2 mb-2">
					<Mail className="w-5 h-5 text-primary-500" /> Destinatários
				</h3>
				<p className="text-sm text-ink-faint mb-4">
					Quem recebe o resumo semanal (toda segunda) e o fechamento mensal (dia 1º).
				</p>

				{/* Input tem w-full: precisa do wrapper flex-1 para dividir a linha com o botão. */}
				<div className="flex gap-2 mb-4">
					<div className="flex-1">
						<Input
							type="email"
							value={novoEmail}
							onChange={(e) => setNovoEmail(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && adicionar()}
							placeholder="email@exemplo.com"
						/>
					</div>
					<Button onClick={adicionar} loading={salvando} icon={<Plus className="w-4 h-4" />}>
						Adicionar
					</Button>
				</div>

				{emails.length === 0 ? (
					<p className="text-sm text-ink-faint italic">
						Nenhum destinatário cadastrado — os relatórios não serão enviados.
					</p>
				) : (
					<ul className="divide-y divide-slate-100">
						{emails.map((email) => (
							<li key={email} className="flex items-center justify-between py-3">
								<span className="text-sm text-ink">{email}</span>
								<button
									type="button"
									onClick={() => salvarEmails(emails.filter((e) => e !== email))}
									disabled={salvando}
									aria-label={`Remover ${email}`}
									className="text-danger-500 hover:text-danger-700 transition disabled:opacity-50"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{/* Configuração do cron */}
			{cron && (
				<div className={CARD}>
					<h3 className="text-base font-bold text-ink flex items-center gap-2 mb-2">
						<Clock className="w-5 h-5 text-primary-500" /> Configuração do Cron
					</h3>
					<p className="text-sm text-ink-faint mb-5">
						Crie dois jobs em <strong>cron-job.org</strong> com os dados abaixo. Use o método{" "}
						<strong>POST</strong> e adicione o header em ambos.
					</p>

					<div className="space-y-5">
						<div>
							<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">
								Job 1 — Resumo semanal · toda segunda-feira, 08:00
							</p>
							<CampoCopiavel valor={cron.urlSemanal} rotulo="URL do resumo semanal" />
						</div>

						<div>
							<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">
								Job 2 — Fechamento de mês · dia 1º, 08:00
							</p>
							<CampoCopiavel valor={cron.urlFechamento} rotulo="URL do fechamento de mês" />
						</div>

						<div>
							<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">
								Header (nos dois jobs)
							</p>
							<CampoCopiavel valor="X-Cron-Secret" rotulo="nome do header" />
						</div>

						<div>
							<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">
								Valor do header
							</p>
							<div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl pl-3">
								<code className="num flex-1 py-2.5 text-xs text-ink break-all">
									{secretVisivel ? cron.secret : "•".repeat(48)}
								</code>
								<button
									type="button"
									onClick={() => setSecretVisivel((v) => !v)}
									aria-label={secretVisivel ? "Ocultar secret" : "Revelar secret"}
									className="shrink-0 p-2 rounded-lg text-ink-faint hover:text-ink hover:bg-slate-100 transition"
								>
									{secretVisivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
								</button>
								<BotaoCopiar valor={cron.secret} rotulo="valor do secret" />
							</div>
							<p className="text-2xs text-ink-faint mt-1.5">
								Fica oculto por padrão para não vazar em captura de tela.
							</p>
						</div>
					</div>

					<div className="mt-5 pt-5 border-t border-slate-100">
						<Button
							variant="secondary"
							onClick={rotacionarSecret}
							loading={rotacionando}
							icon={<RefreshCw className="w-4 h-4" />}
						>
							Gerar novo secret
						</Button>
					</div>
				</div>
			)}

			{/* Teste */}
			<div className={CARD}>
				<h3 className="text-base font-bold text-ink flex items-center gap-2 mb-2">
					<Send className="w-5 h-5 text-primary-500" /> Enviar teste agora
				</h3>
				<p className="text-sm text-ink-faint mb-4">
					Dispara o email na hora, com os dados de hoje, para os destinatários acima — serve
					para conferir o conteúdo antes de confiar no envio automático.
				</p>
				<div className="flex flex-col sm:flex-row gap-3">
					<Button
						variant="secondary"
						onClick={() => enviarTeste("weekly")}
						loading={testando === "weekly"}
						icon={<Send className="w-4 h-4" />}
					>
						Testar resumo semanal
					</Button>
					<Button
						variant="secondary"
						onClick={() => enviarTeste("month-close")}
						loading={testando === "month-close"}
						icon={<Send className="w-4 h-4" />}
					>
						Testar fechamento de mês
					</Button>
				</div>
			</div>
		</div>
	);
};
