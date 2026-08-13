/** Section names and chrome for case pages, per language. */
import type { Lang } from './home';

export const caseLabels: Record<Lang, Record<string, string>> = {
  en: {
    result: 'Result',
    /* "The work" sat above an embedded view of the shipped site, which is a
       different thing from the work described by the rest of the page. */
    work: 'Live site',
    brief: 'The brief',
    broken: 'Broken',
    role: 'My role',
    research: 'Research',
    decisions: 'Decisions',
    screens: 'Screens',
    system: 'System',
    judges: 'Judges',
    /* "Retro" is studio shorthand, and set in caps beside a design portfolio it
       reads as retro styling rather than retrospective. */
    retro: "What I'd change",
    prev: 'Previous case',
    next: 'Next case',
    /* forward from the last case lands on the first: say so rather than let it
       look like the reader is going round in circles by accident */
    nextWrap: 'Back to the first',
    caseNav: 'Other cases',
    allWorks: 'All work',
    contact: 'CONTACT',
    write: 'Write to me',
  },
  ru: {
    result: 'Результат',
    work: 'Живой сайт',
    brief: 'Задача',
    broken: 'Что было сломано',
    role: 'Моя роль',
    research: 'Исследование',
    decisions: 'Решения',
    screens: 'Экраны',
    system: 'Система',
    judges: 'Жюри',
    retro: 'Что бы сделал иначе',
    prev: 'Предыдущий кейс',
    next: 'Следующий кейс',
    nextWrap: 'Сначала',
    caseNav: 'Другие кейсы',
    allWorks: 'Все работы',
    contact: 'КОНТАКТЫ',
    write: 'Написать',
  },
};
