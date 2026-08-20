/**
 * Cliente de API do módulo de clientes institucionais (escola/empresa).
 * Todas as chamadas passam pelo axios `api` (JWT + FormData automáticos).
 */
import { api } from "./api";
import type { Instituicao, InstituicaoPreco, InstituicaoSetor, InstituicaoFatura, Order } from "../types";

export interface EscolaDashboardData {
	competencia: string;
	aReceber: number;
	recebido: number;
	totalMes: number;
	nOrdens: number;
	ticketMedio: number;
	qtdColor: number;
	qtdPB: number;
	abertas: number;
	concluidas: number;
	porSetor: { setor: string; valor: number; ordens: number }[];
	mixServico: { servico: string; valor: number }[];
	evolucao: { competencia: string; total: number }[];
	topSolicitantes: { solicitante: string; valor: number; ordens: number }[];
	faturaStatus: "ABERTA" | "PAGA" | "INEXISTENTE";
}

export const EscolaApi = {
	getInstituicoes: () => api.get<Instituicao[]>("/escola").then((r) => r.data),

	getPrecos: (instId: number) =>
		api.get<InstituicaoPreco[]>(`/escola/${instId}/precos`).then((r) => r.data),
	putPreco: (instId: number, id: number, body: { valor_unitario: number; ativo?: boolean }) =>
		api.put(`/escola/${instId}/precos/${id}`, body).then((r) => r.data),

	getSetores: (instId: number) =>
		api.get<InstituicaoSetor[]>(`/escola/${instId}/setores`).then((r) => r.data),
	putSetor: (instId: number, id: number, body: Partial<InstituicaoSetor>) =>
		api.put(`/escola/${instId}/setores/${id}`, body).then((r) => r.data),

	getDashboard: (instId: number, competencia: string) =>
		api.get<EscolaDashboardData>(`/escola/${instId}/dashboard`, { params: { competencia } }).then((r) => r.data),

	getOrdens: (instId: number, filtros: { setor?: number; mes?: string; status?: string } = {}) =>
		api.get<Order[]>(`/escola/${instId}/ordens`, { params: filtros }).then((r) => r.data),
	criarOrdem: (instId: number, form: FormData) =>
		api.post<Order>(`/escola/${instId}/ordens`, form).then((r) => r.data),
	atualizarOrdem: (instId: number, id: number, body: Record<string, unknown>) =>
		api.put<Order>(`/escola/${instId}/ordens/${id}`, body).then((r) => r.data),
	comprovanteUrl: (instId: number, id: number) => `/escola/${instId}/ordens/${id}/comprovante.pdf`,
	baixarComprovante: (instId: number, id: number) =>
		api.get(`/escola/${instId}/ordens/${id}/comprovante.pdf`, { responseType: "blob" }).then((r) => r.data),

	getFaturas: (instId: number) =>
		api.get<InstituicaoFatura[]>(`/escola/${instId}/faturas`).then((r) => r.data),
	getFaturasPagas: () =>
		api.get<InstituicaoFatura[]>(`/escola/faturas`, { params: { status: "PAGA" } }).then((r) => r.data),
	gerarFatura: (instId: number, competencia: string) =>
		api.post(`/escola/${instId}/faturas/${competencia}/gerar`).then((r) => r.data),
	receberFatura: (instId: number, faturaId: number, data_pagamento: string) =>
		api.post(`/escola/${instId}/faturas/${faturaId}/receber`, { data_pagamento }).then((r) => r.data),

	relatorioUrl: (instId: number, tipo: "semanal" | "mensal", periodo: string) =>
		`/escola/${instId}/relatorio?tipo=${tipo}&${tipo === "mensal" ? "competencia" : "ate"}=${periodo}`,
	baixarRelatorio: (instId: number, tipo: "semanal" | "mensal", periodo: string) =>
		api.get(`/escola/${instId}/relatorio`, {
			params: tipo === "mensal" ? { tipo, competencia: periodo } : { tipo, ate: periodo },
			responseType: "blob",
		}).then((r) => r.data),
};
