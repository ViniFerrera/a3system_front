import {
	FileText, UserPlus, DollarSign, Box, Receipt, FileBarChart, Filter, LayoutDashboard,
} from "lucide-react";
import React from "react";

export type ShortcutKind = "module" | "action" | "orderFilter";

/** Filtros do módulo Ordens congelados num atalho. */
export interface OrderFilterPayload {
	filterStart: string;
	filterEnd: string;
	filterClient: number;
	filterServices: string[];
	filterPaymentStatus: "TODOS" | "PAGO" | "NAO_PAGO" | "PARCIAL";
	filterOrderStatus: "TODOS" | "ABERTA" | "CONCLUIDA" | "CANCELADA";
	filterNF: "TODOS" | "COM_NF" | "SEM_NF";
}

export interface Shortcut {
	id: string;
	kind: ShortcutKind;
	label: string;
	/** Chave do catálogo ICONS. */
	icon: string;
	/** Chave do catálogo COLORS. */
	color: string;
	/** Para "module": id da aba. Para "action": id da ação. Para "orderFilter": "orders". */
	target: string;
	payload?: OrderFilterPayload;
}

export const MAX_SHORTCUTS = 8;

export const ICONS: Record<string, React.ElementType> = {
	file: FileText,
	user: UserPlus,
	money: DollarSign,
	box: Box,
	receipt: Receipt,
	report: FileBarChart,
	filter: Filter,
	dashboard: LayoutDashboard,
};

// Strings literais, nunca montadas por template: o Tailwind varre o código
// estaticamente e só gera o CSS das classes que aparecem por extenso.
export const COLORS: Record<string, string> = {
	indigo: "bg-primary-50 text-primary-700 border-primary-100 hover:bg-primary-100",
	emerald: "bg-success-50 text-success-700 border-success-100 hover:bg-success-100",
	amber: "bg-warning-50 text-warning-700 border-warning-100 hover:bg-warning-100",
	rose: "bg-danger-50 text-danger-700 border-danger-100 hover:bg-danger-100",
	sky: "bg-info-50 text-info-700 border-info-100 hover:bg-info-100",
	slate: "bg-slate-100 text-ink-muted border-slate-200 hover:bg-slate-200",
};

/**
 * Ações disponíveis para atalho. `tab` é a aba que precisa estar ativa;
 * `action` é o identificador que o módulo recebe e interpreta.
 *
 * "Nota Fiscal do mês" e "Estudo do mês" apenas ABREM o módulo — geram
 * documento e registro persistido, e um clique acidental na gaveta não pode
 * disparar isso. O gatilho continua sendo o botão do próprio módulo.
 */
export const ACTIONS: { id: string; label: string; tab: string; action: string; icon: string }[] = [
	{ id: "new-order", label: "Nova ordem", tab: "orders", action: "new", icon: "file" },
	{ id: "new-client", label: "Novo cliente", tab: "clients", action: "new", icon: "user" },
	{ id: "new-expense", label: "Nova despesa", tab: "expenses", action: "new", icon: "money" },
	{ id: "new-stock", label: "Novo item de estoque", tab: "stock", action: "new", icon: "box" },
	{ id: "open-nf", label: "Nota Fiscal do mês", tab: "nota-fiscal", action: "open", icon: "receipt" },
	{ id: "open-estudo", label: "Estudo do mês", tab: "estudo", action: "open", icon: "report" },
];
