# kuixl.github.io

Портфолио веб-дизайнера Константина Даровского. Две языковые версии, четыре работы, кейсы с разбором решений.

**Живой сайт:** https://kuixl.github.io

## Стек

- Astro 5, статическая сборка
- Tailwind 4 с токенами в CSS
- GSAP + ScrollTrigger для появлений и закреплённого просмотра работ
- Lenis для плавной прокрутки
- three.js в проекте nichive, не в самом портфолио
- sharp для конвейера изображений

Шрифты свои: Switzer и Sligoil Micro для латиницы, Onest и JetBrains Mono подставляются под кириллицу через `unicode-range`.

## Запуск

```bash
cd site
npm install
npm run dev
```

Откроется на http://localhost:4321. Сборка в `dist/`:

```bash
npm run build
npm run preview
```

## Параметры для отладки

| | |
|---|---|
| `?replay` | проиграть прелоадер заново |
| `?motion` | включить анимации, если в системе они выключены |

Оба запоминаются на сессию.

## Конвейер изображений

Скрипты запускаются вручную, не на каждой сборке.

```bash
node scripts/optimize-shots.mjs   # captures/ -> public/works/, webp + миниатюры
node scripts/dither.mjs           # растр Bayer 8x8 под каждую ширину показа
node scripts/og.mjs               # карточка для соцсетей на каждую страницу
```

`og.mjs` читает заголовки и описания из собранных страниц, поэтому порядок такой: `npm run build`, затем `node scripts/og.mjs`, затем `npm run build` ещё раз.

Исходные скриншоты лежат в `captures/` вне `public/`: всё внутри `public/` попадает в сборку целиком.

## Структура

```
site/src/
  components/   Home, CasePage, CaseSection, WorkFrame
  data/         тексты и подписи, отдельно en и ru
  scripts/      прелоадер, появления, звук, поведение окна работ
  styles/       токены и базовые стили
```

Тексты живут в `data/`, а не в разметке, чтобы две языковые версии не разъезжались по вёрстке.

## Деплой

GitHub Actions собирает и публикует на Pages при пуше в `main`.
