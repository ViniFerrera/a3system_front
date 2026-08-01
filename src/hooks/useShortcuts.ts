import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import { Shortcut, MAX_SHORTCUTS } from "@/components/shortcuts/shortcutTypes";

/** Cache local da gaveta — mesma string usada na leitura e na escrita. */
const chaveCache = (chave: string) => `a3_${chave}`;

const lerCache = (chave: string): Shortcut[] => {
	if (!chave) return [];
	try {
		const cru = localStorage.getItem(chaveCache(chave));
		return cru ? (JSON.parse(cru) as Shortcut[]) : [];
	} catch {
		return [];
	}
};

/**
 * Atalhos ficam em `app_config` sob a chave `shortcuts_<email>`, pelas rotas
 * genéricas de config que já existem — sem mudança de schema, e o conjunto
 * acompanha o usuário entre computadores. O cache local existe só para a
 * gaveta aparecer preenchida antes da resposta do servidor.
 */
export const useShortcuts = (email?: string) => {
	const chave = email ? `shortcuts_${email}` : "";
	const cacheKey = chaveCache(chave);

	// O e-mail só chega depois que o token é decodificado, então o estado
	// inicial quase sempre nasce vazio; quem preenche a partir do cache é o
	// efeito abaixo, no mesmo passo em que dispara a busca no servidor.
	const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => lerCache(chave));

	useEffect(() => {
		if (!chave) return;
		const doCache = lerCache(chave);
		if (doCache.length > 0) setShortcuts(doCache);
		api
			.get(`/config/${chave}`)
			.then((res) => {
				if (!res.data?.value) return;
				const lista = JSON.parse(res.data.value) as Shortcut[];
				setShortcuts(lista);
				localStorage.setItem(chaveCache(chave), JSON.stringify(lista));
			})
			.catch(() => {
				/* sem atalhos salvos ainda — mantém o que veio do cache */
			});
	}, [chave]);

	const persistir = useCallback(
		async (lista: Shortcut[]) => {
			const limitada = lista.slice(0, MAX_SHORTCUTS);
			setShortcuts(limitada);
			localStorage.setItem(cacheKey, JSON.stringify(limitada));
			if (!chave) return;
			await api.post("/config", { key: chave, value: JSON.stringify(limitada) });
		},
		[chave, cacheKey]
	);

	const adicionar = useCallback(
		(s: Shortcut) => persistir([...shortcuts, s]),
		[shortcuts, persistir]
	);

	const remover = useCallback(
		(id: string) => persistir(shortcuts.filter((s) => s.id !== id)),
		[shortcuts, persistir]
	);

	const mover = useCallback(
		(id: string, direcao: -1 | 1) => {
			const i = shortcuts.findIndex((s) => s.id === id);
			const j = i + direcao;
			if (i < 0 || j < 0 || j >= shortcuts.length) return Promise.resolve();
			const lista = [...shortcuts];
			[lista[i], lista[j]] = [lista[j], lista[i]];
			return persistir(lista);
		},
		[shortcuts, persistir]
	);

	return { shortcuts, adicionar, remover, mover, cheio: shortcuts.length >= MAX_SHORTCUTS };
};
