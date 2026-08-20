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
	data_pagamento?: string;
	anexos: string[];
	nota_fiscal?: boolean;
	// Campos de ordem institucional (escola/empresa). NULL em ordem normal.
	inst_id?: number;
	inst_setor_id?: number;
	inst_codigo?: string;
	inst_solicitante?: string;
	inst_comprovante_url?: string;
	inst_pasta_url?: string;
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

export interface OrcamentoItem {
	id?: number;
	versao_id?: number;
	servico: string;
	material: string;
	gramatura?: string;
	tamanho?: string;
	is_double_sided?: boolean;
	cor: string;
	quantidade: number;
	unitPrice: number;
	unit_price?: number;
	total: number;
	ruleApplied?: string;
	rule_applied?: string;
	maquina_id?: number;
}

export interface OrcamentoVersao {
	id?: number;
	orcamento_id: number;
	versao: number;
	total: number;
	data_criacao: string;
	itens: OrcamentoItem[];
}

export interface Orcamento {
	id?: number;
	cliente_id: number;
	cliente_nome: string;
	descricao?: string;
	status: "EM_ORCAMENTO" | "CONVERTIDO";
	ordem_id?: number;
	data: string;
	versoes?: OrcamentoVersao[];
	versao_count?: number;
	total_atual?: number;
}

// ─── Clientes institucionais (escola/empresa com tabela de preços própria) ───

export interface Instituicao {
	id?: number;
	tipo: "ESCOLA" | "EMPRESA";
	nome: string;
	cliente_id?: number;
	cor_dashboard?: string;
	logo_url?: string;
	pasta_raiz?: string;
	ativo?: boolean;
	observacoes?: string;
	setores?: InstituicaoSetor[];
}

export interface InstituicaoColaborador {
	id?: number;
	instituicao_id: number;
	setor_id: number;
	nome: string;
	ativo?: boolean;
}

export interface InstituicaoSetor {
	id?: number;
	instituicao_id: number;
	nome: string;
	codigo: string;
	coordenacao?: string;
	auxiliar?: string;
	ordem?: number;
	ativo?: boolean;
	colaboradores?: InstituicaoColaborador[];
}

export interface InstituicaoPreco {
	id?: number;
	instituicao_id: number;
	categoria: string;
	label?: string;
	gramatura?: string;
	tamanho?: string;
	cor?: "PB" | "COLOR";
	faixa_min?: number;
	faixa_max?: number;
	valor_unitario: number;
	ativo?: boolean;
	[key: string]: any;
}

export interface InstituicaoFatura {
	id?: number;
	instituicao_id: number;
	competencia: string;
	total: number;
	status: "ABERTA" | "PAGA";
	data_pagamento?: string;
	gerada_em?: string;
}
