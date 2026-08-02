import React from "react";
import { Check } from "lucide-react";

export type EtapaId = "cliente" | "pagamento" | "descricao" | "material";

export interface Etapa {
	id: EtapaId;
	label: string;
	completa: boolean;
	/** Etapa que não impede o salvamento — sinalizada para não parecer bloqueio. */
	opcional?: boolean;
	resumo?: string;
}

/**
 * Indicador de progresso do formulário de ordem. É informativo: a única
 * exigência real para salvar é o cliente, como sempre foi.
 *
 * Sem cartão, borda ou ícone por etapa de propósito — a trilha acompanha o
 * formulário rolando ao lado dele e não pode competir com os campos. O que
 * resta é o mínimo que comunica situação: a barrinha à esquerda (cinza →
 * verde) e o nome, com um check quando a etapa está preenchida.
 */
export const ProgressRail = ({
	etapas,
	onIr,
}: {
	etapas: Etapa[];
	onIr: (id: EtapaId) => void;
}) => (
	<nav
		aria-label="Andamento do preenchimento"
		className="flex lg:flex-col gap-x-4 gap-y-0.5 overflow-x-auto lg:overflow-visible"
	>
		{etapas.map((etapa) => (
			<button
				key={etapa.id}
				type="button"
				onClick={() => onIr(etapa.id)}
				aria-label={`Ir para ${etapa.label}${etapa.opcional ? " (opcional)" : ""}: ${
					etapa.resumo || (etapa.completa ? "preenchido" : "pendente")
				}`}
				className="group flex items-center gap-2.5 py-1.5 text-left flex-shrink-0 lg:w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary-200"
			>
				{/* Barrinha de situação: única marca visual da etapa. */}
				<span
					aria-hidden="true"
					className={`w-[3px] h-5 rounded-full flex-shrink-0 transition-colors ${
						etapa.completa
							? "bg-success-500"
							: "bg-slate-200 group-hover:bg-slate-300"
					}`}
				/>
				{/* Decorativo: o rótulo acessível do botão acima já diz passo e
				    situação, e sem o aria-hidden o leitor de tela lia tudo duas vezes. */}
				<span aria-hidden="true" className="flex items-center gap-1.5 min-w-0">
					<span
						className={`text-sm truncate transition-colors ${
							etapa.completa
								? "font-semibold text-ink"
								: "font-medium text-ink-faint group-hover:text-ink-muted"
						}`}
					>
						{etapa.label}
					</span>
					{etapa.completa && (
						<Check
							className="w-3.5 h-3.5 text-success-500 flex-shrink-0"
							strokeWidth={3}
						/>
					)}
				</span>
			</button>
		))}
	</nav>
);
