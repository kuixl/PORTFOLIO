/** Section names and chrome for case pages, per language. */
import type { Lang } from './home';

export const caseLabels: Record<Lang, Record<string, string>> = {
  en: {
    result: 'Result',
    work: 'The work',
    brief: 'The brief',
    broken: 'Broken',
    role: 'My role',
    research: 'Research',
    decisions: 'Decisions',
    screens: 'Screens',
    system: 'System',
    judges: 'Judges',
    retro: 'Retro',
    next: 'NEXT',
    contact: 'CONTACT',
  },
  ru: {
    result: 'Результат',
    work: 'Работа',
    brief: 'Задача',
    broken: 'Что было сломано',
    role: 'Моя роль',
    research: 'Исследование',
    decisions: 'Решения',
    screens: 'Экраны',
    system: 'Система',
    judges: 'Жюри',
    retro: 'Ретро',
    next: 'ДАЛЬШЕ',
    contact: 'КОНТАКТЫ',
  },
};
