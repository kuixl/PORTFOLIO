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
    next: 'Next case',
    endTitle: 'That was the last case',
    endNote: 'Three projects written up. The fourth you can look through in full.',
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
    next: 'Следующий кейс',
    endTitle: 'Кейсы закончились',
    endNote: 'Разобрано три проекта. Четвёртый можно посмотреть целиком.',
    allWorks: 'Все работы',
    contact: 'КОНТАКТЫ',
    write: 'Написать',
  },
};
