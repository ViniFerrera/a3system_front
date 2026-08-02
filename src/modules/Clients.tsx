import React, { useState, useMemo, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import {
	Button,
	DataTable,
	Field,
	Input,
	PageHeader,
	SegmentedControl,
	TableHead,
	Textarea,
	Th,
	useConfirm,
	useToast,
} from "@/components/ui";
import { Client, Order } from "@/types";
import { Utils } from "@/utils";
import * as XLSX from "xlsx";
import {
	Plus,
	Search,
	Edit2,
	Trash2,
	Mail,
	Phone,
	Copy,
	Building2,
	Download,
	Upload,
	Users,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
} from "lucide-react";
import { api } from "@/services/api";

type SortKey = "nome" | "ordens" | "receita";

/** Cabeçalho de coluna clicável, com seta indicando a ordenação ativa. */
const SortButton = ({
	label,
	active,
	dir,
	onClick,
	align = "left",
}: {
	label: string;
	active: boolean;
	dir: "asc" | "desc";
	onClick: () => void;
	align?: "left" | "right";
}) => (
	<button
		type='button'
		onClick={onClick}
		className={`inline-flex items-center gap-1 hover:text-ink transition-colors ${
			align === "right" ? "flex-row-reverse" : ""
		} ${active ? "text-ink" : ""}`}
	>
		{label}
		{active ? (
			dir === "asc" ? <ArrowUp className='w-3 h-3' /> : <ArrowDown className='w-3 h-3' />
		) : (
			<ArrowUpDown className='w-3 h-3 opacity-40' />
		)}
	</button>
);

export const ClientsModule = ({
	clients,
	setClients,
	orders,
	quickAction,
}: {
	clients: Client[];
	setClients: Function;
	/** Só para as colunas informativas (nº de ordens, receita) — não é editado aqui. */
	orders: Order[];
	quickAction?: { tab: string; action: string; nonce: number } | null;
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const toast = useToast();
	const confirm = useConfirm();
	const [searchTerm, setSearchTerm] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingClient, setEditingClient] = useState<Client | null>(null);
	const [formData, setFormData] = useState<Partial<Client>>({ tipo: "PF" });
	const [isSaving, setIsSaving] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [sortKey, setSortKey] = useState<SortKey>("nome");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

	// CORREÇÃO (BUG TELA BRANCA): Tratamento seguro para strings nulas
	const filteredClients = useMemo(() => {
		const term = searchTerm.toLowerCase();
		return clients.filter(
			(c) =>
				(c.nome || "").toLowerCase().includes(term) ||
				(c.email || "").toLowerCase().includes(term) ||
				(c.cpf_cnpj || "").includes(term) ||
				(c.telefone || "").includes(term) || // Pesquisa por Telefone
				String(c.id).includes(term) // Pesquisa por ID
		);
	}, [clients, searchTerm]);

	// Nº de ordens e receita por cliente — informativo, não editável aqui.
	// Canceladas ficam fora de propósito: mesmo critério que o Dashboard usa
	// para "volume" e "receita" real, senão os dois números soariam inflados.
	const clientStats = useMemo(() => {
		const map = new Map<number, { ordens: number; receita: number }>();
		orders.forEach((o) => {
			if (o.status === "CANCELADA") return;
			const cur = map.get(o.cliente_id) || { ordens: 0, receita: 0 };
			cur.ordens += 1;
			cur.receita += o.total || 0;
			map.set(o.cliente_id, cur);
		});
		return map;
	}, [orders]);

	const sortedClients = useMemo(() => {
		const withStats = filteredClients.map((c) => ({
			client: c,
			stats: clientStats.get(Number(c.id)) || { ordens: 0, receita: 0 },
		}));
		const dir = sortDir === "asc" ? 1 : -1;
		withStats.sort((a, b) => {
			if (sortKey === "nome") return (a.client.nome || "").localeCompare(b.client.nome || "") * dir;
			if (sortKey === "ordens") return (a.stats.ordens - b.stats.ordens) * dir;
			return (a.stats.receita - b.stats.receita) * dir;
		});
		return withStats;
	}, [filteredClients, clientStats, sortKey, sortDir]);

	const alternarOrdenacao = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir(key === "nome" ? "asc" : "desc");
		}
	};

	const copiarEmail = async (email: string) => {
		try {
			await navigator.clipboard.writeText(email);
			toast.success("E-mail copiado.");
		} catch {
			toast.error("Não foi possível copiar.");
		}
	};

	const normalizeKey = (key: string) =>
		key
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim();

	const handleExportExcel = () => {
		const rows = clients.map((c) => ({
			Tipo: c.tipo || "",
			Nome: c.nome || "",
			Email: c.email || "",
			Telefone: c.telefone || "",
			CPF_CNPJ: c.cpf_cnpj || "",
			CEP: c.cep || "",
			Endereco: c.endereco || "",
			Numero: c.numero || "",
			Complemento: c.complemento || "",
			Indicador_Municipal: c.indicador_municipal || "",
			Observacoes: c.observacoes || "",
		}));
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(rows);
		XLSX.utils.book_append_sheet(wb, ws, "Clientes");
		XLSX.writeFile(wb, "clientes.xlsx");
	};

	const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsImporting(true);
		const reader = new FileReader();
		reader.onload = async (evt) => {
			try {
				const bstr = evt.target?.result;
				const workbook = XLSX.read(bstr, { type: "binary" });
				const wsname = workbook.SheetNames[0];
				const ws = workbook.Sheets[wsname];
				const rawData = XLSX.utils.sheet_to_json(ws);

				const normalizedData = rawData.map((row: any) => {
					const getValue = (possibleKeys: string[]) => {
						const rowKeys = Object.keys(row);
						const foundKey = rowKeys.find((k) =>
							possibleKeys.includes(normalizeKey(k))
						);
						return foundKey ? row[foundKey] : undefined;
					};

					return {
						tipo: getValue(["tipo", "type", "pessoa"]) || "PF",
						nome: getValue(["nome", "name", "razao social", "razao"]) || "Cliente Importado",
						email: getValue(["email", "e-mail"]) || "",
						telefone: getValue(["telefone", "tel", "phone", "fone"]) || "",
						cpf_cnpj: getValue(["cpf_cnpj", "cpf", "cnpj", "documento", "doc"]) || "",
						cep: getValue(["cep", "zip"]) || "",
						endereco: getValue(["endereco", "logradouro", "rua", "address"]) || "",
						numero: getValue(["numero", "num", "nro"]) || "",
						complemento: getValue(["complemento", "compl"]) || "",
						indicador_municipal: getValue(["indicador_municipal", "inscricao municipal", "im"]) || "",
						observacoes: getValue(["observacoes", "obs", "observacao", "notas"]) || "",
					};
				});

				if (normalizedData.length > 0) {
					const promises = normalizedData.map((item) => api.post("/clients", item));
					await Promise.all(promises);
					const res = await api.get("/clients");
					setClients(res.data);
					toast.success(`${normalizedData.length} clientes importados com sucesso.`);
				} else {
					toast.error("O arquivo parece estar vazio ou ilegível.");
				}
			} catch (err) {
				console.error(err);
				toast.error("Erro ao importar arquivo Excel.");
			} finally {
				setIsImporting(false);
			}
		};
		// Sem isto, uma falha de leitura deixaria o botão preso em "carregando".
		reader.onerror = () => {
			setIsImporting(false);
			toast.error("Erro ao ler o arquivo.");
		};
		reader.readAsBinaryString(file);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSave = async () => {
		// CORREÇÃO: Apenas Nome é obrigatório (Email removido da validação)
		if (!formData.nome) {
			toast.error("O Nome é obrigatório.");
			return;
		}
		setIsSaving(true);
		try {
			if (editingClient && editingClient.id) {
				const res = await api.put(`/clients/${editingClient.id}`, formData);
				setClients((prev: Client[]) =>
					prev.map((c) => (c.id === editingClient.id ? res.data : c))
				);
			} else {
				const res = await api.post("/clients", formData);
				setClients((prev: Client[]) => [...prev, res.data]);
			}
			setIsModalOpen(false);
			setEditingClient(null);
			setFormData({ tipo: "PF" });
			toast.success("Cliente salvo com sucesso.");
		} catch (err) {
			toast.error("Erro ao salvar cliente");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (id: number) => {
		const ok = await confirm({
			title: "Excluir cliente?",
			message: "Tem certeza que deseja excluir este cliente?",
			confirmLabel: "Excluir",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/clients/${id}`);
			setClients((prev: Client[]) => prev.filter((c) => c.id !== id));
			toast.success("Cliente excluído.");
		} catch (err) {
			toast.error("Erro ao excluir");
		}
	};

	const openModal = (client?: Client) => {
		if (client) {
			setEditingClient(client);
			setFormData(client);
		} else {
			setEditingClient(null);
			setFormData({ tipo: "PF" });
		}
		setIsModalOpen(true);
	};

	// Ação rápida vinda da gaveta de atalhos: abre o formulário em branco.
	useEffect(() => {
		if (quickAction?.tab === "clients" && quickAction.action === "new") openModal();
	}, [quickAction?.nonce]);

	return (
		<div className='space-y-4 sm:space-y-6'>
			<PageHeader
				title='Gestão de Clientes'
				subtitle={`${clients.length} cliente(s) cadastrado(s)`}
				actions={
					<>
						<Button
							variant='secondary'
							onClick={handleExportExcel}
							icon={<Download className='w-4 h-4' />}
						>
							Exportar
						</Button>
						<input
							type='file'
							ref={fileInputRef}
							onChange={handleImportExcel}
							className='hidden'
							accept='.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
						/>
						<Button
							variant='secondary'
							onClick={() => fileInputRef.current?.click()}
							loading={isImporting}
							icon={<Upload className='w-4 h-4' />}
						>
							Importar
						</Button>
						<Button onClick={() => openModal()} icon={<Plus className='w-4 h-4' />}>
							Novo Cliente
						</Button>
					</>
				}
			/>
			<div className='relative group'>
				<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint group-focus-within:text-primary-500 transition-colors z-10' />
				{/* `!` obrigatório: no CSS gerado `.h-9` do kit vem depois de `.h-11`. */}
				<Input
					type='text'
					placeholder='Buscar por nome, telefone, email ou documento...'
					className='!pl-10 !h-11'
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
			</div>
			<DataTable
				isEmpty={sortedClients.length === 0}
				emptyIcon={<Users className='w-10 h-10' />}
				emptyTitle='Nenhum cliente encontrado'
				emptyDescription={
					searchTerm
						? "Nenhum cliente corresponde à busca."
						: "Cadastre o primeiro cliente para começar."
				}
				maxHeight='max(420px, calc(100vh - 420px))'
			>
				<TableHead>
					<tr>
						<Th>
							<SortButton label='Cliente' active={sortKey === "nome"} dir={sortDir} onClick={() => alternarOrdenacao("nome")} />
						</Th>
						<Th className='hidden sm:table-cell'>Contato</Th>
						<Th align='right'>
							<SortButton label='Ordens' active={sortKey === "ordens"} dir={sortDir} onClick={() => alternarOrdenacao("ordens")} align='right' />
						</Th>
						<Th align='right' className='hidden md:table-cell'>
							<SortButton label='Receita' active={sortKey === "receita"} dir={sortDir} onClick={() => alternarOrdenacao("receita")} align='right' />
						</Th>
						<Th align='right'>Ação</Th>
					</tr>
				</TableHead>
				<tbody className='divide-y divide-slate-100/60'>
					{sortedClients.map(({ client, stats }) => (
						<tr key={client.id} className='hover:bg-slate-50/60 transition-colors'>
							<td className='px-3 py-3'>
								<div className='flex items-center gap-2.5'>
									<div
										className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
											client.tipo === "PJ"
												? "bg-purple-50 text-purple-600"
												: "bg-primary-50 text-primary-600"
										}`}
									>
										{client.tipo === "PJ" ? <Building2 className='w-4 h-4' /> : client.nome?.charAt(0)?.toUpperCase()}
									</div>
									<div className='min-w-0'>
										<p className='font-semibold text-ink text-sm truncate max-w-[220px]'>{client.nome}</p>
										<p className='num text-2xs text-ink-faint'>
											{client.tipo} · {client.cpf_cnpj || "sem documento"}
										</p>
									</div>
								</div>
								{/* Contato empilhado aqui abaixo do nome só no mobile, onde a
								    coluna própria (`hidden sm:table-cell`) está escondida. */}
								<div className='sm:hidden mt-2 space-y-1 pl-[46px]'>
									<p className='text-xs text-ink-muted truncate'>{client.email || "—"}</p>
									<p className='num text-xs text-ink-muted'>{client.telefone || "—"}</p>
								</div>
							</td>
							<td className='px-3 py-3 hidden sm:table-cell'>
								<div className='flex items-center gap-1.5 text-xs text-ink-muted'>
									<Mail className='w-3.5 h-3.5 text-ink-faint flex-shrink-0' />
									{client.email ? (
										<>
											<span className='truncate max-w-[160px]'>{client.email}</span>
											<button
												onClick={() => copiarEmail(client.email!)}
												className='text-ink-faint hover:text-primary-600 transition-colors flex-shrink-0'
												title='Copiar e-mail'
												aria-label='Copiar e-mail'
											>
												<Copy className='w-3 h-3' />
											</button>
										</>
									) : (
										<span className='text-ink-faint italic'>Não informado</span>
									)}
								</div>
								<div className='flex items-center gap-1.5 text-xs text-ink-muted mt-1'>
									<Phone className='w-3.5 h-3.5 text-ink-faint flex-shrink-0' />
									<span className='num'>{client.telefone || "N/A"}</span>
								</div>
							</td>
							<td className='px-3 py-3 text-right'>
								<span className='num text-sm font-semibold text-ink'>{stats.ordens}</span>
							</td>
							<td className='px-3 py-3 text-right hidden md:table-cell'>
								<span className='num text-sm font-bold text-ink'>
									{stats.receita > 0 ? Utils.formatCurrency(stats.receita) : "—"}
								</span>
							</td>
							<td className='px-3 py-3'>
								<div className='flex items-center justify-end gap-1'>
									<button
										onClick={() => openModal(client)}
										className='p-2 text-ink-faint hover:text-primary-600 hover:bg-surface-sunken rounded-[10px] transition-colors'
										title='Editar cliente'
									>
										<Edit2 className='w-4 h-4' />
									</button>
									<button
										onClick={() => client.id && handleDelete(client.id)}
										className='p-2 text-ink-faint hover:text-danger-600 hover:bg-danger-50 rounded-[10px] transition-colors'
										title='Excluir cliente'
									>
										<Trash2 className='w-4 h-4' />
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</DataTable>
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingClient ? "Editar Cliente" : "Novo Cliente"}
				size='lg'
			>
				<div className='space-y-5'>
					<SegmentedControl
						segments={[
							{ key: "PF", label: "Pessoa Física" },
							{ key: "PJ", label: "Pessoa Jurídica" },
						]}
						value={(formData.tipo as "PF" | "PJ") || "PF"}
						onChange={(tipo) => setFormData({ ...formData, tipo })}
						className='mb-2'
					/>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
						<Field
							label='Nome Completo / Razão Social'
							required
							className='md:col-span-2'
						>
							<Input
								type='text'
								value={formData.nome || ""}
								onChange={(e) =>
									setFormData({ ...formData, nome: e.target.value })
								}
							/>
						</Field>
						<Field label='E-mail'>
							<Input
								type='email'
								value={formData.email || ""}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
							/>
						</Field>
						<Field label='Telefone'>
							<Input
								type='text'
								value={formData.telefone || ""}
								onChange={(e) =>
									setFormData({ ...formData, telefone: e.target.value })
								}
							/>
						</Field>
					</div>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
						<Field label={formData.tipo === "PF" ? "CPF" : "CNPJ"}>
							<Input
								type='text'
								value={formData.cpf_cnpj || ""}
								onChange={(e) =>
									setFormData({ ...formData, cpf_cnpj: e.target.value })
								}
							/>
						</Field>
						{formData.tipo === "PJ" && (
							<Field label='Indicador Municipal'>
								<Input
									type='text'
									value={formData.indicador_municipal || ""}
									onChange={(e) =>
										setFormData({
											...formData,
											indicador_municipal: e.target.value,
										})
									}
								/>
							</Field>
						)}
					</div>
					<div className='pt-4 border-t border-slate-200/60'>
						<h4 className='text-2xs font-bold text-ink-faint uppercase tracking-widest mb-4'>
							Endereço
						</h4>
						<div className='grid grid-cols-1 md:grid-cols-6 gap-3'>
							<Field label='CEP' className='md:col-span-2'>
								<Input
									type='text'
									value={formData.cep || ""}
									onChange={(e) =>
										setFormData({ ...formData, cep: e.target.value })
									}
								/>
							</Field>
							<Field label='Logradouro' className='md:col-span-4'>
								<Input
									type='text'
									value={formData.endereco || ""}
									onChange={(e) =>
										setFormData({ ...formData, endereco: e.target.value })
									}
								/>
							</Field>
							<Field label='Número' className='md:col-span-2'>
								<Input
									type='text'
									value={formData.numero || ""}
									onChange={(e) =>
										setFormData({ ...formData, numero: e.target.value })
									}
								/>
							</Field>
							<Field label='Complemento' className='md:col-span-4'>
								<Input
									type='text'
									value={formData.complemento || ""}
									onChange={(e) =>
										setFormData({ ...formData, complemento: e.target.value })
									}
								/>
							</Field>
						</div>
					</div>
					<Field label='Observações' className='mt-5'>
						<Textarea
							rows={3}
							className='resize-none'
							value={formData.observacoes || ""}
							onChange={(e) =>
								setFormData({ ...formData, observacoes: e.target.value })
							}
						/>
					</Field>
					<div className='flex justify-end pt-4 border-t border-slate-200/60'>
						<Button onClick={handleSave} loading={isSaving}>
							Salvar Cliente
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
