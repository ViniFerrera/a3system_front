import { PriceRule, OrderItem } from "@/types";
import { Utils } from "@/utils";

/**
 * Item de ordem enquanto está sendo editado na grade.
 * Difere de OrderItem por permitir campos vazios (linha recém-criada).
 */
export interface EditableItem extends Partial<OrderItem> {
	_key: string;
	servico: string;
	material: string;
	gramatura?: string;
	tamanho?: string;
	cor: string;
	quantidade: number;
	unitPrice: number;
	total: number;
	ruleApplied: string;
	is_double_sided?: boolean;
	maquina_id?: number;
	maquina_nome?: string;
}

export type ItemField =
	| "servico"
	| "material"
	| "gramatura"
	| "tamanho"
	| "cor";

/** Um valor "-" na tabela de preços significa "campo não se aplica". */
export const isHyphen = (val?: string) => !val || val.trim() === "-";

/**
 * Um campo deve sumir da grade quando a única opção disponível é "-",
 * ou seja, quando aquela dimensão não existe para o serviço escolhido.
 */
export const shouldHideField = (options: string[]) =>
	options.length === 0 || (options.length === 1 && isHyphen(options[0]));

const uniqSorted = (values: (string | undefined)[]) =>
	[...new Set(values.map((v) => v ?? ""))].filter((v) => v !== "").sort();

/**
 * Opções disponíveis para cada campo de UM item, dada a tabela de preços.
 *
 * Substitui os useMemo globais que dependiam de um único `tempItem`: com N
 * linhas editáveis, cada linha precisa da própria cascata. Função pura — sem
 * estado, sem React — para poder ser chamada por linha sem custo de hooks.
 */
export const getFieldOptions = (
	priceTable: PriceRule[],
	item: Pick<EditableItem, "servico" | "material" | "gramatura" | "tamanho">
) => {
	const servicos = uniqSorted(priceTable.map((p) => p.Servico));

	const doServico = item.servico
		? priceTable.filter((p) => p.Servico === item.servico)
		: [];
	const materiais = uniqSorted(doServico.map((p) => p.Material));

	const doMaterial = item.material
		? doServico.filter((p) => p.Material === item.material)
		: [];
	const gramaturas = uniqSorted(doMaterial.map((p) => p.Gramatura));

	let refinado = doMaterial;
	if (item.gramatura)
		refinado = refinado.filter((p) => p.Gramatura === item.gramatura);
	const tamanhos = uniqSorted(refinado.map((p) => p.Papel));

	if (item.tamanho) refinado = refinado.filter((p) => p.Papel === item.tamanho);
	const cores = uniqSorted(refinado.map((p) => p.Cor));

	return { servicos, materiais, gramaturas, tamanhos, cores };
};

/**
 * Recalcula preço unitário e total do item.
 *
 * Roda a cada alteração de célula — é o que permite corrigir a quantidade sem
 * refazer o item. Antes isso acontecia uma única vez, no "Adicionar Item".
 */
export const recalcItem = (
	item: EditableItem,
	priceTable: PriceRule[]
): EditableItem => {
	const pricing = Utils.calculatePrice(
		priceTable,
		item.servico,
		item.material,
		item.cor,
		Number(item.quantidade),
		item.gramatura,
		item.tamanho
	);
	return {
		...item,
		unitPrice: pricing.unit,
		total: pricing.total,
		ruleApplied: pricing.rule || "N/A",
	};
};

/**
 * Aplica a mudança de um campo, limpando os campos que dependem dele.
 *
 * A cascata é escopada à linha: mudar o serviço de uma linha não afeta as
 * outras. Depois de limpar, campos que só têm a opção "-" são preenchidos
 * automaticamente, para o usuário não precisar escolher o óbvio.
 */
