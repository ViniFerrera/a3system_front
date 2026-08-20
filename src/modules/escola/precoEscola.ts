/**
 * Cálculo de preço da escola no cliente (espelha escola/precos.ts do backend).
 * As opções de cada categoria são derivadas da própria tabela de preços
 * carregada — então editar a tabela reflete no formulário sem mudar código.
 */
import type { InstituicaoPreco } from "@/types";

export const CATEGORIA_LABELS: Record<string, string> = {
	COPIA_PB: "Cópia P&B",
	IMPRESSAO_PB: "Impressão P&B",
	COPIA_IMPR_COLOR: "Cópia/Impressão Color",
	COUCHE_PB: "Papel Couché P&B",
	COUCHE_COLOR: "Papel Couché Color",
	ADESIVO_COMUM: "Adesivo Comum",
	ADESIVO_FOTO: "Adesivo Fotográfico",
	ENCADERNACAO: "Encadernação",
	PLASTIFICACAO: "Plastificação",
	PAPEL_FOTO: "Papel Foto",
};

// Ordem de exibição das categorias no seletor.
export const CATEGORIA_ORDEM = [
	"COPIA_PB", "IMPRESSAO_PB", "COPIA_IMPR_COLOR",
	"COUCHE_PB", "COUCHE_COLOR", "ADESIVO_COMUM", "ADESIVO_FOTO",
	"ENCADERNACAO", "PLASTIFICACAO", "PAPEL_FOTO",
];

const ativos = (precos: InstituicaoPreco[]) => precos.filter((p) => p.ativo !== false);
const norm = (v: unknown) => (v === undefined || v === null || v === "" ? null : v);
const uniq = (arr: (string | undefined)[]) =>
	Array.from(new Set(arr.filter((v): v is string => !!v)));

export const categoriasDisponiveis = (precos: InstituicaoPreco[]) =>
	CATEGORIA_ORDEM.filter((c) => precos.some((p) => p.categoria === c));

export const opcoesTamanho = (precos: InstituicaoPreco[], categoria: string) =>
	uniq(ativos(precos).filter((p) => p.categoria === categoria).map((p) => p.tamanho));

export const opcoesGramatura = (precos: InstituicaoPreco[], categoria: string) =>
	uniq(ativos(precos).filter((p) => p.categoria === categoria).map((p) => p.gramatura));

export const opcoesCor = (precos: InstituicaoPreco[], categoria: string) =>
	uniq(ativos(precos).filter((p) => p.categoria === categoria).map((p) => p.cor));

export interface ItemEscola {
	categoria: string;
	gramatura?: string;
	tamanho?: string;
	cor?: "PB" | "COLOR" | string;
	quantidade: number;
}

/** Casa a linha de preço para um item (encadernação casa pela faixa de folhas). */
export function casarPreco(precos: InstituicaoPreco[], item: ItemEscola): InstituicaoPreco | null {
	const lista = ativos(precos);
	if (item.categoria === "ENCADERNACAO") {
		return (
			lista.find((p) =>
				p.categoria === "ENCADERNACAO" &&
				norm(p.tamanho) === norm(item.tamanho) &&
				item.quantidade >= (p.faixa_min ?? 0) &&
				item.quantidade <= (p.faixa_max ?? Number.MAX_SAFE_INTEGER)
			) ?? null
		);
	}
	return (
		lista.find((p) =>
			p.categoria === item.categoria &&
			norm(p.gramatura) === norm(item.gramatura) &&
			norm(p.tamanho) === norm(item.tamanho) &&
			norm(p.cor) === norm(item.cor)
		) ?? null
	);
}

export function calcularPrecoInstituicao(
	precos: InstituicaoPreco[], item: ItemEscola
): { unitPrice: number; total: number; ruleApplied: string } {
	const regra = casarPreco(precos, item);
	const unitPrice = regra ? Number(regra.valor_unitario) : 0;
	return {
		unitPrice,
		total: unitPrice * (Number(item.quantidade) || 0),
		ruleApplied: regra
			? `${item.categoria}${item.gramatura ? " " + item.gramatura : ""}${item.tamanho ? " " + item.tamanho : ""}${item.cor ? " " + item.cor : ""}`.trim()
			: "SEM_PRECO",
	};
}
