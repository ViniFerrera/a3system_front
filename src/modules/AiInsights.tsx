import React, { useState } from "react";
import Markdown from "react-markdown";
import { Card } from "@/components/ui/Card";
import {
	Button,
	DataTable,
	TableHead,
	Textarea,
	Th,
	useToast,
} from "@/components/ui";
import {
	Bot,
	Send,
	Sparkles,
	TrendingUp,
	Calendar,
	MapPin,
	Lightbulb,
	ArrowRight,
	Clock,
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

const PERIOD_OPTIONS = [
	{ label: "7 dias", value: 7 },
	{ label: "15 dias", value: 15 },
	{ label: "1 mês", value: 30 },
	{ label: "3 meses", value: 90 },
	{ label: "6 meses", value: 180 },
	{ label: "1 ano", value: 365 },
	{ label: "Tudo", value: 0 },
];

export const AiInsightsModule = () => {
	const toast = useToast();
	// --- ESTADOS DO CHAT ---
	const [chatInput, setChatInput] = useState("");
	const [chatResponse, setChatResponse] = useState("");
	const [isChatLoading, setIsChatLoading] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState(90); // padrão: 3 meses

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
		setChatInput(message);
		try {
			const res = await api.post("/ai/chat", {
				message,
				periodDays: selectedPeriod || undefined,
			});
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
			toast.error("Erro ao gerar insights visuais.");
		} finally {
			setIsInsightsLoading(false);
		}
	};

	return (
		<div className='space-y-8 pb-12 animate-in fade-in duration-500'>
			{/* CABEÇALHO */}
			<div className='flex items-center gap-3 border-b border-slate-200 pb-4'>
				<div className='bg-gradient-to-br from-primary-500 to-purple-600 p-3 rounded-xl shadow-lg shadow-primary-200 text-white'>
					<Bot className='w-8 h-8' />
				</div>
				<div>
					<h2 className='text-2xl font-bold text-ink'>
						Consultor Inteligente (IA)
					</h2>
					<p className='text-ink-muted text-sm'>
						Analise dados, projete cenários e descubra oportunidades em Recife.
					</p>
				</div>
			</div>

			{/* SEÇÃO 1: CHAT INTERATIVO */}
			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				{/* Coluna Esquerda: Input e Histórico */}
				<Card className='lg:col-span-1 p-6 flex flex-col h-full border-primary-100 bg-surface-sunken/50'>
					{/* Seletor de período — os valores alimentam `periodDays` da rota de chat. */}
					<label className='text-xs font-bold text-ink-muted uppercase mb-1.5 flex items-center gap-1.5'>
						<Clock className='w-3 h-3' /> Período de análise
					</label>
					<div className='flex flex-wrap gap-1.5 mb-4'>
						{PERIOD_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type='button'
								onClick={() => setSelectedPeriod(opt.value)}
								className={`num px-2.5 py-1 rounded-lg text-2xs font-semibold transition-all ${
									selectedPeriod === opt.value
										? "bg-primary-600 text-white shadow-sm shadow-primary-200"
										: "bg-white text-ink-muted border border-slate-200 hover:border-primary-300 hover:text-primary-600"
								}`}
							>
								{opt.label}
							</button>
						))}
					</div>

					<label className='text-xs font-bold text-primary-600 uppercase mb-2 flex items-center gap-2'>
						<Sparkles className='w-3 h-3' /> Faça uma pergunta
					</label>
					<div className='relative'>
						{/* `!` obrigatório: `h-auto` e o padding do kit vencem os do uso. */}
						<Textarea
							value={chatInput}
							onChange={(e) => setChatInput(e.target.value)}
							placeholder='Ex: Como aumentar o lucro com encadernação?'
							className='!h-32 !p-4 !pr-12 resize-none shadow-sm'
						/>
						<Button
							size='sm'
							onClick={() => handleSendChat(chatInput)}
							loading={isChatLoading}
							disabled={!chatInput}
							className='absolute bottom-3 right-3 !px-2'
							icon={<Send className='w-4 h-4' />}
							title='Enviar pergunta'
						/>
					</div>

					<div className='mt-6 space-y-2'>
						<p className='text-2xs font-bold text-ink-faint uppercase'>
							Sugestões Rápidas
						</p>
						{suggestions.map((s) => (
							<button
								key={s}
								type='button'
								onClick={() => handleSendChat(s)}
								className='w-full text-left text-xs text-ink-muted bg-white p-2.5 rounded-[8px] border border-slate-200 hover:border-primary-300 hover:text-primary-600 transition flex items-center justify-between group'
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
						<Bot className='w-64 h-64 text-primary-900' />
					</div>
					<h3 className='text-lg font-bold text-ink mb-4 flex items-center gap-2'>
						Resposta da IA
					</h3>
					{isChatLoading ? (
						<div className='flex flex-col items-center justify-center h-64 text-ink-faint gap-3 animate-pulse'>
							<Bot className='w-12 h-12 text-primary-300' />
							<p className='text-sm'>Analisando dados da empresa e mercado...</p>
						</div>
					) : chatResponse ? (
						<div className='prose prose-sm prose-indigo max-w-none text-ink-muted bg-white/50 p-4 rounded-xl border border-slate-200/60 shadow-card overflow-y-auto max-h-[60vh]'>
							<Markdown
								components={{
									h1: ({ children }) => <h1 className="text-xl font-bold text-ink mt-4 mb-2">{children}</h1>,
									h2: ({ children }) => <h2 className="text-lg font-bold text-ink mt-4 mb-2">{children}</h2>,
									h3: ({ children }) => <h3 className="text-base font-bold text-primary-700 mt-3 mb-1.5">{children}</h3>,
									h4: ({ children }) => <h4 className="text-sm font-bold text-ink mt-2 mb-1">{children}</h4>,
									p: ({ children }) => <p className="mb-2 leading-relaxed text-sm text-ink-muted">{children}</p>,
									ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
									ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
									li: ({ children }) => <li className="text-sm text-ink-muted leading-relaxed">{children}</li>,
									strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
									em: ({ children }) => <em className="italic text-primary-600">{children}</em>,
									blockquote: ({ children }) => <blockquote className="border-l-4 border-primary-300 pl-3 my-2 italic text-ink-muted bg-primary-50/50 py-2 rounded-r-lg">{children}</blockquote>,
									code: ({ children }) => <code className="bg-slate-100 text-primary-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
									table: ({ children }) => <DataTable className="my-3">{children}</DataTable>,
									thead: ({ children }) => <TableHead>{children}</TableHead>,
									th: ({ children }) => <Th>{children}</Th>,
									td: ({ children }) => <td className="p-2 border-b border-slate-100 text-ink-muted">{children}</td>,
									hr: () => <hr className="my-4 border-slate-200" />,
								}}
							>
								{chatResponse}
							</Markdown>
						</div>
					) : (
						<div className='flex flex-col items-center justify-center h-64 text-ink-faint gap-2 opacity-50'>
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
						<h3 className='text-xl font-bold text-ink flex items-center gap-2'>
							<TrendingUp className='w-6 h-6 text-success-600' /> Painel
							Estratégico
						</h3>
						<p className='text-sm text-ink-muted mt-1'>
							Projeções e calendário de oportunidades gerados pela IA.
						</p>
					</div>
					{/* Mantém o verde original: o kit não tem variante "success". */}
					<Button
						onClick={handleRefreshInsights}
						loading={isInsightsLoading}
						icon={<Sparkles className='w-4 h-4' />}
						className='!bg-success-600 hover:!bg-success-700 !shadow-success-200'
					>
						{insightData ? "Atualizar Análise" : "Gerar Análise"}
					</Button>
				</div>

				{insightData ? (
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500'>
						{/* Gráfico de Projeção */}
						<Card className='p-6'>
							<h4 className='font-bold text-ink mb-1 flex items-center gap-2'>
								Projeção de Faturamento (3 Meses)
							</h4>
							<p className='text-xs text-ink-faint mb-6'>
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
							<div className='mt-4 bg-success-50 p-3 rounded-lg border border-success-100'>
								<p className='text-2xs font-bold text-success-700 uppercase mb-1'>
									Análise da IA:
								</p>
								<ul className='space-y-1'>
									{insightData.projection.map((p, i) => (
										<li
											key={i}
											className='text-xs text-success-700 flex justify-between'
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
							<Card className='p-6 border-l-4 border-warning-400'>
								<h4 className='font-bold text-ink mb-4 flex items-center gap-2'>
									<Lightbulb className='w-5 h-5 text-warning-500' /> Oportunidades
									de Venda
								</h4>
								<div className='space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2'>
									{insightData.opportunities.map((op, i) => (
										<div
											key={i}
											className='bg-warning-50/50 p-3 rounded-lg border border-warning-100 hover:border-warning-300 transition'
										>
											<div className='flex justify-between items-start'>
												<span className='num text-xs font-bold bg-white px-2 py-1 rounded text-warning-600 border border-warning-100 shadow-sm'>
													{Utils.formatDateTime(op.date).split(" ")[0]}
												</span>
											</div>
											<h5 className='font-bold text-ink text-sm mt-2'>
												{op.title}
											</h5>
											<p className='text-xs text-ink-muted mt-1 leading-relaxed'>
												{op.description}
											</p>
										</div>
									))}
								</div>
							</Card>

							<Card className='p-6 border-l-4 border-info-400'>
								<h4 className='font-bold text-ink mb-4 flex items-center gap-2'>
									<MapPin className='w-5 h-5 text-info-500' /> Eventos Locais
									(Recife)
								</h4>
								<ul className='space-y-2'>
									{insightData.calendar_events.map((evt, i) => (
										<li
											key={i}
											className='flex items-center gap-3 text-sm text-ink-muted border-b border-slate-50 last:border-0 pb-2'
										>
											<Calendar className='w-4 h-4 text-info-400' />
											<span className='num text-xs font-bold text-ink-faint'>
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
						<Sparkles className='w-12 h-12 text-ink-faint/60 mx-auto mb-3' />
						<h4 className='text-ink-muted font-bold'>
							Nenhuma análise gerada ainda
						</h4>
						<p className='text-sm text-ink-faint mt-1'>
							Clique no botão "Gerar Análise" acima para que a IA processe o
							histórico e busque eventos.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
