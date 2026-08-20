import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { Utils } from "@/utils";
import { Plus, Trash2, Save, FileText, Check } from "lucide-react";
import type { InstituicaoPreco, InstituicaoSetor } from "@/types";
import { EscolaApi } from "@/services/escolaApi";
import {
	CATEGORIA_LABELS, categoriasDisponiveis, opcoesTamanho, opcoesGramatura,
	opcoesCor, calcularPrecoInstituicao,
} from "./precoEscola";

interface LinhaItem {
	categoria: string;
	tamanho: string;
	gramatura: string;
	cor: string;
	quantidade: string;
}

const linhaVazia = (categoria: string): LinhaItem => ({
	categoria, tamanho: "", gramatura: "", cor: "", quantidade: "",
});

interface Props {
	instId: number;
	setores: InstituicaoSetor[];
	precos: InstituicaoPreco[];
	onCriada: () => void;
	onDadosMudaram: () => void;
}

const NOVO = "__novo__";

export const EscolaOrdemForm: React.FC<Props> = ({ instId, setores, precos, onCriada, onDadosMudaram }) => {
	const toast = useToast();
	const loading = useLoading();
	const cats = useMemo(() => categoriasDisponiveis(precos), [precos]);

	const [setorId, setSetorId] = useState<string>(setores[0]?.id ? String(setores[0].id) : "");
	const [solicitante, setSolicitante] = useState("");
	const [novoColab, setNovoColab] = useState("");
	const [modoNovoColab, setModoNovoColab] = useState(false);
	const [descricao, setDescricao] = useState("");
	const [linhas, setLinhas] = useState<LinhaItem[]>([linhaVazia(cats[0] || "COPIA_PB")]);
	const [arquivos, setArquivos] = useState<FileList | null>(null);
	const [salvando, setSalvando] = useState(false);

	const setorAtual = setores.find((s) => String(s.id) === setorId);
	const colaboradores = setorAtual?.colaboradores || [];

	const onSelectSolicitante = (v: string) => {
		if (v === NOVO) { setModoNovoColab(true); setSolicitante(""); return; }
		setModoNovoColab(false);
		setSolicitante(v);
	};

	const confirmarNovoColab = async () => {
		const nome = novoColab.trim();
		if (!nome || !setorId) return;
		loading.show("Adicionando colaborador...");
		try {
			await EscolaApi.addColaborador(instId, Number(setorId), nome);
			onDadosMudaram();          // recarrega setores → novo colaborador aparece na lista
			setSolicitante(nome);
			setModoNovoColab(false);
			setNovoColab("");
			toast.success("Colaborador adicionado.");
		} catch {
			toast.error("Erro ao adicionar colaborador.");
		} finally {
			loading.hide();
		}
	};

	const setLinha = (i: number, patch: Partial<LinhaItem>) =>
		setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

	const precoLinha = (l: LinhaItem) =>
		calcularPrecoInstituicao(precos, {
			categoria: l.categoria, tamanho: l.tamanho || undefined,
			gramatura: l.gramatura || undefined, cor: (l.cor as any) || undefined,
			quantidade: Number(l.quantidade) || 0,
		});

	const total = linhas.reduce((acc, l) => acc + precoLinha(l).total, 0);

	const salvar = async () => {
		if (!setorId) return toast.error("Selecione o setor.");
		const itensValidos = linhas.filter((l) => Number(l.quantidade) > 0);
		if (itensValidos.length === 0) return toast.error("Adicione ao menos um item com quantidade.");

		const items = itensValidos.map((l) => {
			const p = precoLinha(l);
			return {
				servico: CATEGORIA_LABELS[l.categoria] || l.categoria,
				material: [l.gramatura, l.tamanho].filter(Boolean).join(" "),
				gramatura: l.gramatura || "",
				tamanho: l.tamanho || "",
				cor: l.cor || (l.categoria.includes("COLOR") ? "COLOR" : "PB"),
				quantidade: Number(l.quantidade),
				unitPrice: p.unitPrice,
				total: p.total,
				ruleApplied: p.ruleApplied,
			};
		});

		const form = new FormData();
		form.append("setor_id", setorId);
		form.append("solicitante", solicitante);
		form.append("descricao", descricao);
		form.append("data", Utils.localIsoNow());
		form.append("total", String(total));
		form.append("items", JSON.stringify(items));
		if (arquivos) Array.from(arquivos).forEach((f) => form.append("files", f));

		setSalvando(true);
		loading.show("Criando ordem...");
		try {
			const ordem = await EscolaApi.criarOrdem(instId, form);
			toast.success(`Ordem ${ordem.inst_codigo || ""} criada.`);
			setLinhas([linhaVazia(cats[0] || "COPIA_PB")]);
			setSolicitante(""); setDescricao(""); setArquivos(null);
			onCriada();
		} catch (e: any) {
			toast.error(e?.response?.data?.details || "Erro ao criar ordem.");
		} finally {
			setSalvando(false);
			loading.hide();
		}
	};

	return (
		<div className="space-y-4">
			<Card className="p-4">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<Field label="Setor" required>
						<Select value={setorId} onChange={(e) => { setSetorId(e.target.value); setSolicitante(""); setModoNovoColab(false); }}>
							<option value="">Selecione…</option>
							{setores.map((s) => (
								<option key={s.id} value={s.id}>{s.nome} ({s.codigo})</option>
							))}
						</Select>
					</Field>
					<Field label="Solicitante">
						{modoNovoColab ? (
							<div className="flex items-center gap-2">
								<Input autoFocus value={novoColab} onChange={(e) => setNovoColab(e.target.value)}
									placeholder="Nome do novo colaborador"
									onKeyDown={(e) => { if (e.key === "Enter") confirmarNovoColab(); }} />
								<Button size="sm" variant="subtle" icon={<Check className="w-3.5 h-3.5" />} onClick={confirmarNovoColab} />
							</div>
						) : (
							<Select value={solicitante} onChange={(e) => onSelectSolicitante(e.target.value)} disabled={!setorId}>
								<option value="">Selecione…</option>
								{colaboradores.map((c) => (
									<option key={c.id} value={c.nome}>{c.nome}</option>
								))}
								<option value={NOVO}>＋ Novo colaborador</option>
							</Select>
						)}
					</Field>
					<Field label="Anexos">
						<input
							type="file" multiple onChange={(e) => setArquivos(e.target.files)}
							className="w-full text-xs text-ink-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:text-xs file:font-semibold"
						/>
					</Field>
				</div>
				<Field label="Observações" className="mt-3">
					<Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes do serviço…" />
				</Field>
			</Card>

			<Card className="p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-bold text-ink flex items-center gap-2"><FileText className="w-4 h-4" /> Itens</h3>
					<Button size="sm" variant="subtle" icon={<Plus className="w-3.5 h-3.5" />}
						onClick={() => setLinhas((p) => [...p, linhaVazia(cats[0] || "COPIA_PB")])}>
						Adicionar item
					</Button>
				</div>

				<div className="space-y-2">
					{linhas.map((l, i) => {
						const tamanhos = opcoesTamanho(precos, l.categoria);
						const gramaturas = opcoesGramatura(precos, l.categoria);
						const cores = opcoesCor(precos, l.categoria);
						const p = precoLinha(l);
						return (
							<div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end bg-slate-50 rounded-xl p-2.5">
								<div className="col-span-2 sm:col-span-3">
									<Field label="Produto">
										<Select value={l.categoria} onChange={(e) => setLinha(i, { categoria: e.target.value, tamanho: "", gramatura: "", cor: "" })}>
											{cats.map((c) => <option key={c} value={c}>{CATEGORIA_LABELS[c] || c}</option>)}
										</Select>
									</Field>
								</div>
								{gramaturas.length > 0 && (
									<div className="sm:col-span-2">
										<Field label="Gramatura">
											<Select value={l.gramatura} onChange={(e) => setLinha(i, { gramatura: e.target.value })}>
												<option value="">—</option>
												{gramaturas.map((g) => <option key={g} value={g}>{g}</option>)}
											</Select>
										</Field>
									</div>
								)}
								{tamanhos.length > 0 && (
									<div className="sm:col-span-2">
										<Field label="Tamanho">
											<Select value={l.tamanho} onChange={(e) => setLinha(i, { tamanho: e.target.value })}>
												<option value="">—</option>
												{tamanhos.map((t) => <option key={t} value={t}>{t}</option>)}
											</Select>
										</Field>
									</div>
								)}
								{cores.length > 0 && (
									<div className="sm:col-span-2">
										<Field label="Cor">
											<Select value={l.cor} onChange={(e) => setLinha(i, { cor: e.target.value })}>
												<option value="">—</option>
												{cores.map((c) => <option key={c} value={c}>{c === "PB" ? "P&B" : "Color"}</option>)}
											</Select>
										</Field>
									</div>
								)}
								<div className="sm:col-span-1">
									<Field label="Qtd">
										<Input type="number" min="0" value={l.quantidade} onChange={(e) => setLinha(i, { quantidade: e.target.value })} />
									</Field>
								</div>
								<div className="sm:col-span-1 text-right">
									<p className="text-2xs font-bold text-ink-muted uppercase">Total</p>
									<p className={`num text-sm font-bold ${p.unitPrice > 0 ? "text-ink" : "text-danger-500"}`}>
										{p.unitPrice > 0 ? Utils.formatCurrency(p.total) : "—"}
									</p>
								</div>
								<div className="flex justify-end">
									<Button size="sm" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5" />}
										onClick={() => setLinhas((prev) => prev.filter((_, idx) => idx !== i))}
										disabled={linhas.length === 1} />
								</div>
							</div>
						);
					})}
				</div>

				<div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
					<span className="text-sm font-semibold text-ink-muted">Total da ordem</span>
					<span className="num text-xl font-bold text-primary-700">{Utils.formatCurrency(total)}</span>
				</div>
			</Card>

			<div className="flex justify-end">
				<Button icon={<Save className="w-4 h-4" />} loading={salvando} onClick={salvar}>
					Criar ordem
				</Button>
			</div>
		</div>
	);
};
