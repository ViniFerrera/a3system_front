export interface Client {
	id?: number;
	tipo: "PF" | "PJ";
	nome: string;
	email: string;
	telefone: string;
	cpf_cnpj: string;
	cep?: string;
	endereco?: string;
	numero?: string;
	complemento?: string;
	indicador_municipal?: string;
	observacoes?: string;
}

export interface StockItem {
	id?: number;
	nome: string;
	unidade: string;
	saldo: number;
	minimo: number;
	associacao_material?: string;
	associacao_especificacao?: string;
	associacao_tamanho?: string;
	// Novos campos para suporte a Toners/Insumos
	is_toner?: boolean;
	print_yield?: number;
}

export interface PriceRule {
	id?: number;
	Servico: string;
	Material: string;
	Papel: string;
	Cor: string;
	Especificacao: string;
	Gramatura?: string;
	Valor_Cliente: number;
	valorOriginal?: number;
	lucroPct?: number;
	_min: number;
	_max: number;
	_isRange: boolean;
	[key: string]: any;
}

export interface OrderItem {
	id?: number;
	servico: string;
	material: string;
	gramatura?: string;
	tamanho?: string;
	is_double_sided?: boolean;
	cor: string;
	quantidade: number;
	unitPrice: number;
	total: number;
	ruleApplied: string;
	// Novo campo para vínculo com máquina na ordem
	maquina_id?: number;
}

export interface Order {
	id?: number;
	cliente_id: number;
	cliente_nome: string;
	descricao: string;
	items: OrderItem[];
	total: number;
	desconto_pontual?: number;
	status: "ABERTA" | "CONCLUIDA" | "CANCELADA";
	status_pagamento?: "PAGO" | "PARCIAL" | "NAO_PAGO";
	// Novos campos Financeiros
	forma_pagamento?: string;
	taxa_extra?: number;
	data: string;
	data_conclusao?: string;
	anexos: string[];
}

export interface Expense {
	id?: number;
	produto: string;
	obs?: string;
	vencimento: string;
	valor: number;
	status: "PAGO" | "PENDENTE";
	[key: string]: any;
}

export interface Machine {
	id?: number;
	nome: string;
	subtitulo?: string;
	tipo: string;
	status: "ATIVO" | "MANUTENCAO" | "INATIVO";
	descricao?: string;
	imagem_url?: string;
	ultima_manutencao?: string;
	proxima_manutencao?: string;
	estoque_associado_ids?: number[];
}
