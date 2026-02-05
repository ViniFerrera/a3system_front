import React, { useState, useEffect, useMemo } from "react";
import {
	LayoutDashboard,
	FileText,
	Users,
	Box,
	Settings,
	Printer,
	DollarSign,
	Menu,
	X,
	Bot, // Ícone do Robô Importado
} from "lucide-react";
import { DashboardModule } from "@/modules/Dashboard";
import { OrderModule } from "@/modules/Orders";
import { StockModule } from "@/modules/Stock";
import { PricingModule } from "@/modules/Pricing";
import { ClientsModule } from "@/modules/Clients";
import { ExpensesModule } from "@/modules/Expenses";
import { MachineryModule } from "@/modules/Machinery";
import { AiInsightsModule } from "@/modules/AiInsights"; // Módulo Importado
import { Client, StockItem, Order, PriceRule, Expense, Machine } from "@/types";
import { api } from "@/services/api";

const App = () => {
	const [activeTab, setActiveTab] = useState("dashboard");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// Estados de dados
	const [clients, setClients] = useState<Client[]>([]);
	const [stock, setStock] = useState<StockItem[]>([]);
	const [orders, setOrders] = useState<Order[]>([]);
	const [priceTable, setPriceTable] = useState<PriceRule[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);

	// CORREÇÃO: Força o tipo para ter 'id' obrigatório, pois os dados vêm do DB.
	const [machinery, setMachinery] = useState<(Machine & { id: number })[]>([]);

	// Carregamento de dados independente e robusto
	useEffect(() => {
		const loadData = async () => {
			// Função auxiliar para buscar cada rota com segurança
			const fetchSafe = async (endpoint: string, setter: Function) => {
				try {
					const res = await api.get(endpoint);
					if (res.data) setter(res.data);
				} catch (error) {
					console.error(`Erro ao carregar ${endpoint}:`, error);
				}
			};

			await Promise.all([
				fetchSafe("/clients", setClients),
				fetchSafe("/stock", setStock),
				fetchSafe("/orders", setOrders),
				fetchSafe("/expenses", setExpenses),
				fetchSafe("/pricing", setPriceTable),
				fetchSafe("/machinery", setMachinery),
			]);
		};

		loadData();
	}, []);

	const handleStockUpdate = (items: any[]) => {
		// Recarrega o estoque do backend para garantir consistencia após baixa
		api
			.get("/stock")
			.then((res) => setStock(res.data))
			.catch(console.error);
	};

	// --- CÁLCULO DOS CONTADORES DO MENU LATERAL ---
	const counts = useMemo(() => {
		// 1. Ordens Abertas
		const openOrders = orders.filter((o) => o.status === "ABERTA").length;

		// 2. Estoque em Alerta
		const lowStock = stock.filter(
			(s) => (s.saldo || 0) <= (s.minimo || 0)
		).length;

		// 3. Contas a Vencer (Pendentes vencidas ou vencendo amanhã)
		// Define o limite como amanhã (1 dia)
		const limitDate = new Date();
		limitDate.setDate(limitDate.getDate() + 1);
		const limitStr = limitDate.toISOString().split("T")[0];

		const pendingExpenses = expenses.filter((e) => {
			return e.status === "PENDENTE" && e.vencimento <= limitStr;
		}).length;

		return {
			orders: openOrders,
			stock: lowStock,
			expenses: pendingExpenses,
		};
	}, [orders, stock, expenses]);

	const navItems = [
		{ id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
		{ id: "ai", icon: Bot, label: "Insights da IA" }, // NOVO ITEM
		{ id: "orders", icon: FileText, label: "Ordens" },
		{ id: "clients", icon: Users, label: "Clientes" },
		{ id: "stock", icon: Box, label: "Estoque" },
		{ id: "machinery", icon: Printer, label: "Maquinário" },
		{ id: "pricing", icon: Settings, label: "Preços" },
		{ id: "expenses", icon: DollarSign, label: "Financeiro" },
	];

	// Helper para renderizar o Badge se houver contagem
	const renderBadge = (id: string) => {
		let count = 0;
		let colorClass = "";

		if (id === "orders") {
			count = counts.orders;
			colorClass = "bg-blue-500 text-white";
		} else if (id === "stock") {
			count = counts.stock;
			colorClass = "bg-amber-500 text-white";
		} else if (id === "expenses") {
			count = counts.expenses;
			colorClass = "bg-red-500 text-white";
		}

		if (count > 0) {
			return (
				<span
					className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${colorClass} transition-transform duration-300 animate-in zoom-in`}
				>
					{count}
				</span>
			);
		}
		return null;
	};

	return (
		<div className='flex min-h-screen bg-slate-50 font-sans text-slate-900'>
			{/* Mobile Header */}
			<div className='md:hidden fixed top-0 w-full bg-indigo-600 text-white p-4 flex justify-between items-center z-50 shadow-md'>
				<span className='font-bold text-xl tracking-tight flex items-center gap-2'>
					<Printer className='w-5 h-5' /> A3 System
				</span>
				<button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
					{isMobileMenuOpen ? (
						<X className='w-6 h-6' />
					) : (
						<Menu className='w-6 h-6' />
					)}
				</button>
			</div>

			{/* Sidebar */}
			<aside
				className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
					isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
				} md:static shadow-xl pt-16 md:pt-0`}
			>
				<div className='p-6 border-b border-slate-800 hidden md:block'>
					<div className='flex items-center gap-3 text-white'>
						<div className='bg-indigo-600 p-2.5 rounded-[10px] shadow-lg shadow-indigo-900/50'>
							<Printer className='w-6 h-6 text-white' />
						</div>
						<span className='font-bold text-xl tracking-tight text-white'>
							A3 System
						</span>
					</div>
				</div>

				<nav className='flex-1 p-4 space-y-2'>
					{navItems.map((item) => (
						<button
							key={item.id}
							onClick={() => {
								setActiveTab(item.id);
								setIsMobileMenuOpen(false);
							}}
							className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-all duration-200 group ${
								activeTab === item.id
									? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 translate-x-1"
									: "hover:bg-slate-800 hover:text-white"
							}`}
						>
							<item.icon
								className={`w-5 h-5 ${
									activeTab === item.id
										? "text-white"
										: "text-slate-400 group-hover:text-white"
								}`}
							/>
							<span className='font-medium text-sm'>{item.label}</span>
							{renderBadge(item.id)}
						</button>
					))}
				</nav>
			</aside>

			{/* Main Content */}
			<main className='flex-1 p-4 md:p-8 overflow-y-auto h-screen mt-16 md:mt-0'>
				<div className='max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col'>
					{activeTab === "dashboard" && (
						<DashboardModule orders={orders} expenses={expenses} />
					)}
					{activeTab === "ai" && <AiInsightsModule />}
					{activeTab === "orders" && (
						<OrderModule
							clients={clients}
							priceTable={priceTable}
							orders={orders}
							setOrders={setOrders}
							onStockUpdate={handleStockUpdate}
							machinery={machinery}
							setClients={setClients}
						/>
					)}
					{activeTab === "stock" && (
						<StockModule
							stock={stock}
							setStock={setStock}
							priceTable={priceTable}
						/>
					)}
					{activeTab === "machinery" && (
						<MachineryModule
							machinery={machinery}
							setMachinery={setMachinery}
							stock={stock}
						/>
					)}
					{activeTab === "pricing" && (
						<PricingModule data={priceTable} setData={setPriceTable} />
					)}
					{activeTab === "clients" && (
						<ClientsModule clients={clients} setClients={setClients} />
					)}
					{activeTab === "expenses" && (
						<ExpensesModule expenses={expenses} setExpenses={setExpenses} />
					)}
				</div>
			</main>

			{isMobileMenuOpen && (
				<div
					className='fixed inset-0 bg-black/50 z-30 md:hidden'
					onClick={() => setIsMobileMenuOpen(false)}
				></div>
			)}
		</div>
	);
};

export default App;
