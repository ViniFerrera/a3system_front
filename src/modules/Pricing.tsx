import React, { useRef, useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import {
	Button,
	DataTable,
	Field,
	Input,
	PageHeader,
	Select,
	TableHead,
	Th,
	useToast,
} from "@/components/ui";
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
	const toast = useToast();
	const [hasChanges, setHasChanges] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
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

		setIsImporting(true);
		const reader = new FileReader();
		// Falha de leitura também precisa devolver o botão ao estado normal.
		reader.onerror = () => {
			setIsImporting(false);
			toast.error("Não foi possível ler o arquivo selecionado.");
		};
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
				toast.success(
					`${parsed.length} regras de preço importadas com sucesso.`
				);
				setHasChanges(false);
				if (fileInputRef.current) fileInputRef.current.value = "";
			} catch (error) {
				console.error(error);
				toast.error(
					"Erro ao importar a tabela de preços. Verifique o formato do arquivo."
				);
			} finally {
				setIsImporting(false);
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
		setIsSaving(true);
		try {
			await api.post("/pricing/import", data);
			setHasChanges(false);
			toast.success("Alterações salvas com sucesso!");
		} catch (error) {
			toast.error("Erro ao salvar alterações.");
		} finally {
			setIsSaving(false);
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
			<PageHeader
				title='Tabela de Preços'
				subtitle='Gerencie as regras de cobrança por serviço, material e cor.'
				actions={
					<>
						{/* Botão de Exportar Tabela */}
						<Button
							variant='secondary'
							onClick={handleExportTable}
							icon={<FileSpreadsheet className='w-4 h-4 text-success-600' />}
						>
							Exportar tabela
						</Button>

						<input
							type='file'
							ref={fileInputRef}
							onChange={handleFileUpload}
							className='hidden'
							accept='.xlsx, .xls'
						/>

						<Button
							variant='secondary'
							onClick={() => fileInputRef.current?.click()}
							loading={isImporting}
							icon={<Upload className='w-4 h-4' />}
						>
							Importar Excel
						</Button>

						{hasChanges && (
							<Button
								onClick={handleSaveChanges}
								loading={isSaving}
								icon={<Save className='w-4 h-4' />}
								className='animate-in fade-in zoom-in'
							>
								Salvar
							</Button>
						)}
					</>
				}
			/>

			<Card className='p-5'>
				<div className='flex items-center gap-2 mb-4 text-ink-muted font-bold text-xs uppercase tracking-wider'>
					<Filter className='w-4 h-4' /> Filtros
				</div>
				<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
					{["servico", "material", "papel", "cor"].map((key) => (
						<Field key={key} label={key}>
							{/* `!` obrigatório: `bg-white` do kit vence `bg-surface-sunken` na cascata. */}
							<Select
								className='!bg-surface-sunken focus:!bg-white'
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
							</Select>
						</Field>
					))}
				</div>
				{Object.values(filters).some(Boolean) && (
					<div className='flex justify-end mt-4'>
						<Button
							variant='ghost'
							size='sm'
							onClick={() =>
								setFilters({ servico: "", material: "", papel: "", cor: "" })
							}
							className='!text-danger-600 hover:!text-danger-700 hover:!bg-danger-50 border !border-danger-100 !bg-danger-50 uppercase tracking-wide'
						>
							Limpar Filtros
						</Button>
					</div>
				)}
			</Card>

			<DataTable
				isEmpty={filteredData.length === 0}
				emptyTitle='Nenhuma regra de preço encontrada'
				emptyDescription='Importe a planilha de preços ou ajuste os filtros acima.'
				emptyIcon={<Download className='w-10 h-10' />}
				maxHeight='600px'
			>
				<TableHead>
					<tr>
						{/* Larguras mínimas por coluna substituem o antigo min-w-[1000px] da <table>. */}
						<Th className='min-w-[150px]'>Serviço</Th>
						<Th className='min-w-[130px]'>Material</Th>
						<Th className='min-w-[110px]'>Papel</Th>
						<Th className='min-w-[120px]'>Especificação</Th>
						<Th className='min-w-[90px]'>Cor</Th>
						<Th align='center' className='w-24 min-w-[96px]'>
							Min (Qtd)
						</Th>
						<Th align='center' className='w-24 min-w-[96px]'>
							Max (Qtd)
						</Th>
						<Th className='w-32 min-w-[110px]'>Margem (%)</Th>
						<Th align='right' className='min-w-[120px]'>
							Preço Final
						</Th>
					</tr>
				</TableHead>
				<tbody className='divide-y divide-slate-100 text-ink-muted'>
					{filteredData.map((row) => (
						<tr
							key={row.id}
							className='hover:bg-primary-50/30 transition duration-150 group'
						>
							<td className='p-4 font-bold text-ink'>{row.Servico}</td>
							<td className='p-4'>{row.Material}</td>
							<td className='p-4'>
								<span className='bg-slate-100 text-ink-muted px-2 py-0.5 rounded text-xs font-medium'>
									{row.Papel}
								</span>
							</td>
							<td className='p-4 text-xs'>{row.Gramatura || "-"}</td>
							<td className='p-4'>{row.Cor}</td>
							<td className='p-4 text-center'>
								{/* `!` obrigatório: `w-full`/`h-9` do kit venceriam a largura de célula. */}
								<Input
									type='number'
									className='!w-16 !h-8 !px-1 text-center !text-xs num'
									value={row._min}
									onChange={(e) =>
										row.id &&
										handleFieldChange(row.id, "_min", Number(e.target.value))
									}
								/>
							</td>
							<td className='p-4 text-center'>
								<Input
									type='number'
									className='!w-16 !h-8 !px-1 text-center !text-xs num'
									value={row._max}
									onChange={(e) =>
										row.id &&
										handleFieldChange(row.id, "_max", Number(e.target.value))
									}
								/>
							</td>
							<td className='p-4'>
								<div className='flex items-center gap-1 group'>
									<Input
										type='number'
										min='0'
										className='!w-16 !h-8 !px-1 text-center !text-xs font-bold num'
										value={row.lucroPct}
										onChange={(e) =>
											row.id && handleProfitChange(row.id, e.target.value)
										}
									/>
									<span className='text-ink-faint text-xs font-medium'>%</span>
								</div>
							</td>
							<td className='p-4 text-right'>
								<div className='flex flex-col items-end'>
									<span className='num font-bold text-ink text-base'>
										{Utils.formatCurrency(row.Valor_Cliente)}
									</span>
									{(row.lucroPct || 0) > 0 && (
										<span className='num text-2xs text-ink-faint line-through'>
											{Utils.formatCurrency(row.valorOriginal || 0)}
										</span>
									)}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</DataTable>
		</div>
	);
};
