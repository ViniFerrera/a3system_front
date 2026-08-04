import {
	LayoutDashboard, FileText, Users, Box, Settings, Printer, DollarSign,
	Bot, Shield, HardDrive, Receipt, BarChart3, FileBarChart, Mail,
} from "lucide-react";
import React from "react";

export interface NavItem {
	id: string;
	icon: React.ElementType;
	label: string;
	group: "Principal" | "Operacional" | "Configuração";
}

export const NAV_ITEMS: NavItem[] = [
	{ id: "dashboard", icon: LayoutDashboard, label: "Dashboard", group: "Principal" },
	{ id: "ai", icon: Bot, label: "Insights IA", group: "Principal" },
	{ id: "orders", icon: FileText, label: "Ordens", group: "Operacional" },
	{ id: "clients", icon: Users, label: "Clientes", group: "Operacional" },
	{ id: "stock", icon: Box, label: "Estoque", group: "Operacional" },
	{ id: "machinery", icon: Printer, label: "Maquinário", group: "Operacional" },
	{ id: "pricing", icon: Settings, label: "Preços", group: "Configuração" },
	{ id: "expenses", icon: DollarSign, label: "Financeiro", group: "Configuração" },
	{ id: "dre", icon: BarChart3, label: "DRE", group: "Configuração" },
	{ id: "estudo", icon: FileBarChart, label: "Estudo", group: "Configuração" },
	{ id: "nota-fiscal", icon: Receipt, label: "Nota Fiscal", group: "Configuração" },
	{ id: "users", icon: Shield, label: "Usuários", group: "Configuração" },
	{ id: "db-security", icon: HardDrive, label: "Banco de Dados", group: "Configuração" },
	{ id: "reports", icon: Mail, label: "Relatórios", group: "Configuração" },
];

export const NAV_GROUPS = ["Principal", "Operacional", "Configuração"] as const;
