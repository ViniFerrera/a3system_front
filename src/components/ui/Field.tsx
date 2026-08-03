import React from "react";

const CONTROL =
	"w-full h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-[10px] text-ink placeholder:text-ink-faint outline-none transition-all hover:border-slate-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50 disabled:text-ink-faint";

export const Field = ({
	label,
	hint,
	error,
	required,
	children,
	className = "",
}: {
	label?: string;
	hint?: string;
	error?: string;
	required?: boolean;
	children: React.ReactNode;
	className?: string;
}) => (
	<div className={className}>
		{label && (
			<label className="block text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">
				{label}
				{required && <span className="text-danger-500 ml-0.5">*</span>}
			</label>
		)}
		{children}
		{error ? (
			<p className="text-2xs text-danger-600 mt-1 font-medium">{error}</p>
		) : (
			hint && <p className="text-2xs text-ink-faint mt-1">{hint}</p>
		)}
	</div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
	({ invalid, className = "", ...rest }, ref) => (
		<input
			ref={ref}
			{...rest}
			className={`${CONTROL} ${invalid ? "border-danger-300 focus:border-danger-400 focus:ring-danger-100" : ""} ${className}`}
		/>
	)
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
	({ invalid, className = "", children, ...rest }, ref) => (
		<select
			ref={ref}
			{...rest}
			className={`${CONTROL} ${invalid ? "border-danger-300" : ""} ${className}`}
		>
			{children}
		</select>
	)
);
Select.displayName = "Select";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
	({ className = "", ...rest }, ref) => (
		<textarea ref={ref} {...rest} className={`${CONTROL} h-auto py-2.5 ${className}`} />
	)
);
Textarea.displayName = "Textarea";
