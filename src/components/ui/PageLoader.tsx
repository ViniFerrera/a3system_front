import React from "react";

/**
 * Tela de carregamento de página inteira — o estado padrão de qualquer módulo
 * enquanto busca o que precisa mostrar.
 *
 * Preferido ao esqueleto de conteúdo quando o que vem depois não tem forma
 * previsível (um painel inteiro, um relatório): esqueleto que não parece com o
 * resultado final entrega dois saltos de layout em vez de um.
 *
 * `role="status"` + `aria-live` fazem o leitor de tela anunciar a espera; sem
 * isso a troca de aba ficava muda até os dados chegarem.
 */
export const PageLoader = ({
	message = "Carregando...",
	hint,
	className = "",
}: {
	message?: string;
	/** Segunda linha, para esperas longas ("Isto pode levar alguns segundos"). */
	hint?: string;
	className?: string;
}) => (
	<div
		role="status"
		aria-live="polite"
		className={`flex flex-col items-center justify-center gap-4 min-h-[55vh] py-16 animate-fade-in ${className}`}
	>
		<div className="relative w-11 h-11" aria-hidden="true">
			<div className="absolute inset-0 rounded-full border-[3px] border-primary-100" />
			{/* motion-reduce: quem pediu menos movimento fica com o anel parado —
			    o texto abaixo continua dizendo que há carregamento em curso. */}
			<div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary-600 animate-spin motion-reduce:animate-none" />
			<div
				className="absolute inset-1.5 rounded-full border-[3px] border-transparent border-b-primary-300 animate-spin motion-reduce:animate-none"
				style={{ animationDirection: "reverse", animationDuration: "1.1s" }}
			/>
		</div>
		<div className="text-center px-6">
			<p className="text-sm font-semibold text-ink">{message}</p>
			{hint && <p className="text-2xs text-ink-faint mt-1">{hint}</p>}
		</div>
	</div>
);
