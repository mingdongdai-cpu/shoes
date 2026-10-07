export type OrderLanguage = 'fr' | 'zh' | 'en';

export function orderText(language: OrderLanguage, fr: string, zh: string, en: string): string {
  return { fr, zh, en }[language];
}
