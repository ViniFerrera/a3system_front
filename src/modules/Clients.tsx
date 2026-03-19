import React, { useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Client } from "@/types";
import * as XLSX from "xlsx";
import {
	Plus,
	Search,
	Edit2,
	Trash2,
	Mail,
	Phone,
	MapPin,
	User,
	Building2,
	Download,
	Upload,
} from "lucide-react";
import { api } from "@/services/api";

export const ClientsModule = ({
	clients,
	setClients,
}: {
	clients: Client[];
	setClients: Function;
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingClient, setEditingClient] = useState<Client | null>(null);
	const [formData, setFormData] = useState<Partial<Client>>({ tipo: "PF" });

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
					alert(`${normalizedData.length} clientes importados com sucesso.`);
				} else {
					alert("O arquivo parece estar vazio ou ilegível.");
				}
			} catch (err) {
				console.error(err);
				alert("Erro ao importar arquivo Excel.");
			}
		};
		reader.readAsBinaryString(file);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSave = async () => {
		// CORREÇÃO: Apenas Nome é obrigatório (Email removido da validação)
		if (!formData.nome) {
			alert("O Nome é obrigatório.");
			return;
		}
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
		} catch (err) {
			alert("Erro ao salvar cliente");
		}
	};

	const handleDelete = async (id: number) => {
		if (confirm("Tem certeza que deseja excluir este cliente?")) {
			try {
				await api.delete(`/clients/${id}`);
				setClients((prev: Client[]) => prev.filter((c) => c.id !== id));
			} catch (err) {
				alert("Erro ao excluir");
			}
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

	return (
		<div className='space-y-6'>
			<div className='flex justify-between items-center'>
				<h2 className='text-2xl font-bold text-slate-800'>
					Gestão de Clientes
				</h2>
				<div className='flex gap-2'>
					<button
						onClick={handleExportExcel}
						className='flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-[10px] hover:bg-slate-50 transition shadow-sm text-sm font-medium'
					>
						<Download className='w-4 h-4' /> Exportar
					</button>
					<input
						type='file'
						ref={fileInputRef}
						onChange={handleImportExcel}
						className='hidden'
						accept='.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
					/>
					<button
						onClick={() => fileInputRef.current?.click()}
						className='flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-[10px] hover:bg-slate-900 transition shadow-sm text-sm font-medium'
					>
						<Upload className='w-4 h-4' /> Importar
					</button>
					<button
						onClick={() => openModal()}
						className='flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-[10px] hover:bg-indigo-700 transition shadow-sm font-medium'
					>
						<Plus className='w-4 h-4' /> Novo Cliente
					</button>
				</div>
			</div>
			<div className='relative group'>
				<Search className='absolute left-3 top-3 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors' />
				<input
					type='text'
					placeholder='Buscar por nome, telefone, email ou documento...'
					className='w-full pl-10 pr-4 py-3 border border-slate-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm transition-all'
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
			</div>
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
				{filteredClients.map((client) => (
					<Card
						key={client.id}
						className='p-6 hover:shadow-lg hover:-translate-y-1 relative group'
					>
						<div className='flex justify-between items-start mb-4'>
							<div className='flex items-center gap-3'>
								<div
									className={`w-12 h-12 rounded-[10px] flex items-center justify-center shadow-inner ${
										client.tipo === "PJ"
											? "bg-purple-50 text-purple-600"
											: "bg-indigo-50 text-indigo-600"
									}`}
								>
									{client.tipo === "PJ" ? (
										<Building2 className='w-6 h-6' />
									) : (
										<User className='w-6 h-6' />
									)}
								</div>
								<div>
									<h4 className='font-bold text-slate-800 text-lg leading-tight'>
										{client.nome}
									</h4>
									<div className='flex items-center gap-2 mt-1'>
										<span
											className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[5px] ${
												client.tipo === "PJ"
													? "bg-purple-100 text-purple-700"
													: "bg-indigo-100 text-indigo-700"
											}`}
										>
											{client.tipo}
										</span>
										<p className='text-xs text-slate-400 font-mono'>
											{client.cpf_cnpj || "---"}
										</p>
									</div>
								</div>
							</div>
							<div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0'>
								<button
									onClick={() => openModal(client)}
									className='p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-[10px] transition-colors'
								>
									<Edit2 className='w-4 h-4' />
								</button>
								<button
									onClick={() => client.id && handleDelete(client.id)}
									className='p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[10px] transition-colors'
								>
									<Trash2 className='w-4 h-4' />
								</button>
							</div>
						</div>
						<div className='space-y-3 text-sm text-slate-600 border-t border-slate-100 pt-4'>
							<div className='flex items-center gap-3'>
								<div className='p-1.5 bg-slate-50 rounded-[5px] text-slate-400'>
									<Mail className='w-3.5 h-3.5' />
								</div>
								<span className='truncate font-medium'>
									{client.email || "Não informado"}
								</span>
							</div>
							<div className='flex items-center gap-3'>
								<div className='p-1.5 bg-slate-50 rounded-[5px] text-slate-400'>
									<Phone className='w-3.5 h-3.5' />
								</div>
								<span className='font-medium'>{client.telefone || "N/A"}</span>
							</div>
							{client.endereco && (
								<div className='flex items-start gap-3'>
									<div className='p-1.5 bg-slate-50 rounded-[5px] text-slate-400 mt-0.5'>
										<MapPin className='w-3.5 h-3.5' />
									</div>
									<span className='text-xs leading-relaxed text-slate-500'>
										{client.endereco}, {client.numero}
									</span>
								</div>
							)}
						</div>
					</Card>
				))}
			</div>
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingClient ? "Editar Cliente" : "Novo Cliente"}
				size='lg'
			>
				<div className='space-y-5'>
					<div className='bg-slate-100 p-1 rounded-[10px] inline-flex mb-2'>
						<button
							onClick={() => setFormData({ ...formData, tipo: "PF" })}
							className={`px-6 py-2 text-sm rounded-[10px] transition-all font-bold ${
								formData.tipo === "PF"
									? "bg-white text-indigo-600 shadow-sm"
									: "text-slate-500 hover:text-slate-700"
							}`}
						>
							Pessoa Física
						</button>
						<button
							onClick={() => setFormData({ ...formData, tipo: "PJ" })}
							className={`px-6 py-2 text-sm rounded-[10px] transition-all font-bold ${
								formData.tipo === "PJ"
									? "bg-white text-purple-600 shadow-sm"
									: "text-slate-500 hover:text-slate-700"
							}`}
						>
							Pessoa Jurídica
						</button>
					</div>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
						<div className='md:col-span-2'>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Nome Completo / Razão Social *
							</label>
							<input
								type='text'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								value={formData.nome || ""}
								onChange={(e) =>
									setFormData({ ...formData, nome: e.target.value })
								}
							/>
						</div>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								E-mail
							</label>
							<input
								type='email'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								value={formData.email || ""}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
							/>
						</div>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Telefone
							</label>
							<input
								type='text'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								value={formData.telefone || ""}
								onChange={(e) =>
									setFormData({ ...formData, telefone: e.target.value })
								}
							/>
						</div>
					</div>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								{formData.tipo === "PF" ? "CPF" : "CNPJ"}
							</label>
							<input
								type='text'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								value={formData.cpf_cnpj || ""}
								onChange={(e) =>
									setFormData({ ...formData, cpf_cnpj: e.target.value })
								}
							/>
						</div>
						{formData.tipo === "PJ" && (
							<div>
								<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
									Indicador Municipal
								</label>
								<input
									type='text'
									className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
									value={formData.indicador_municipal || ""}
									onChange={(e) =>
										setFormData({
											...formData,
											indicador_municipal: e.target.value,
										})
									}
								/>
							</div>
						)}
					</div>
					<div className='pt-4 border-t border-slate-100'>
						<h4 className='text-xs font-bold text-slate-400 uppercase tracking-widest mb-4'>
							Endereço
						</h4>
						<div className='grid grid-cols-1 md:grid-cols-6 gap-3'>
							<div className='md:col-span-2'>
								<label className='block text-xs text-slate-500 mb-1'>CEP</label>
								<input
									type='text'
									className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white'
									value={formData.cep || ""}
									onChange={(e) =>
										setFormData({ ...formData, cep: e.target.value })
									}
								/>
							</div>
							<div className='md:col-span-4'>
								<label className='block text-xs text-slate-500 mb-1'>
									Logradouro
								</label>
								<input
									type='text'
									className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white'
									value={formData.endereco || ""}
									onChange={(e) =>
										setFormData({ ...formData, endereco: e.target.value })
									}
								/>
							</div>
							<div className='md:col-span-2'>
								<label className='block text-xs text-slate-500 mb-1'>
									Número
								</label>
								<input
									type='text'
									className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white'
									value={formData.numero || ""}
									onChange={(e) =>
										setFormData({ ...formData, numero: e.target.value })
									}
								/>
							</div>
							<div className='md:col-span-4'>
								<label className='block text-xs text-slate-500 mb-1'>
									Complemento
								</label>
								<input
									type='text'
									className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white'
									value={formData.complemento || ""}
									onChange={(e) =>
										setFormData({ ...formData, complemento: e.target.value })
									}
								/>
							</div>
						</div>
					</div>
					<div className='mt-5'>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Observações
						</label>
						<textarea
							rows={3}
							className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white resize-none'
							value={formData.observacoes || ""}
							onChange={(e) =>
								setFormData({ ...formData, observacoes: e.target.value })
							}
						/>
					</div>
					<div className='flex justify-end pt-4 border-t border-slate-100'>
						<button
							onClick={handleSave}
							className='bg-indigo-600 text-white px-8 py-3 rounded-[10px] hover:bg-indigo-700 font-bold shadow-md'
						>
							Salvar Cliente
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
