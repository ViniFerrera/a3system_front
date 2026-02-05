import React, { useRef, useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Utils } from "@/utils";
import { PriceRule } from "@/types";
import { Upload, Download, Filter, Save, FileSpreadsheet } from "lucide-react";
import { api } from "@/services/api";
import * as XLSX from "xlsx";

export const PricingModule = ({
	data,
	setData,
}: {
	data: PriceRule[];
	setData: React.Dispatch<React.SetStateAction<PriceRule[]>>;
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [hasChanges, setHasChanges] = useState(false);
	const [filters, setFilters] = useState({
		servico: "",
		material: "",
		papel: "",
		cor: "",
	});

	// --- CORREÇÃO: BUSCA AUTOMÁTICA (Fail-safe) ---
	// Se o componente carregar e a lista estiver vazia (ex: F5), busca os dados diretamente.
	useEffect(() => {
		if (!data || data.length === 0) {
			api
				.get("/pricing")
				.then((res) => {
					if (Array.isArray(res.data)) {
						setData(res.data);
					}
				})
				.catch((err) =>
					console.error("Erro ao carregar tabela de preços:", err)
				);
		}
	}, []); // Executa apenas uma vez na montagem

	// --- NOVA LÓGICA: EXPORTAR TABELA ATUAL (XLSX) ---

	const handleExportTable = () => {
		// Define a ordem exata das colunas solicitada
		const headers = [
			"Servico",
			"Material",
			"Papel",
			"Especificacao",
			"Cor",
			"Min_Faixa",
			"Max_Faixa",
			"Valor_Cliente",
		];

		// Mapeia os dados atuais do estado para o formato de exportação
		const exportData = data.map((item) => ({
			Servico: item.Servico,
			Material: item.Material,
			Papel: item.Papel,
			Especificacao: item.Gramatura || "", // Mapeia Gramatura visual para coluna Especificacao
			Cor: item.Cor,
			Min_Faixa: item._min || 0,
			Max_Faixa: item._max || 0,
			Valor_Cliente: item.Valor_Cliente,
		}));

		// Cria a planilha garantindo a ordem dos cabeçalhos
		const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Tabela de Preços");

		// Baixa o arquivo
		XLSX.writeFile(wb, "Tabela_Precos_Export.xlsx");
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (evt) => {
			const bstr = evt.target?.result;
			const wb = XLSX.read(bstr, { type: "binary" });
			const wsname = wb.SheetNames[0];
			const ws = wb.Sheets[wsname];

			// Converte para JSON
			const rawData = XLSX.utils.sheet_to_json(ws);

			// Mapeia para o formato PriceRule do sistema
			const parsed: PriceRule[] = rawData.map((row: any) => ({
				id: Date.now() + Math.random(),
				Servico: row.Servico || row.servico || "Indefinido",
				Material: row.Material || row.material || "Indefinido",
				Papel: row.Papel || row.papel || "Indefinido",
				Cor: row.Cor || row.cor || "4x0",
				// Aceita tanto a coluna Especificacao quanto Gramatura na importação para manter compatibilidade
				Gramatura:
					row.Especificacao ||
					row.especificacao ||
					row.Gramatura ||
					row.gramatura ||
					"",
				Valor_Cliente: Number(row.Valor_Cliente || row.valor_cliente || 0),
				valorOriginal: Number(row.Valor_Cliente || row.valor_cliente || 0),
				lucroPct: 0,
				_min: Number(row.Min_Faixa || row.min_faixa || 0),
				_max: Number(row.Max_Faixa || row.max_faixa || 0),
				_isRange: row.Min_Faixa || row.Max_Faixa ? true : false,
				Especificacao: row.Especificacao || row.Gramatura || "",
			}));

			try {
				await api.post("/pricing/import", parsed);
				setData(parsed);
				alert(`${parsed.length} regras de preço importadas com sucesso.`);
				setHasChanges(false);
				if (fileInputRef.current) fileInputRef.current.value = "";
			} catch (error) {
				console.error(error);
				alert(
					"Erro ao importar a tabela de preços. Verifique o formato do arquivo."
				);
			}
		};
		reader.readAsBinaryString(file);
	};

	// --- LÓGICA DE EDIÇÃO E FILTROS ---

	const handleProfitChange = (id: number, pct: string) => {
		const percentage = parseFloat(pct) || 0;
		setData((prev) =>
			prev.map((item) => {
				if (item.id === id) {
					const base = item.valorOriginal || item.Valor_Cliente;
					const newPrice = base * (1 + percentage / 100);
					setHasChanges(true);
					return { ...item, lucroPct: percentage, Valor_Cliente: newPrice };
				}
				return item;
			})
		);
	};

	const handleFieldChange = (
		id: number,
		field: string,
		value: string | number
	) => {
		setData((prev) =>
			prev.map((item) => {
				if (item.id === id) {
					const updated = { ...item, [field]: value };
					if (field === "lucroPct") {
						const pct = Number(value);
						const base = item.valorOriginal || item.Valor_Cliente;
						updated.Valor_Cliente = base * (1 + pct / 100);
					}
					setHasChanges(true);
					return updated;
				}
				return item;
			})
		);
	};

	const handleSaveChanges = async () => {
		try {
			await api.post("/pricing/import", data);
			setHasChanges(false);
			alert("Alterações salvas com sucesso!");
		} catch (error) {
			alert("Erro ao salvar alterações.");
		}
	};

	const uniqueOptions = useMemo(() => {
		return {
			servico: [...new Set(data.map((i) => i.Servico))].filter(Boolean),
			material: [...new Set(data.map((i) => i.Material))].filter(Boolean),
			papel: [...new Set(data.map((i) => i.Papel))].filter(Boolean),
			cor: [...new Set(data.map((i) => i.Cor))].filter(Boolean),
		};
	}, [data]);

	const filteredData = useMemo(() => {
		return data.filter((item) => {
			return (
				(!filters.servico || item.Servico === filters.servico) &&
				(!filters.material || item.Material === filters.material) &&
				(!filters.papel || item.Papel === filters.papel) &&
				(!filters.cor || item.Cor === filters.cor)
			);
		});
	}, [data, filters]);

	return (
		<div className='space-y-6'>
			<div className='flex flex-col md:flex-row justify-between items-center gap-4'>
				<div>
					<h2 className='text-2xl font-bold text-slate-800'>
						Tabela de Preços
					</h2>
					<p className='text-xs text-slate-500 mt-1'>
						Gerencie as regras de cobrança por serviço, material e cor.
					</p>
				</div>

				<div className='flex gap-2 w-full md:w-auto'>
					{/* Botão de Exportar Tabela */}
					<button
						onClick={handleExportTable}
						className='flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-[10px] hover:bg-slate-50 transition shadow-sm text-sm font-medium w-full md:w-auto'
					>
						<FileSpreadsheet className='w-4 h-4 text-emerald-600' /> Exportar
						tabela
					</button>

					<input
						type='file'
						ref={fileInputRef}
						onChange={handleFileUpload}
						className='hidden'
						accept='.xlsx, .xls'
					/>

					<button
						onClick={() => fileInputRef.current?.click()}
						className='flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-[10px] hover:bg-slate-900 transition shadow-sm text-sm font-medium w-full md:w-auto'
					>
						<Upload className='w-4 h-4' /> Importar Excel
					</button>

					{hasChanges && (
						<button
							onClick={handleSaveChanges}
							className='flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-[10px] hover:bg-green-700 transition shadow-sm text-sm font-bold animate-in fade-in zoom-in w-full md:w-auto'
						>
							<Save className='w-4 h-4' /> Salvar
						</button>
					)}
				</div>
			</div>

			<Card className='p-5'>
				<div className='flex items-center gap-2 mb-4 text-slate-500 font-bold text-xs uppercase tracking-wider'>
					<Filter className='w-4 h-4' /> Filtros
				</div>
				<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
					{["servico", "material", "papel", "cor"].map((key) => (
						<div key={key}>
							<label className='block text-[10px] font-bold text-slate-400 uppercase mb-1'>
								{key}
							</label>
							<select
								className='border border-slate-200 p-2.5 rounded-[10px] text-sm w-full bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-colors'
								value={(filters as any)[key]}
								onChange={(e) =>
									setFilters((prev) => ({ ...prev, [key]: e.target.value }))
								}
							>
								<option value=''>Todos</option>
								{(uniqueOptions as any)[key].map((o: string) => (
									<option key={o} value={o}>
										{o}
									</option>
								))}
							</select>
						</div>
					))}
				</div>
				{Object.values(filters).some(Boolean) && (
					<div className='flex justify-end mt-4'>
						<button
							onClick={() =>
								setFilters({ servico: "", material: "", papel: "", cor: "" })
							}
							className='text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wide border border-red-100 bg-red-50 px-3 py-1.5 rounded-[8px]'
						>
							Limpar Filtros
						</button>
					</div>
				)}
			</Card>

			<Card className='overflow-hidden border border-slate-200'>
				<div className='overflow-x-auto max-h-[600px] custom-scrollbar'>
					<table className='w-full text-left text-sm text-slate-600 min-w-[1000px]'>
						<thead className='bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px] uppercase tracking-wider'>
							<tr>
								<th className='p-4'>Serviço</th>
								<th className='p-4'>Material</th>
								<th className='p-4'>Papel</th>
								<th className='p-4'>Especificação</th>
								<th className='p-4'>Cor</th>
								<th className='p-4 w-24 text-center'>Min (Qtd)</th>
								<th className='p-4 w-24 text-center'>Max (Qtd)</th>
								<th className='p-4 w-32'>Margem (%)</th>
								<th className='p-4 text-right'>Preço Final</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-slate-100'>
							{filteredData.map((row) => (
								<tr
									key={row.id}
									className='hover:bg-indigo-50/30 transition duration-150 group'
								>
									<td className='p-4 font-bold text-slate-800'>
										{row.Servico}
									</td>
									<td className='p-4'>{row.Material}</td>
									<td className='p-4'>
										<span className='bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium'>
											{row.Papel}
										</span>
									</td>
									<td className='p-4 text-xs'>{row.Gramatura || "-"}</td>
									<td className='p-4'>{row.Cor}</td>
									<td className='p-4 text-center'>
										<input
											type='number'
											className='w-16 border border-slate-200 rounded-[6px] px-1 py-1 text-center bg-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none'
											value={row._min}
											onChange={(e) =>
												row.id &&
												handleFieldChange(
													row.id,
													"_min",
													Number(e.target.value)
												)
											}
										/>
									</td>
									<td className='p-4 text-center'>
										<input
											type='number'
											className='w-16 border border-slate-200 rounded-[6px] px-1 py-1 text-center bg-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none'
											value={row._max}
											onChange={(e) =>
												row.id &&
												handleFieldChange(
													row.id,
													"_max",
													Number(e.target.value)
												)
											}
										/>
									</td>
									<td className='p-4'>
										<div className='flex items-center gap-1 group'>
											<input
												type='number'
												min='0'
												className='w-16 border border-slate-200 rounded-[6px] p-1.5 text-center bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700'
												value={row.lucroPct}
												onChange={(e) =>
													row.id && handleProfitChange(row.id, e.target.value)
												}
											/>
											<span className='text-slate-400 text-xs font-medium'>
												%
											</span>
										</div>
									</td>
									<td className='p-4 text-right'>
										<div className='flex flex-col items-end'>
											<span className='font-bold text-slate-800 text-base'>
												{Utils.formatCurrency(row.Valor_Cliente)}
											</span>
											{(row.lucroPct || 0) > 0 && (
												<span className='text-[10px] text-slate-400 line-through'>
													{Utils.formatCurrency(row.valorOriginal || 0)}
												</span>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	);
};
