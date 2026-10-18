# maga-curve-web

Интерактивное сложение точек эллиптической кривой над конечным полем `𝔽_p`.

- **`modk-add.html`** — переписанная копия страницы Andrea Corbellini
  [Elliptic Curve point addition (𝔽ₚ)](https://andrea.corbellini.name/ecc/interactive/modk-add.html)
  (кривая Вейерштрасса `y² = x³ + ax + b`); по умолчанию — та же кривая диссертации в форме Вейерштрасса `y² = x³ + 18x + 14` над `𝔽_29`. Поведение сверено с оригинальным `ec.js`.
- **`montgomery-add.html`** — то же для формы Монтгомери `By² = x³ + Ax² + x`;
  по умолчанию — кривая магистерской диссертации (`p = 29`, `A = 6`,
  `#E = 40 = 8·5`, `G = (9, 8)`, аналог X25519) с ходом вычисления по шагам.

- **`reals-add.html`, `reals-mul.html`** — сложение и умножение точки на число над ℝ
  (по мотивам тех же страниц Corbellini, сверено с оригинальным `ec.js`).

- **`montgomery-mul.html`** — умножение точки на число над `𝔽_p` бинарным методом по шагам (ключ `d = 538` из ручного прогона).

Живая версия — страница gateway: <http://217.114.238.97/u/admin/maga-curve-web/>
(в домашней сети <http://192.168.0.147:8082/u/admin/maga-curve-web/>).

## Запуск

```bash
npm test        # тесты (Node.js ≥ 20, без зависимостей)
npm run serve   # http://localhost:8083/
```

Инструкции для разработки — [CLAUDE.md](CLAUDE.md) и `docs/`.

## Лицензия

MIT. Исходная страница © Andrea Corbellini (MIT), см. [LICENSE](LICENSE).
