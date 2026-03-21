import React from 'react';

export const Badge = ({ status }: { status: string }) => {
	const styles: Record<string, string> = {
		'ABERTA': 'bg-indigo-50 text-indigo-700 border border-indigo-200/60 ring-1 ring-indigo-500/10',
		'CONCLUIDA': 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 ring-1 ring-emerald-500/10',
		'CANCELADA': 'bg-slate-100 text-slate-600 border border-slate-200 ring-1 ring-slate-500/10',
		'PAGO': 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 ring-1 ring-emerald-500/10',
		'PENDENTE': 'bg-orange-50 text-orange-700 border border-orange-200/60 ring-1 ring-orange-500/10',
		'NAO_PAGO': 'bg-red-50 text-red-700 border border-red-200/60 ring-1 ring-red-500/10',
		'PARCIAL': 'bg-amber-50 text-amber-700 border border-amber-200/60 ring-1 ring-amber-500/10'
	};
	return (
		<span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
			{status.replace('_', ' ')}
		</span>
	);
};
