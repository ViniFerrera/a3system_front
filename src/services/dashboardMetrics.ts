import { api } from "./api";

/** Espelha `DashboardMetrics` de `cl_backend/src/dashboard/metrics.ts`. */
export interface DashboardMetrics {
	periodo: { inicio: string; fim: string };
	breakEven: {
		mes: string;
		receita: number;
		custo: number;
		faltam: number;
		pctAtingido: number;
		projecaoFechamento: number;
	};
	faixasTicket: { faixa: string; pedidos: number; receita: number }[];
	concentracao: {
		topPct: number;
		/**
		 * Receita dos clientes IDENTIFICADOS no período — a rota exclui o
		 * "Cliente Balcão" das análises de cliente. Nunca rotular como
		 * faturamento da empresa: é menor que o KPI de Receita do Dashboard.
		 */
		receitaTotal: number;
		top: { nome: string; receita: number; pedidos: number }[];
	};
	retencao: {
		novos: { clientes: number; pedidos: number; receita: number };
		recorrentes: { clientes: number; pedidos: number; receita: number };
		/**
		 * Percentual histórico: o denominador é todo cliente desde o piso de
		 * dados reais, NÃO o período selecionado.
		 */
		pctPedidoUnico: number;
		sumidos: { nome: string; receitaHistorica: number; pedidos: number; ultimoPedido: string; diasSem: number }[];
	};
}

/** Antes desta data o banco só tem totais mensais agregados. */
export const PISO_DADOS_REAIS = "2025-12-01";

export const fetchDashboardMetrics = async (
	inicio: string,
	fim: string
): Promise<DashboardMetrics> => {
	// O preset padrão do Dashboard é 12 meses, que hoje cai antes do piso —
	// elevar aqui evita um 400 logo no primeiro carregamento.
	const inicioSeguro = inicio < PISO_DADOS_REAIS ? PISO_DADOS_REAIS : inicio;
	const res = await api.get<DashboardMetrics>(
		`/dashboard/metrics?inicio=${inicioSeguro}&fim=${fim}`
	);
	return res.data;
};
