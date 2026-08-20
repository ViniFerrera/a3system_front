import React, { useCallback, useEffect, useState } from "react";
import { PageHeader, SegmentedControl, PageLoader } from "@/components/ui";
import { useToast } from "@/components/ui";
import { LayoutDashboard, Plus, FileText, FileSpreadsheet, CalendarRange, Settings, School } from "lucide-react";
import type { Instituicao, InstituicaoPreco, InstituicaoSetor } from "@/types";
import { EscolaApi } from "@/services/escolaApi";
import { EscolaDashboard } from "./EscolaDashboard";
import { EscolaOrdemForm } from "./EscolaOrdemForm";
import { EscolaOrdensList } from "./EscolaOrdensList";
import { EscolaFaturas } from "./EscolaFaturas";
import { EscolaRelatorios } from "./EscolaRelatorios";
import { EscolaConfig } from "./EscolaConfig";

type Aba = "dashboard" | "nova" | "ordens" | "faturas" | "relatorios" | "config";

export const EscolaModule: React.FC = () => {
	const toast = useToast();
	const [inst, setInst] = useState<Instituicao | null>(null);
	const [setores, setSetores] = useState<InstituicaoSetor[]>([]);
	const [precos, setPrecos] = useState<InstituicaoPreco[]>([]);
	const [carregando, setCarregando] = useState(true);
	const [aba, setAba] = useState<Aba>("dashboard");
	const [refreshKey, setRefreshKey] = useState(0);

	const carregarBase = useCallback(async () => {
		try {
			const insts = await EscolaApi.getInstituicoes();
			const primeira = insts[0] || null;
			setInst(primeira);
			if (primeira?.id) {
				setSetores(primeira.setores || (await EscolaApi.getSetores(primeira.id)));
				setPrecos(await EscolaApi.getPrecos(primeira.id));
			}
		} catch {
			toast.error("Erro ao carregar dados da escola.");
		} finally {
			setCarregando(false);
		}
	}, [toast]);

	useEffect(() => { carregarBase(); }, [carregarBase]);

	const recarregarConfig = useCallback(async () => {
		if (!inst?.id) return;
		setSetores(await EscolaApi.getSetores(inst.id));
		setPrecos(await EscolaApi.getPrecos(inst.id));
	}, [inst]);

	if (carregando) return <PageLoader message="Carregando escola..." />;
	if (!inst?.id) {
		return (
			<div className="p-8 text-center text-ink-muted">
				Nenhuma instituição cadastrada. Verifique a semente do banco (Colégio Vera Cruz).
			</div>
		);
	}
	const instId = inst.id;

	const abas: { key: Aba; label: string; icon: React.ReactNode }[] = [
		{ key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
		{ key: "nova", label: "Nova Ordem", icon: <Plus className="w-4 h-4" /> },
		{ key: "ordens", label: "Ordens", icon: <FileText className="w-4 h-4" /> },
		{ key: "faturas", label: "Faturas", icon: <FileSpreadsheet className="w-4 h-4" /> },
		{ key: "relatorios", label: "Relatórios", icon: <CalendarRange className="w-4 h-4" /> },
		{ key: "config", label: "Config", icon: <Settings className="w-4 h-4" /> },
	];

	return (
		<div className="space-y-4">
			<PageHeader
				title={inst.nome}
				subtitle="Gestão de ordens, faturamento e relatórios da instituição"
			/>

			<SegmentedControl<Aba> value={aba} onChange={setAba} segments={abas} />

			<div>
				{aba === "dashboard" && <EscolaDashboard instId={instId} refreshKey={refreshKey} />}
				{aba === "nova" && (
					<EscolaOrdemForm
						instId={instId}
						setores={setores}
						precos={precos}
						onCriada={() => { setRefreshKey((k) => k + 1); setAba("ordens"); }}
						onDadosMudaram={recarregarConfig}
					/>
				)}
				{aba === "ordens" && <EscolaOrdensList instId={instId} setores={setores} refreshKey={refreshKey} />}
				{aba === "faturas" && <EscolaFaturas instId={instId} refreshKey={refreshKey} />}
				{aba === "relatorios" && <EscolaRelatorios instId={instId} />}
				{aba === "config" && (
					<EscolaConfig instId={instId} precos={precos} setores={setores} onChanged={recarregarConfig} />
				)}
			</div>
		</div>
	);
};
