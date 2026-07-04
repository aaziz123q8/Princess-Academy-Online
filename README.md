# Princess Academy Online 👑

A magical, kid-friendly browser game where young princesses learn, play, and earn crowns. Built as a single self-contained website — **no build step, no dependencies** — so it runs anywhere just by opening `index.html`.

## ✨ Features

The academy has four classrooms, all tied together by a **crown reward system** and progress that's saved to the browser (`localStorage`):

| Classroom | What it does |
|-----------|--------------|
| 👗 **Dress-Up Studio** | Design a royal look — pick a crown, hair color, and dress color on a CSS-drawn doll. Save your look for crowns. |
| 🧠 **Royal Quiz** | A 5-question trivia round drawn from a bigger question bank, with shuffled answers and a perfect-score bonus. |
| 🃏 **Memory Match** | Classic 4×4 flip-and-match game. Fewer moves = more crowns. |
| 🫖 **Etiquette Class** | Gentle "choose the kindest response" scenarios that teach good manners. |

## 🚀 Running it

No install needed. Either:

- **Just open it:** double-click `index.html`, or
- **Serve it locally** (recommended, avoids any browser file restrictions):

  ```bash
  python3 -m http.server 8000
  # then visit http://localhost:8000
  ```

## 🗂️ Project structure

```
index.html   — markup for all screens
styles.css   — theme, layout, animations (pink & purple, sparkly)
script.js    — game logic for all four activities + crown/save system
```

## 🧩 Extending it

The activities are data-driven, so adding content is easy — edit the arrays near the top of each section in `script.js`:

- `quizBank` — add `{ q, a: [...], correct }` objects for more trivia.
- `mannersBank` — add `{ s, opts: [...], correct, good }` scenarios.
- `dressOptions` — add crowns/hair/dress colors to the Dress-Up Studio.
- `memoryIcons` — swap the emoji used in Memory Match.

## 🔒 Privacy

Everything runs locally in the browser. The only data stored is your crown count and saved look, kept on your own device via `localStorage`. Nothing is sent anywhere.
