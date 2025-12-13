import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Users, Box, Settings, Printer, DollarSign, Menu, X } from 'lucide-react';
import { DashboardModule } from '@/modules/Dashboard';
import { OrderModule } from '@/modules/Orders';
import { StockModule } from '@/modules/Stock';
import { PricingModule } from '@/modules/Pricing';
import { ClientsModule } from '@/modules/Clients';
import { ExpensesModule } from '@/modules/Expenses';
import { Client, StockItem, Order, PriceRule, Expense } from '@/types';
import { api } from '@/services/api';

const App = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [stock, setStock] = useState<StockItem[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [priceTable, setPriceTable] = useState<PriceRule[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cRes, sRes, oRes, eRes, pRes] = await Promise.all([
                    api.get('/clients'),
                    api.get('/stock'),
                    api.get('/orders'),
                    api.get('/expenses'),
                    api.get('/pricing')
                ]);
                setClients(cRes.data);
                setStock(sRes.data);
                setOrders(oRes.data);
                setExpenses(eRes.data);
                setPriceTable(pRes.data);
            } catch (error) {
                console.error("Erro ao buscar dados do backend:", error);
            }
        };
        fetchData();
    }, []);

    const handleStockUpdate = (items: any[]) => {
        setStock(prev => prev.map(s => {
            if (s.id === 1) { 
                const qtdUsed = items.reduce((acc:any, i:any) => acc + i.quantidade, 0);
                return { ...s, saldo: Math.max(0, s.saldo - qtdUsed) };
            }
            return s;
        }));
        // Recarrega o estoque do backend para garantir consistencia
        api.get('/stock').then(res => setStock(res.data));
    };

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'orders', icon: FileText, label: 'Ordens' },
        { id: 'clients', icon: Users, label: 'Clientes' },
        { id: 'stock', icon: Box, label: 'Estoque' },
        { id: 'pricing', icon: Settings, label: 'Preços' },
        { id: 'expenses', icon: DollarSign, label: 'Financeiro' },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-indigo-600 text-white p-4 flex justify-between items-center z-50 shadow-md">
                <span className="font-bold text-xl tracking-tight flex items-center gap-2"><Printer className="w-5 h-5" /> A3 System</span>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:static shadow-xl pt-16 md:pt-0`}>
                <div className="p-6 border-b border-slate-800 hidden md:block">
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-indigo-600 p-2.5 rounded-[10px] shadow-lg shadow-indigo-900/50">
                            <Printer className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">A3 System</span>
                    </div>
                </div>
                
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-[10px] transition-all duration-200 group ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 translate-x-1' : 'hover:bg-slate-800 hover:text-white'}`}>
                            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen mt-16 md:mt-0">
                <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                    {activeTab === 'dashboard' && <DashboardModule orders={orders} expenses={expenses} />}
                    {activeTab === 'orders' && <OrderModule clients={clients} priceTable={priceTable} orders={orders} setOrders={setOrders} onStockUpdate={handleStockUpdate} />}
                    {activeTab === 'stock' && <StockModule stock={stock} setStock={setStock} priceTable={priceTable} />}
                    {activeTab === 'pricing' && <PricingModule data={priceTable} setData={setPriceTable} />}
                    {activeTab === 'clients' && <ClientsModule clients={clients} setClients={setClients} />}
                    {activeTab === 'expenses' && <ExpensesModule expenses={expenses} setExpenses={setExpenses} />}
                </div>
            </main>
            
            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}
        </div>
    );
};

export default App;