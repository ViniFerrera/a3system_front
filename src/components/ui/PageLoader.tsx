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
		className={`flex flex-col items-center justify-center gap-3 min-h-[55vh] py-16 animate-fade-in ${className}`}
	>
		{/* Servido de public/: URL absoluta a partir da raiz, não do CDN
		    externo — o hotlink não carregava em produção.
		    `mix-blend-multiply`: o GIF não tem transparência de verdade (fundo
		    branco gravado em todos os 128 quadros) — multiply apaga esse branco
		    contra o fundo claro da página, deixando só o desenho visível. */}
		<img
			src="/gif_loading.gif"
			alt=""
			aria-hidden="true"
			className="w-20 h-20 object-contain mix-blend-multiply motion-reduce:hidden"
		/>
		<div className="text-center px-6">
			<p className="text-sm font-semibold text-ink">{message}</p>
			{hint && <p className="text-2xs text-ink-faint mt-1">{hint}</p>}
		</div>
	</div>
);
