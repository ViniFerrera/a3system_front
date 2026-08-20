import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button, Input, SegmentedControl } from "@/components/ui";
import { useToast } from "@/components/ui";
import { Save } from "lucide-react";
import type { InstituicaoPreco, InstituicaoSetor } from "@/types";
import { EscolaApi } from "@/services/escolaApi";
import { CATEGORIA_LABELS } from "./precoEscola";

interface Props {
	instId: number;
	precos: InstituicaoPreco[];
	setores: InstituicaoSetor[];
	onChanged: () => void;
}

export const EscolaConfig: React.FC<Props> = ({ instId, precos, setores, onChanged }) => {
	const toast = useToast();
	const [aba, setAba] = useState<"precos" | "setores">("precos");
	const [valores, setValores] = useState<Record<number, string>>({});
	const [setorEdits, setSetorEdits] = useState<Record<number, Partial<InstituicaoSetor>>>({});

	const salvarPreco = async (p: InstituicaoPreco) => {
		const novo = valores[p.id!] !== undefined ? Number(valores[p.id!]) : p.valor_unitario;
		try {
			await EscolaApi.putPreco(instId, p.id!, { valor_unitario: novo, ativo: p.ativo !== false });
			toast.success("Preço atualizado.");
			onChanged();
		} catch {
			toast.error("Erro ao salvar preço.");
		}
	};

	const salvarSetor = async (s: InstituicaoSetor) => {
		const patch = setorEdits[s.id!] || {};
		try {
			await EscolaApi.putSetor(instId, s.id!, {
				nome: patch.nome ?? s.nome,
				codigo: patch.codigo ?? s.codigo,
				coordenacao: patch.coordenacao ?? s.coordenacao,
				auxiliar: patch.auxiliar ?? s.auxiliar,
				ativo: s.ativo !== false,
			});
			toast.success("Setor atualizado.");
			onChanged();
		} catch {
			toast.error("Erro ao salvar setor.");
		}
	};

	const linhasPorCategoria = precos.reduce<Record<string, InstituicaoPreco[]>>((acc, p) => {
		(acc[p.categoria] = acc[p.categoria] || []).push(p);
		return acc;
	}, {});

	return (
		<div className="space-y-4">
			<SegmentedControl
				value={aba}
				onChange={setAba}
				segments={[
					{ key: "precos", label: "Tabela de preços" },
					{ key: "setores", label: "Setores" },
				]}
			/>

			{aba === "precos" ? (
				<div className="space-y-4">
					{Object.entries(linhasPorCategoria).map(([cat, linhas]) => (
						<Card key={cat} className="p-4">
							<h3 className="text-sm font-bold text-ink mb-3">{CATEGORIA_LABELS[cat] || cat}</h3>
							<div className="space-y-1.5">
								{linhas.map((p) => (
									<div key={p.id} className="flex items-center gap-2 text-sm">
										<span className="flex-1 text-ink-muted">
											{[p.gramatura, p.tamanho, p.cor === "PB" ? "P&B" : p.cor === "COLOR" ? "Color" : "",
											  p.faixa_min != null ? `até ${p.faixa_max}` : ""].filter(Boolean).join(" · ") || "—"}
										</span>
										<div className="w-28">
											<Input type="number" step="0.01"
												defaultValue={p.valor_unitario}
												onChange={(e) => setValores((v) => ({ ...v, [p.id!]: e.target.value }))} />
										</div>
										<Button size="sm" variant="ghost" icon={<Save className="w-3.5 h-3.5" />} onClick={() => salvarPreco(p)} />
									</div>
								))}
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card className="p-4">
					<div className="space-y-3">
						{setores.map((s) => (
							<div key={s.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end border-b border-slate-100 pb-3">
								<div>
									<p className="text-2xs font-bold text-ink-muted uppercase mb-1">Nome</p>
									<Input defaultValue={s.nome} onChange={(e) => setSetorEdits((p) => ({ ...p, [s.id!]: { ...p[s.id!], nome: e.target.value } }))} />
								</div>
								<div>
									<p className="text-2xs font-bold text-ink-muted uppercase mb-1">Código</p>
									<Input defaultValue={s.codigo} onChange={(e) => setSetorEdits((p) => ({ ...p, [s.id!]: { ...p[s.id!], codigo: e.target.value } }))} />
								</div>
								<div>
									<p className="text-2xs font-bold text-ink-muted uppercase mb-1">Coordenação</p>
									<Input defaultValue={s.coordenacao || ""} onChange={(e) => setSetorEdits((p) => ({ ...p, [s.id!]: { ...p[s.id!], coordenacao: e.target.value } }))} />
								</div>
								<div>
									<p className="text-2xs font-bold text-ink-muted uppercase mb-1">Auxiliar</p>
									<Input defaultValue={s.auxiliar || ""} onChange={(e) => setSetorEdits((p) => ({ ...p, [s.id!]: { ...p[s.id!], auxiliar: e.target.value } }))} />
								</div>
								<Button size="sm" variant="secondary" icon={<Save className="w-3.5 h-3.5" />} onClick={() => salvarSetor(s)}>Salvar</Button>
							</div>
						))}
					</div>
				</Card>
			)}
		</div>
	);
};
