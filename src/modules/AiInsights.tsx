import React, { useState } from "react";
import Markdown from "react-markdown";
import { Card } from "@/components/ui/Card";
import {
	Bot,
	Send,
	Sparkles,
	TrendingUp,
	Calendar,
	MapPin,
	RefreshCcw,
	Lightbulb,
	ArrowRight,
} from "lucide-react";
import { api } from "@/services/api";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { Utils } from "@/utils";

// Tipos para os dados do Dashboard (vindos do JSON da IA)
interface InsightData {
	projection: { month: string; value: number; reason: string }[];
	opportunities: { date: string; title: string; description: string }[];
	calendar_events: { date: string; event: string }[];
}

export const AiInsightsModule = () => {
	// --- ESTADOS DO CHAT ---
	const [chatInput, setChatInput] = useState("");
	const [chatResponse, setChatResponse] = useState("");
	const [isChatLoading, setIsChatLoading] = useState(false);

	// --- ESTADOS DO DASHBOARD ---
	const [insightData, setInsightData] = useState<InsightData | null>(null);
	const [isInsightsLoading, setIsInsightsLoading] = useState(false);

	// Perguntas Sugeridas
	const suggestions = [
		"Qual a média de preço das copiadoras concorrentes nas Graças?",
		"Como está o andamento das minhas vendas e qual a projeção?",
		"Sugira uma estratégia de marketing para estudantes da UFPE este mês.",
		"Quais insumos devo estocar para o próximo mês?",
	];

	// --- HANDLERS ---

	const handleSendChat = async (message: string) => {
		if (!message.trim()) return;
		setIsChatLoading(true);
		setChatInput(message); // Preenche se clicou na sugestão
		try {
			const res = await api.post("/ai/chat", { message });
			setChatResponse(res.data.text);
		} catch (error) {
			setChatResponse("Desculpe, tive um erro ao conectar com a IA.");
		} finally {
			setIsChatLoading(false);
		}
	};

	const handleRefreshInsights = async () => {
		setIsInsightsLoading(true);
		try {
			const res = await api.get("/ai/insights");
			setInsightData(res.data);
		} catch (error) {
			alert("Erro ao gerar insights visuais.");
		} finally {
			setIsInsightsLoading(false);
		}
	};

	return (
		<div className='space-y-8 pb-12 animate-in fade-in duration-500'>
			{/* CABEÇALHO */}
			<div className='flex items-center gap-3 border-b border-slate-200 pb-4'>
				<div className='bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg shadow-indigo-200 text-white'>
					<Bot className='w-8 h-8' />
				</div>
				<div>
					<h2 className='text-2xl font-bold text-slate-800'>
						Consultor Inteligente (IA)
					</h2>
					<p className='text-slate-500 text-sm'>
						Analise dados, projete cenários e descubra oportunidades em Recife.
					</p>
				</div>
			</div>

			{/* SEÇÃO 1: CHAT INTERATIVO */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				{/* Coluna Esquerda: Input e Histórico */}
				<Card className='lg:col-span-1 p-6 flex flex-col h-full border-indigo-100 bg-slate-50/50'>
					<label className='text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center gap-2'>
						<Sparkles className='w-3 h-3' /> Faça uma pergunta
					</label>
					<div className='relative'>
						<textarea
							value={chatInput}
							onChange={(e) => setChatInput(e.target.value)}
							placeholder='Ex: Como aumentar o lucro com encadernação?'
							className='w-full p-4 pr-12 rounded-[12px] border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm shadow-sm h-32'
						/>
						<button
							onClick={() => handleSendChat(chatInput)}
							disabled={isChatLoading || !chatInput}
							className='absolute bottom-3 right-3 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50'
						>
							{isChatLoading ? (
								<RefreshCcw className='w-4 h-4 animate-spin' />
							) : (
								<Send className='w-4 h-4' />
							)}
						</button>
					</div>

					<div className='mt-6 space-y-2'>
						<p className='text-[10px] font-bold text-slate-400 uppercase'>
							Sugestões Rápidas
						</p>
						{suggestions.map((s, i) => (
							<button
								key={i}
								onClick={() => handleSendChat(s)}
								className='w-full text-left text-xs text-slate-600 bg-white p-2.5 rounded-[8px] border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition flex items-center justify-between group'
							>
								{s}
								<ArrowRight className='w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity' />
							</button>
						))}
					</div>
				</Card>

				{/* Coluna Direita: Resposta */}
				<Card className='lg:col-span-2 p-6 min-h-[400px] relative overflow-hidden'>
					<div className='absolute top-0 right-0 p-4 opacity-10 pointer-events-none'>
						<Bot className='w-64 h-64 text-indigo-900' />
					</div>
					<h3 className='text-lg font-bold text-slate-800 mb-4 flex items-center gap-2'>
						Resposta da IA
					</h3>
					{isChatLoading ? (
						<div className='flex flex-col items-center justify-center h-64 text-slate-400 gap-3 animate-pulse'>
							<Bot className='w-12 h-12 text-indigo-300' />
							<p className='text-sm'>Analisando dados da empresa e mercado...</p>
						</div>
					) : chatResponse ? (
						<div className='prose prose-sm prose-indigo max-w-none text-slate-600 bg-white/50 p-4 rounded-xl border border-slate-100 shadow-sm overflow-y-auto max-h-[60vh]'>
							<Markdown
								components={{
									h1: ({ children }) => <h1 className="text-xl font-bold text-slate-800 mt-4 mb-2">{children}</h1>,
									h2: ({ children }) => <h2 className="text-lg font-bold text-slate-800 mt-4 mb-2">{children}</h2>,
									h3: ({ children }) => <h3 className="text-base font-bold text-indigo-700 mt-3 mb-1.5">{children}</h3>,
									h4: ({ children }) => <h4 className="text-sm font-bold text-slate-700 mt-2 mb-1">{children}</h4>,
									p: ({ children }) => <p className="mb-2 leading-relaxed text-sm text-slate-600">{children}</p>,
									ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
									ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
									li: ({ children }) => <li className="text-sm text-slate-600 leading-relaxed">{children}</li>,
									strong: ({ children }) => <strong className="font-bold text-slate-800">{children}</strong>,
									em: ({ children }) => <em className="italic text-indigo-600">{children}</em>,
									blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-300 pl-3 my-2 italic text-slate-500 bg-indigo-50/50 py-2 rounded-r-lg">{children}</blockquote>,
									code: ({ children }) => <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
									table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">{children}</table></div>,
									thead: ({ children }) => <thead className="bg-slate-50 text-slate-700 font-bold text-xs uppercase">{children}</thead>,
									th: ({ children }) => <th className="p-2 border-b border-slate-200 text-left">{children}</th>,
									td: ({ children }) => <td className="p-2 border-b border-slate-100 text-slate-600">{children}</td>,
									hr: () => <hr className="my-4 border-slate-200" />,
								}}
							>
								{chatResponse}
							</Markdown>
						</div>
					) : (
						<div className='flex flex-col items-center justify-center h-64 text-slate-400 gap-2 opacity-50'>
							<Lightbulb className='w-10 h-10' />
							<p className='text-sm'>
								Selecione uma pergunta ou digite algo para começar.
							</p>
						</div>
					)}
				</Card>
			</div>

			{/* SEÇÃO 2: DASHBOARD VISUAL (ON-DEMAND) */}
			<div className='pt-8 border-t border-slate-200'>
				<div className='flex justify-between items-end mb-6'>
					<div>
						<h3 className='text-xl font-bold text-slate-800 flex items-center gap-2'>
							<TrendingUp className='w-6 h-6 text-emerald-600' /> Painel
							Estratégico
						</h3>
						<p className='text-sm text-slate-500 mt-1'>
							Projeções e calendário de oportunidades gerados pela IA.
						</p>
					</div>
					<button
						onClick={handleRefreshInsights}
						disabled={isInsightsLoading}
						className='bg-emerald-600 text-white px-5 py-2.5 rounded-[10px] hover:bg-emerald-700 transition font-bold text-sm flex items-center gap-2 shadow-md shadow-emerald-200 disabled:opacity-50'
					>
						{isInsightsLoading ? (
							<RefreshCcw className='w-4 h-4 animate-spin' />
						) : (
							<Sparkles className='w-4 h-4' />
						)}
						{insightData ? "Atualizar Análise" : "Gerar Análise"}
					</button>
				</div>

				{insightData ? (
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500'>
						{/* Gráfico de Projeção */}
						<Card className='p-6'>
							<h4 className='font-bold text-slate-700 mb-1 flex items-center gap-2'>
								Projeção de Faturamento (3 Meses)
							</h4>
							<p className='text-xs text-slate-400 mb-6'>
								Estimativa conservadora baseada no histórico.
							</p>
							<div className='h-[300px] w-full'>
								<ResponsiveContainer width='100%' height='100%'>
									<AreaChart data={insightData.projection}>
										<defs>
											<linearGradient
												id='colorValue'
												x1='0'
												y1='0'
												x2='0'
												y2='1'
											>
												<stop
													offset='5%'
													stopColor='#10b981'
													stopOpacity={0.2}
												/>
												<stop
													offset='95%'
													stopColor='#10b981'
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray='3 3'
											vertical={false}
											stroke='#f1f5f9'
										/>
										<XAxis
											dataKey='month'
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#64748b", fontSize: 12 }}
										/>
										<YAxis
											axisLine={false}
											tickLine={false}
											tick={{ fill: "#64748b", fontSize: 12 }}
										/>
										<Tooltip
											formatter={(value: number) => Utils.formatCurrency(value)}
											contentStyle={{
												borderRadius: "8px",
												border: "none",
												boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
											}}
										/>
										<Area
											type='monotone'
											dataKey='value'
											stroke='#10b981'
											strokeWidth={3}
											fillOpacity={1}
											fill='url(#colorValue)'
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
							<div className='mt-4 bg-emerald-50 p-3 rounded-lg border border-emerald-100'>
								<p className='text-[10px] font-bold text-emerald-800 uppercase mb-1'>
									Análise da IA:
								</p>
								<ul className='space-y-1'>
									{insightData.projection.map((p, i) => (
										<li
											key={i}
											className='text-xs text-emerald-700 flex justify-between'
										>
											<span>{p.month}:</span>
											<span className='italic'>{p.reason}</span>
										</li>
									))}
								</ul>
							</div>
						</Card>

						{/* Oportunidades e Eventos */}
						<div className='space-y-6'>
							<Card className='p-6 border-l-4 border-amber-400'>
								<h4 className='font-bold text-slate-700 mb-4 flex items-center gap-2'>
									<Lightbulb className='w-5 h-5 text-amber-500' /> Oportunidades
									de Venda
								</h4>
								<div className='space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2'>
									{insightData.opportunities.map((op, i) => (
										<div
											key={i}
											className='bg-amber-50/50 p-3 rounded-lg border border-amber-100 hover:border-amber-300 transition'
										>
											<div className='flex justify-between items-start'>
												<span className='text-xs font-bold bg-white px-2 py-1 rounded text-amber-600 border border-amber-100 shadow-sm'>
													{Utils.formatDateTime(op.date).split(" ")[0]}
												</span>
											</div>
											<h5 className='font-bold text-slate-800 text-sm mt-2'>
												{op.title}
											</h5>
											<p className='text-xs text-slate-600 mt-1 leading-relaxed'>
												{op.description}
											</p>
										</div>
									))}
								</div>
							</Card>

							<Card className='p-6 border-l-4 border-blue-400'>
								<h4 className='font-bold text-slate-700 mb-4 flex items-center gap-2'>
									<MapPin className='w-5 h-5 text-blue-500' /> Eventos Locais
									(Recife)
								</h4>
								<ul className='space-y-2'>
									{insightData.calendar_events.map((evt, i) => (
										<li
											key={i}
											className='flex items-center gap-3 text-sm text-slate-600 border-b border-slate-50 last:border-0 pb-2'
										>
											<Calendar className='w-4 h-4 text-blue-400' />
											<span className='font-mono text-xs font-bold text-slate-400'>
												{Utils.formatDateTime(evt.date).split(" ")[0]}
											</span>
											<span className='truncate'>{evt.event}</span>
										</li>
									))}
								</ul>
							</Card>
						</div>
					</div>
				) : (
					<div className='bg-slate-100 rounded-xl p-12 text-center border-2 border-dashed border-slate-300'>
						<Sparkles className='w-12 h-12 text-slate-300 mx-auto mb-3' />
						<h4 className='text-slate-500 font-bold'>
							Nenhuma análise gerada ainda
						</h4>
						<p className='text-sm text-slate-400 mt-1'>
							Clique no botão "Gerar Análise" acima para que a IA processe o
							histórico e busque eventos.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};