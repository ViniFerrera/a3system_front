/**
 * Período de serviço vigente da escola (ciclo 11 → 10). Datas em YYYY-MM-DD,
 * timezone-safe (lê componentes locais, nunca new Date("YYYY-MM-DD")).
 */
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m1a12: number, d: number) => `${y}-${pad(m1a12)}-${pad(d)}`;

export function periodoVigenteEscola(hoje = new Date()): { inicio: string; fim: string } {
	const y = hoje.getFullYear();
	const m = hoje.getMonth() + 1; // 1..12
	const dia = hoje.getDate();
	if (dia >= 11) {
		const prox = new Date(y, m, 1); // 1º do mês seguinte
		return { inicio: ymd(y, m, 11), fim: ymd(prox.getFullYear(), prox.getMonth() + 1, 10) };
	}
	const ant = new Date(y, m - 2, 1); // 1º do mês anterior
	return { inicio: ymd(ant.getFullYear(), ant.getMonth() + 1, 11), fim: ymd(y, m, 10) };
}
