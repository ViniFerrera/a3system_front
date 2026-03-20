import { PriceRule, Expense } from '@/types';

export const Utils = {
    parseCSV: (text: string): PriceRule[] => {
        const lines = text.split('\n').filter(l => l.trim() !== '');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map((line, idx) => {
            const values = line.split(',');
            const entry: any = {};
            headers.forEach((h, i) => entry[h] = values[i]?.trim());
            const spec = entry['Especificacao'] || '';
            const gramatura = entry['Gramatura'] || '';
            const regra = entry['Regra'] || spec; 
            let min = 0, max = 9999999, isRange = false;
            if (entry['Faixa_Min'] || entry['Faixa_Max']) {
                min = parseInt(entry['Faixa_Min']) || 0;
                max = parseInt(entry['Faixa_Max']) || 9999999;
                isRange = true;
            } 
            else if (regra.toLowerCase().includes('acima de')) { const num = parseInt(regra.replace(/\D/g, '')) || 0; min = num + 1; isRange = true; } 
            else if (regra.includes(' a ') && regra.includes('pag')) { const parts = regra.match(/(\d+)\s*a\s*(\d+)/); if (parts) { min = parseInt(parts[1]); max = parseInt(parts[2]); isRange = true; } }
            const valor = parseFloat(entry['Valor_Cliente']) || 0;
            return { id: idx + 1, ...entry, Especificacao: regra, Gramatura: gramatura, _min: min, _max: max, _isRange: isRange, Valor_Cliente: valor, valorOriginal: valor, lucroPct: 0 } as PriceRule;
        });
    },
    parseExpensesCSV: (text: string): Expense[] => {
        const lines = text.split('\n').filter(l => l.trim() !== '');
        if (lines.length < 2) return [];
        const delimiter = lines[0].indexOf(';') !== -1 ? ';' : ',';
        return lines.slice(1).map((line, idx) => {
            let values: string[] = [];
            if (delimiter === ';') { values = line.split(';').map(v => v.trim().replace(/^"|"$/g, '')); } 
            else { const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []; values = matches.map(v => v.replace(/^"|"$/g, '').trim()); if (values.length < 2) values = line.split(','); }
            const produto = values[0] || 'Despesa sem nome';
            const obs = values[1];
            const vencimento = values[2] || new Date().toISOString().split('T')[0];
            let valorStr = values[3] || '0';
            if (valorStr.includes(',') && !valorStr.includes('US')) { valorStr = valorStr.replace('.', '').replace(',', '.'); }
            const valor = parseFloat(valorStr) || 0;
            return { id: Date.now() + idx, produto, obs, vencimento, valor, status: 'PENDENTE' };
        });
    },
    downloadCSVTemplate: () => { 
        const headers = ['Servico', 'Material', 'Papel', 'Cor', 'Regra', 'Especificacao', 'Faixa_Min', 'Faixa_Max', 'Valor_Cliente'];
        const exampleRow = ['Impressao', 'Couche', 'A3', 'Colorido', 'Flyer', '115g', '1', '50', '4.45'];
        const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'modelo_tabela_precos_v3.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    downloadExpensesTemplate: () => { 
        const headers = ['Produto', 'Obs.', 'Vencimento', 'Valor'];
        const exampleRow = ['Aluguel', 'Referente mês anterior', '2023-12-10', '1500.00'];
        const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'modelo_contas_pagar.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    calculatePrice: (priceTable: PriceRule[], servico: string, material: string, cor: string, qtd: number, gramatura?: string, tamanho?: string) => {
        if (!servico || !material || !cor || !qtd) return { unit: 0, total: 0, rule: null };
        let candidates = priceTable.filter(p => p.Servico === servico && p.Material === material && p.Cor === cor);
        if (gramatura) { candidates = candidates.filter(p => p.Gramatura === gramatura); }
        if (tamanho) { candidates = candidates.filter(p => p.Papel === tamanho); }
        let match = candidates.find(c => c._isRange && qtd >= c._min && qtd <= c._max);
        if (!match && candidates.length > 0) { match = candidates.find(c => !c._isRange) || candidates[0]; }
        if (match) { return { unit: match.Valor_Cliente, total: match.Valor_Cliente * qtd, rule: match.Especificacao }; }
        return { unit: 0, total: 0, rule: 'Não encontrado' };
    },
    formatCurrency: (value: number) => { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); },
    formatDateTime: (dateString?: string) => { if (!dateString) return '-'; const date = new Date(dateString); if (isNaN(date.getTime())) return '-'; return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(date); },
    formatDate: (dateString?: string) => { if (!dateString) return '-'; if (dateString.includes('-')) { const [year, month, day] = dateString.split('-'); return `${day}/${month}/${year}`; } return new Date(dateString).toLocaleDateString('pt-BR'); },
    /** Retorna datetime local (BRT) sem sufixo Z — para armazenar como hora local */
    localIsoNow: () => {
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
};