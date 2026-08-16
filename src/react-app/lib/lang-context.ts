import { createContext, useContext } from "react";
import type { Copy, Lang } from "./i18n";

export interface LangValue {
	lang: Lang;
	t: Copy;
	setLang: (lang: Lang) => void;
}

export const LangContext = createContext<LangValue | null>(null);

export function useLang(): LangValue {
	const value = useContext(LangContext);
	if (!value) throw new Error("useLang phải nằm trong LangProvider");
	return value;
}
