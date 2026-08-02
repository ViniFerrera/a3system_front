export interface OrderPreset {
	id: number;
	nome: string;
	itens: any[];
	posicao: number;
	ativo: boolean;
	/** Aparece em destaque na seção Material do formulário. */
	favorito?: boolean;
}

export interface RecentItem {
	servico: string;
	material: string;
	gramatura?: string;
	tamanho?: string;
	cor?: string;
	is_double_sided?: boolean;
	quantidade: number;
	vezes: number;
}
