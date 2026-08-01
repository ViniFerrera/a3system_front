import React from "react";

export interface Segment<T extends string> {
	key: T;
	label: string;
	icon?: React.ReactNode;
	/** Contador opcional à direita do rótulo (ex.: nº de ordens no status). */
	count?: number;
}

export function SegmentedControl<T extends string>({
	segments,
	value,
	onChange,
	size = "md",
	className = "",
}: {
	segments: Segment<T>[];
	value: T;
	onChange: (key: T) => void;
	size?: "sm" | "md";
	className?: string;
}) {
	const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
	return (
		<div className={`inline-flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl ${className}`}>
			{segments.map((s) => {
				const active = s.key === value;
				return (
					<button
						key={s.key}
						type="button"
						onClick={() => onChange(s.key)}
						className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all duration-150 ${pad} ${
							active
								? "bg-white text-primary-700 shadow-sm"
								: "text-ink-muted hover:text-ink"
						}`}
					>
						{s.icon}
						{s.label}
						{typeof s.count === "number" && (
							<span
								className={`num px-1.5 py-0.5 rounded-full text-2xs font-bold ${
									active ? "bg-primary-50 text-primary-700" : "bg-white text-ink-faint"
								}`}
							>
								{s.count}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
