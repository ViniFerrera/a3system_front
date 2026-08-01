import React, { useMemo } from "react";
import { Plus, Printer } from "lucide-react";
import { PriceRule } from "@/types";
import { Utils } from "@/utils";
import { ItemRow } from "./ItemRow";
import {
	EditableItem,
	createEmptyItem,
	getVisibleColumns,
} from "./itemOptions";

interface Machine {
	id: number;
	nome: string;
	tipo: string;
}

const th =
	"p-2 text-2xs font-bold text-slate-400 uppercase tracking-wide text-left whitespace-nowrap";

/**
 * Grade editável de itens da ordem.
 *
 * Substitui o par "formulário de adicionar + lista só-leitura": cada item é uma
 * linha e qualquer propriedade pode ser alterada no lugar, com recálculo de
 * preço imediato.
 */
export const ItemGrid = ({
	items,
	priceTable,
	machines,
	onChange,
}: {
	items: EditableItem[];
	priceTable: PriceRule[];
	machines: Machine[];
	onChange: (items: EditableItem[]) => void;
}) => {
	// Visibilidade decidida para a tabela inteira: esconder por linha
	// desalinharia as colunas.
	const visible = useMemo(
		() => getVisibleColumns(items, priceTable),
		[items, priceTable]
	);

	const subtotal = items.reduce((acc, i) => acc + (i.total || 0), 0);

	const updateAt = (index: number, next: EditableItem) =>
		onChange(items.map((it, i) => (i === index ? next : it)));

	const removeAt = (index: number) =>
		onChange(items.filter((_, i) => i !== index));

	return (
		<div className="bg-slate-50 rounded-[10px] border border-slate-200">
			<div className="overflow-x-auto custom-scrollbar">
				<table className="w-full min-w-[820px]">
					<thead className="border-b border-slate-200">
						<tr>
							<th className={`${th} w-[15%]`}>Serviço</th>
							<th className={`${th} w-[15%]`}>Material</th>
							{visible.gramatura && <th className={`${th} w-[11%]`}>Especificação</th>}
							{visible.tamanho && <th className={`${th} w-[9%]`}>Tamanho</th>}
							{visible.cor && <th className={`${th} w-[10%]`}>Cor</th>}
							<th className={`${th} w-[13%]`}>
								<span className="inline-flex items-center gap-1">
									<Printer className="w-3 h-3" /> Máquina
								</span>
							</th>
							<th className={`${th} w-[7%] text-center`}>Qtd</th>
							<th className={`${th} w-[5%] text-center`}>F/V</th>
							<th className={`${th} w-[8%] text-right`}>Unit.</th>
							<th className={`${th} w-[9%] text-right`}>Total</th>
							<th className={`${th} w-[4%]`}></th>
						</tr>
					</thead>
					<tbody>
						{items.length > 0 ? (
							items.map((item, idx) => (
								<ItemRow
									key={item._key}
									item={item}
									priceTable={priceTable}
									machines={machines}
									visible={visible}
									onChange={(next) => updateAt(idx, next)}
									onRemove={() => removeAt(idx)}
								/>
							))
						) : (
							<tr>
								<td
									colSpan={11}
									className="p-6 text-center text-xs text-slate-400"
								>
									Nenhum item. Use uma pré-definição acima ou adicione uma linha.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className="flex items-center justify-between gap-3 p-2 border-t border-slate-200">
				<button
					type="button"
					onClick={() => onChange([...items, createEmptyItem()])}
					className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 border border-dashed border-indigo-300 rounded-[8px] hover:bg-indigo-50 transition"
				>
					<Plus className="w-3.5 h-3.5" /> Adicionar linha
				</button>
				<div className="text-xs text-slate-500">
					{items.length} {items.length === 1 ? "item" : "itens"}
					<span className="mx-2 text-slate-300">|</span>
					Subtotal{" "}
					<strong className="text-slate-700">
						{Utils.formatCurrency(subtotal)}
					</strong>
				</div>
			</div>
		</div>
	);
};
