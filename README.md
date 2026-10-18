# maga-curve-web

Интерактивное сложение точек эллиптической кривой над конечным полем `𝔽_p`.

- **`modk-add.html`** — переписанная копия страницы Andrea Corbellini
  [Elliptic Curve point addition (𝔽ₚ)](https://andrea.corbellini.name/ecc/interactive/modk-add.html)
  (кривая Вейерштрасса `y² = x³ + ax + b`); по умолчанию — та же игрушечная кривая в форме Вейерштрасса `y² = x³ + 18x + 14` над `𝔽_29`. Поведение сверено с оригинальным `ec.js`.
- **`montgomery-add.html`** — то же для формы Монтгомери `By² = x³ + Ax² + x`;
  по умолчанию — игрушечная кривая магистерской диссертации (`p = 29`, `A = 6`,
  `#E = 40 = 8·5`, `G = (9, 8)`, аналог X25519) с ходом вычисления по шагам.

Живая версия: <http://217.114.238.97:8083/>.

## Запуск

```bash
npm test        # тесты (Node.js ≥ 20, без зависимостей)
npm run serve   # http://localhost:8083/
```

Инструкции для разработки — [CLAUDE.md](CLAUDE.md) и `docs/`.

## Лицензия

MIT. Исходная страница © Andrea Corbellini (MIT), см. [LICENSE](LICENSE).
