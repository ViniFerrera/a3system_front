import React, { useEffect, useState } from "react";
import { Zap, X, Plus, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { NAV_ITEMS } from "@/components/shell/navItems";
import { ACTIONS, COLORS, ICONS, Shortcut } from "./shortcutTypes";

interface Props {
	shortcuts: Shortcut[];
	onRun: (s: Shortcut) => void;
	onAdd: (s: Shortcut) => void;
	onRemove: (id: string) => void;
	onMove: (id: string, direcao: -1 | 1) => void;
	cheio: boolean;
}

export const ShortcutsDrawer = ({ shortcuts, onRun, onAdd, onRemove, onMove, cheio }: Props) => {
	const [open, setOpen] = useState(false);
	const [addOpen, setAddOpen] = useState(false);
	const [kind, setKind] = useState<"module" | "action">("module");
	const [target, setTarget] = useState(NAV_ITEMS[0].id);
	const [label, setLabel] = useState("");
	const [color, setColor] = useState("indigo");

	// Esc fecha a gaveta. O listener só existe enquanto ela está aberta — com a
	// gaveta fechada nada fica pendurado no documento.
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open]);

	// Fechar a gaveta também descarta o formulário de adição pela metade.
	useEffect(() => {
		if (!open) {
			setAddOpen(false);
			setLabel("");
		}
	}, [open]);

	const alvos =
		kind === "module"
			? NAV_ITEMS.map((n) => ({ value: n.id, label: n.label, icon: "dashboard" }))
			: ACTIONS.map((a) => ({ value: a.id, label: a.label, icon: a.icon }));

	const criar = () => {
		const alvo = alvos.find((a) => a.value === target);
		if (!alvo) return;
		onAdd({
			id: `${kind}:${target}:${Date.now()}`,
			kind,
			label: label.trim() || alvo.label,
			icon: alvo.icon,
			color,
			target,
		});
		setAddOpen(false);
		setLabel("");
	};

	return (
		<>
			{/* Faixa recolhida, sempre visível na borda direita */}
			<button
				onClick={() => setOpen(true)}
				className={`fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 py-4 px-2 bg-slate-900 text-white rounded-l-xl shadow-elevated hover:bg-slate-800 transition-all ${
					open ? "opacity-0 pointer-events-none" : "opacity-100"
				}`}
				aria-label="Abrir atalhos"
				title="Atalhos"
			>
				<Zap className="w-4 h-4 text-primary-300" />
				<span className="text-2xs font-bold tracking-widest [writing-mode:vertical-rl]">ATALHOS</span>
			</button>

			{open && (
				<div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)}>
					<div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] animate-fade-in" />
					<aside
						className="absolute right-0 inset-y-0 w-[320px] max-w-[85vw] bg-white shadow-elevated flex flex-col animate-fade-in"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
							<h3 className="text-sm font-bold text-ink flex items-center gap-2">
								<Zap className="w-4 h-4 text-primary-500" /> Atalhos
							</h3>
							<button
								onClick={() => setOpen(false)}
								className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-faint hover:text-ink hover:bg-slate-100 transition-all"
								aria-label="Fechar atalhos"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
							{shortcuts.length === 0 && !addOpen && (
								<p className="text-xs text-ink-faint text-center py-8">
									Nenhum atalho ainda. Adicione o primeiro abaixo.
								</p>
							)}

							{shortcuts.map((s, i) => {
								const Icon = ICONS[s.icon] || ICONS.dashboard;
								return (
									<div key={s.id} className="flex items-center gap-1.5">
										<button
											onClick={() => { onRun(s); setOpen(false); }}
											className={`flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${COLORS[s.color] || COLORS.slate}`}
										>
											<Icon className="w-4 h-4 flex-shrink-0" />
											<span className="truncate text-left">{s.label}</span>
										</button>
										<div className="flex flex-col">
											<button onClick={() => onMove(s.id, -1)} disabled={i === 0}
												className="text-ink-faint hover:text-ink disabled:opacity-30 p-0.5" aria-label="Subir">
												<ChevronUp className="w-3.5 h-3.5" />
											</button>
											<button onClick={() => onMove(s.id, 1)} disabled={i === shortcuts.length - 1}
												className="text-ink-faint hover:text-ink disabled:opacity-30 p-0.5" aria-label="Descer">
												<ChevronDown className="w-3.5 h-3.5" />
											</button>
										</div>
										<button onClick={() => onRemove(s.id)}
											className="text-ink-faint hover:text-danger-500 p-1" aria-label="Remover atalho">
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									</div>
								);
							})}

							{addOpen && (
								<div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-surface-sunken">
									<Field label="Tipo">
										<Select value={kind} onChange={(e) => {
											const k = e.target.value as "module" | "action";
											setKind(k);
											setTarget(k === "module" ? NAV_ITEMS[0].id : ACTIONS[0].id);
										}}>
											<option value="module">Ir para módulo</option>
											<option value="action">Ação rápida</option>
										</Select>
									</Field>
									<Field label="Alvo">
										<Select value={target} onChange={(e) => setTarget(e.target.value)}>
											{alvos.map((a) => (
												<option key={a.value} value={a.value}>{a.label}</option>
											))}
										</Select>
									</Field>
									<Field label="Rótulo" hint="Em branco usa o nome do alvo">
										<Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: OS do dia" />
									</Field>
									<Field label="Cor">
										<Select value={color} onChange={(e) => setColor(e.target.value)}>
											{Object.keys(COLORS).map((c) => (
												<option key={c} value={c}>{c}</option>
											))}
										</Select>
									</Field>
									<div className="flex gap-2 justify-end">
										<Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancelar</Button>
										<Button size="sm" onClick={criar}>Adicionar</Button>
									</div>
								</div>
							)}
						</div>

						<div className="p-3 border-t border-slate-100">
							<Button
								variant="secondary"
								className="w-full"
								icon={<Plus className="w-4 h-4" />}
								onClick={() => setAddOpen(true)}
								disabled={cheio || addOpen}
							>
								{cheio ? "Limite de 8 atalhos" : "Adicionar atalho"}
							</Button>
						</div>
					</aside>
				</div>
			)}
		</>
	);
};
