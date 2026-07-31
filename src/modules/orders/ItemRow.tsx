import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { PriceRule } from "@/types";
import { Utils } from "@/utils";
import {
	EditableItem,
	ItemField,
	applyFieldChange,
	getFieldOptions,
	recalcItem,
} from "./itemOptions";

interface Machine {
	id: number;
	nome: string;
	tipo: string;
}

interface VisibleColumns {
	gramatura: boolean;
	tamanho: boolean;
	cor: boolean;
}

const cellSelect =
	"w-full text-xs border border-slate-200 rounded-[8px] px-1.5 py-1.5 bg-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition disabled:bg-slate-50 disabled:text-slate-300";

/** Uma linha da grade de itens. Toda alteração recalcula o preço da linha. */
export const ItemRow = ({
	item,
	priceTable,
	machines,
	visible,
	onChange,
	onRemove,
}: {
	item: EditableItem;
	priceTable: PriceRule[];
	machines: Machine[];
	visible: VisibleColumns;
	onChange: (next: EditableItem) => void;
	onRemove: () => void;
}) => {
	const options = useMemo(
		() => getFieldOptions(priceTable, item),
		[priceTable, item.servico, item.material, item.gramatura, item.tamanho]
	);

	const setField = (field: ItemField, value: string) =>
		onChange(applyFieldChange(item, field, value, priceTable));

	const semPreco = item.quantidade > 0 && item.total === 0 && !!item.servico;

	return (
		<tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
			{/* Serviço */}
			<td className="p-1.5">
				<select
					className={cellSelect}
					value={item.servico}
					onChange={(e) => setField("servico", e.target.value)}
				>
					<option value="">Selecione...</option>
					{options.servicos.map((s) => (
						<option key={s} value={s}>
							{Utils.displayName(s)}
						</option>
					))}
				</select>
			</td>

			{/* Material */}
			<td className="p-1.5">
				<select
					className={cellSelect}
					value={item.material}
					onChange={(e) => setField("material", e.target.value)}
					disabled={!item.servico}
				>
					<option value="">...</option>
					{options.materiais.map((m) => (
						<option key={m} value={m}>
							{Utils.displayName(m) || "—"}
						</option>
					))}
				</select>
			</td>

			{visible.gramatura && (
				<td className="p-1.5">
					<select
						className={cellSelect}
						value={item.gramatura || ""}
						onChange={(e) => setField("gramatura", e.target.value)}
						disabled={!options.gramaturas.length}
					>
						<option value="">—</option>
						{options.gramaturas.map((g) => (
							<option key={g} value={g}>
								{Utils.displayName(g) || "—"}
							</option>
						))}
					</select>
				</td>
			)}

			{visible.tamanho && (
				<td className="p-1.5">
					<select
						className={cellSelect}
						value={item.tamanho || ""}
						onChange={(e) => setField("tamanho", e.target.value)}
						disabled={!options.tamanhos.length}
					>
						<option value="">—</option>
						{options.tamanhos.map((t) => (
							<option key={t} value={t}>
								{Utils.displayName(t) || "—"}
							</option>
						))}
					</select>
				</td>
			)}

			{visible.cor && (
				<td className="p-1.5">
					<select
						className={cellSelect}
						value={item.cor}
						onChange={(e) => setField("cor", e.target.value)}
						disabled={!item.material}
					>
						<option value="">...</option>
						{options.cores.map((c) => (
							<option key={c} value={c}>
								{Utils.displayName(c) || "—"}
							</option>
						))}
					</select>
				</td>
			)}

			{/* Maquinário */}
			<td className="p-1.5">
				<select
					className={cellSelect}
					value={item.maquina_id || 0}
					onChange={(e) => {
						const id = Number(e.target.value);
						onChange({
							...item,
							maquina_id: id,
							maquina_nome: machines.find((m) => m.id === id)?.nome,
						});
					}}
				>
					<option value="0">Nenhum</option>
					{machines.map((m) => (
						<option key={m.id} value={m.id}>
							{m.nome}
						</option>
					))}
				</select>
			</td>

			{/* Quantidade */}
			<td className="p-1.5">
				<input
					type="number"
					min={0}
					step="any"
					className={`${cellSelect} text-center`}
					value={item.quantidade}
					onChange={(e) =>
						onChange(
							recalcItem(
								{ ...item, quantidade: Number(e.target.value) },
								priceTable
							)
						)
					}
				/>
			</td>

			{/* Frente/Verso */}
			<td className="p-1.5 text-center">
				<input
					type="checkbox"
					className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
					checked={!!item.is_double_sided}
					onChange={(e) =>
						onChange({ ...item, is_double_sided: e.target.checked })
					}
				/>
			</td>

			{/* Unitário */}
			<td className="p-1.5 text-right text-xs text-slate-500 whitespace-nowrap">
				{Utils.formatCurrency(item.unitPrice || 0)}
			</td>

			{/* Total */}
			<td className="p-1.5 text-right whitespace-nowrap">
				<span
					className={`text-xs font-bold ${
						semPreco ? "text-amber-600" : "text-slate-800"
					}`}
					title={semPreco ? "Nenhuma regra de preço corresponde a este item" : undefined}
				>
					{Utils.formatCurrency(item.total || 0)}
				</span>
			</td>

			<td className="p-1.5 text-center">
				<button
					type="button"
					onClick={onRemove}
					className="p-1 text-slate-300 hover:text-red-500 transition"
					title="Remover item"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</button>
			</td>
		</tr>
	);
};
