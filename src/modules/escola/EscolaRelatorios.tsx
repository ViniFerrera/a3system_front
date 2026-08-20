import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { CalendarDays, CalendarRange, Download } from "lucide-react";
import { EscolaApi } from "@/services/escolaApi";

const mesCorrente = () => {
	const n = new Date();
	return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};
const hoje = () => new Date().toISOString().slice(0, 10);

interface Props {
	instId: number;
}

export const EscolaRelatorios: React.FC<Props> = ({ instId }) => {
	const toast = useToast();
	const loading = useLoading();
	const [competencia, setCompetencia] = useState(mesCorrente);
	const [ate, setAte] = useState(hoje);
	const [ocupado, setOcupado] = useState<"" | "semanal" | "mensal">("");

	const baixar = async (tipo: "semanal" | "mensal") => {
		setOcupado(tipo);
		loading.show("Gerando relatório...");
		try {
			const periodo = tipo === "mensal" ? competencia : ate;
			const blob = await EscolaApi.baixarRelatorio(instId, tipo, periodo);
			const url = URL.createObjectURL(blob as Blob);
			window.open(url, "_blank");
			setTimeout(() => URL.revokeObjectURL(url), 60000);
		} catch (e: any) {
			toast.error(e?.response?.data?.details || "Erro ao gerar relatório.");
		} finally {
			setOcupado("");
			loading.hide();
		}
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<Card className="p-5">
				<div className="flex items-center gap-2 mb-2">
					<CalendarRange className="w-5 h-5 text-primary-600" />
					<h3 className="text-sm font-bold text-ink">Relatório semanal</h3>
				</div>
				<p className="text-xs text-ink-muted mb-4">Ordens dos 7 dias anteriores à data escolhida, por setor, com quantidades e valores.</p>
				<div className="flex items-end gap-3">
					<div>
						<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">Até</p>
						<input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
							className="h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-[10px]" />
					</div>
					<Button icon={<Download className="w-4 h-4" />} loading={ocupado === "semanal"} onClick={() => baixar("semanal")}>
						Baixar PDF
					</Button>
				</div>
			</Card>

			<Card className="p-5">
				<div className="flex items-center gap-2 mb-2">
					<CalendarDays className="w-5 h-5 text-primary-600" />
					<h3 className="text-sm font-bold text-ink">Relatório mensal</h3>
				</div>
				<p className="text-xs text-ink-muted mb-4">Mês completo, por setor, no layout de fechamento (data, nº, A4/A3, solicitante, cópias, valor). Gera/atualiza a fatura.</p>
				<div className="flex items-end gap-3">
					<div>
						<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">Competência</p>
						<input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)}
							className="h-8 px-2.5 text-sm bg-white border border-slate-200 rounded-[10px]" />
					</div>
					<Button icon={<Download className="w-4 h-4" />} loading={ocupado === "mensal"} onClick={() => baixar("mensal")}>
						Baixar PDF
					</Button>
				</div>
			</Card>
		</div>
	);
};
