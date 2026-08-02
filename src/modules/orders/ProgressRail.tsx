import React from "react";
import { Check, User, CreditCard, FileText, Package } from "lucide-react";

export type EtapaId = "cliente" | "pagamento" | "descricao" | "material";

export interface Etapa {
	id: EtapaId;
	label: string;
	completa: boolean;
	/** Etapa que não impede o salvamento — sinalizada para não parecer bloqueio. */
	opcional?: boolean;
	resumo?: string;
}

const ICONES: Record<EtapaId, React.ElementType> = {
	cliente: User,
	pagamento: CreditCard,
	descricao: FileText,
	material: Package,
};

/**
 * Indicador de progresso do formulário de ordem. É informativo: a única
 * exigência real para salvar é o cliente, como sempre foi.
 */
export const ProgressRail = ({
	etapas,
	onIr,
}: {
	etapas: Etapa[];
	onIr: (id: EtapaId) => void;
}) => (
	<nav aria-label="Andamento do preenchimento" className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
		{etapas.map((etapa) => {
			const Icone = ICONES[etapa.id];
			return (
				<button
					key={etapa.id}
					type="button"
					onClick={() => onIr(etapa.id)}
					aria-label={`Ir para ${etapa.label}${etapa.opcional ? " (opcional)" : ""}: ${
						etapa.resumo || (etapa.completa ? "preenchido" : "pendente")
					}`}
					className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all flex-shrink-0 lg:w-full ${
						etapa.completa
							? "bg-success-50 border-success-200"
							: "bg-white border-slate-200 hover:border-slate-300"
					}`}
				>
					<span
						className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
							etapa.completa ? "bg-success-500 text-white" : "bg-slate-100 text-ink-faint"
						}`}
					>
						{etapa.completa ? <Check className="w-4 h-4" /> : <Icone className="w-4 h-4" />}
					</span>
					{/* O texto abaixo é decorativo: o rótulo acessível do botão já
					    diz o passo e a situação, e sem isto o leitor de tela lia
					    tudo duas vezes. */}
					<span className="min-w-0" aria-hidden="true">
						<span className="block text-sm font-semibold text-ink">
							{etapa.label}
							{etapa.opcional && (
								<span className="text-2xs font-normal text-ink-faint ml-1.5">opcional</span>
							)}
						</span>
						<span className="block text-2xs text-ink-faint truncate">
							{etapa.resumo || (etapa.completa ? "preenchido" : "pendente")}
						</span>
					</span>
				</button>
			);
		})}
	</nav>
);
