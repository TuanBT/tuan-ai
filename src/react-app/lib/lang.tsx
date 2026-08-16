import { useCallback, useMemo, useState, type ReactNode } from "react";
import { copy, initialLang, saveLang, type Lang } from "./i18n";
import { LangContext, type LangValue } from "./lang-context";

export function LangProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>(() => initialLang());

	const setLang = useCallback((next: Lang) => {
		setLangState(next);
		saveLang(next);
		document.documentElement.lang = next;
	}, []);

	const value = useMemo<LangValue>(
		() => ({ lang, t: copy[lang], setLang }),
		[lang, setLang],
	);

	return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