export const applyFieldChange = (
	item: EditableItem,
	field: ItemField,
	value: string,
	priceTable: PriceRule[]
): EditableItem => {
	let next: EditableItem = { ...item, [field]: value };

	// Limpa o que fica abaixo na cascata.
	if (field === "servico")
		next = { ...next, material: "", gramatura: "", tamanho: "", cor: "" };
	if (field === "material")
		next = { ...next, gramatura: "", tamanho: "", cor: "" };
	if (field === "gramatura") next = { ...next, tamanho: "", cor: "" };
	if (field === "tamanho") next = { ...next, cor: "" };

	next = autofillSingleOptions(next, priceTable);
	return recalcItem(next, priceTable);
};

/**
 * Preenche campos cuja única opção é "-" (a dimensão não se aplica).
 * Reproduz o comportamento dos useEffect de auto-preenchimento antigos,
 * agora por linha e sem estado.
 */
export const autofillSingleOptions = (
	item: EditableItem,
	priceTable: PriceRule[]
): EditableItem => {
	let next = { ...item };
	// Sequencial: preencher um campo pode revelar a opção única do seguinte.
	for (const field of ["material", "gramatura", "tamanho", "cor"] as const) {
		const opts = getFieldOptions(priceTable, next);
		const list =
			field === "material"
				? opts.materiais
				: field === "gramatura"
				? opts.gramaturas
				: field === "tamanho"
				? opts.tamanhos
				: opts.cores;
		if (!next[field] && list.length === 1 && isHyphen(list[0])) {
			next = { ...next, [field]: list[0] };
		}
	}
	return next;
};

let keyCounter = 0;
/** Chave estável de React para linhas da grade (o id do banco só existe após salvar). */
export const newItemKey = () => `item-${Date.now()}-${keyCounter++}`;

export const createEmptyItem = (): EditableItem => ({
	_key: newItemKey(),
	servico: "",
	material: "",
	gramatura: "",
	tamanho: "",
	cor: "",
	quantidade: 1,
	unitPrice: 0,
	total: 0,
	ruleApplied: "",
	is_double_sided: false,
	maquina_id: 0,
});

/** Normaliza um item vindo do banco ou de um preset para o formato da grade. */
export const toEditableItem = (raw: any, priceTable: PriceRule[]): EditableItem => {
	const item: EditableItem = {
		...raw,
		_key: newItemKey(),
		servico: raw.servico || "",
		material: raw.material || "",
		gramatura: raw.gramatura ?? "",
		tamanho: raw.tamanho ?? "",
		cor: raw.cor || "",
		quantidade: Number(raw.quantidade) || 1,
		// Item vindo do banco usa snake_case; do formulário/preset, camelCase.
		unitPrice: Number(raw.unitPrice ?? raw.unit_price) || 0,
		total: Number(raw.total) || 0,
		ruleApplied: raw.ruleApplied ?? raw.rule_applied ?? "",
		is_double_sided:
			raw.is_double_sided === true || raw.is_double_sided === "true",
		maquina_id: Number(raw.maquina_id) || 0,
	};
	// Preset não traz preço — calcula. Item do banco já tem total gravado, mas
	// recalcular mantém a grade coerente com a tabela de preços vigente.
	return recalcItem(item, priceTable);
};

/**
 * Colunas visíveis na grade inteira.
 *
 * A decisão é por tabela, não por linha: se cada linha escondesse colunas
 * diferentes, o alinhamento quebraria. Uma coluna some só quando nenhuma
 * linha a utiliza.
 */
export const getVisibleColumns = (
	items: EditableItem[],
	priceTable: PriceRule[]
) => {
	const visivel = { gramatura: false, tamanho: false, cor: false };
	for (const item of items) {
		const opts = getFieldOptions(priceTable, item);
		if (!shouldHideField(opts.gramaturas)) visivel.gramatura = true;
		if (!shouldHideField(opts.tamanhos)) visivel.tamanho = true;
		if (!shouldHideField(opts.cores)) visivel.cor = true;
	}
	return visivel;
};
