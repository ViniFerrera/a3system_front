import React from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
	primary:
		"bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/20 border border-transparent",
	secondary:
		"bg-white text-ink border border-slate-200 hover:border-slate-300 hover:bg-slate-50",
	ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-slate-100 border border-transparent",
	danger: "bg-danger-600 text-white hover:bg-danger-700 border border-transparent",
	subtle: "bg-primary-50 text-primary-700 hover:bg-primary-100 border border-transparent",
};

const SIZES: Record<Size, string> = {
	sm: "h-7 px-2.5 text-xs gap-1.5",
	md: "h-8 px-3.5 text-sm gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	/** Enquanto true, mostra spinner e ignora cliques — fecha a porta do duplo envio. */
	loading?: boolean;
	icon?: React.ReactNode;
}

export const Button = ({
	variant = "primary",
	size = "md",
	loading = false,
	icon,
	disabled,
	className = "",
	children,
	...rest
}: ButtonProps) => (
	<button
		// Padrão seguro: <button> sem type dentro de <form> envia o formulário.
		// Continua sobrescrevível por quem passar type="submit".
		type="button"
		{...rest}
		disabled={disabled || loading}
		aria-busy={loading || undefined}
		className={`inline-flex items-center justify-center rounded-[10px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
	>
		{loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : icon}
		{children}
	</button>
);
