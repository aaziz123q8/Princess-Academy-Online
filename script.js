/* ===== Princess Academy Online — game logic ===== */
(function () {
  "use strict";

  /* ---------- State & persistence ---------- */
  const SAVE_KEY = "princessAcademy.v1";
  const defaultState = {
    crowns: 0,
    look: { crown: "👑", hair: "#6b3f2a", dress: "var(--pink-300)" },
  };
  const state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return Object.assign({}, defaultState, JSON.parse(raw));
    } catch (e) {
      /* ignore corrupt save */
    }
    return JSON.parse(JSON.stringify(defaultState));
  }
  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage may be unavailable; game still works in-memory */
    }
  }

  /* ---------- Small helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function addCrowns(n) {
    state.crowns += n;
    saveState();
    renderCrowns();
    if (n > 0) toast(`+${n} 👑 earned!`);
  }
  function renderCrowns() {
    $("#crownCount").textContent = state.crowns;
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  /* ---------- Navigation ---------- */
  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-goto]");
    if (nav) showScreen(nav.getAttribute("data-goto"));
  });

  /* ---------- Greeting ---------- */
  function setGreeting() {
    const h = new Date().getHours();
    const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
    $("#greeting").textContent = `Good ${part}, Your Highness! You have ${state.crowns} crown${state.crowns === 1 ? "" : "s"}.`;
  }

  /* ================================================================
   *  DRESS-UP STUDIO
   * ============================================================== */
  const dressOptions = {
    crown: ["👑", "🎀", "💎", "🌸", "⭐", "🦋"],
    hair: ["#6b3f2a", "#2b2b2b", "#e9b44c", "#c1440e", "#8e44ad", "#e67ea3"],
    dress: [
      "var(--pink-300)",
      "var(--purple-400)",
      "#7ec8e3",
      "#8fd694",
      "#ffd166",
      "#ff8fab",
    ],
  };
  let lookRewardedThisVisit = false;

  function buildSwatches() {
    $$(".swatches").forEach((container) => {
      const layer = container.getAttribute("data-layer");
      container.innerHTML = "";
      dressOptions[layer].forEach((val) => {
        const sw = document.createElement("button");
        sw.className = "swatch";
        if (layer === "crown") {
          sw.textContent = val;
        } else {
          sw.style.background = val;
        }
        if (state.look[layer] === val) sw.classList.add("selected");
        sw.addEventListener("click", () => {
          state.look[layer] = val;
          saveState();
          applyLook();
          $$(".swatch", container).forEach((s) => s.classList.remove("selected"));
          sw.classList.add("selected");
        });
        container.appendChild(sw);
      });
    });
  }

  function applyLook() {
    $("#layer-crown").textContent = state.look.crown;
    $("#layer-hair").style.background = state.look.hair;
    $("#layer-dress").style.borderTopColor = state.look.dress;
  }

  $("#saveLookBtn").addEventListener("click", () => {
    if (!lookRewardedThisVisit) {
      addCrowns(5);
      lookRewardedThisVisit = true;
      toast("Gorgeous! Look saved 👗");
    } else {
      toast("Look saved 👗");
    }
    saveState();
  });

  /* ================================================================
   *  ROYAL QUIZ
   * ============================================================== */
  const quizBank = [
    { q: "What do you call a princess's father?", a: ["The King", "The Duke", "The Wizard", "The Knight"], correct: 0 },
    { q: "Which of these is a real castle in Germany?", a: ["Neuschwanstein", "Cinderella Tower", "Sandcastle Bay", "Dragon Keep"], correct: 0 },
    { q: "What sparkly stone is often in a crown?", a: ["Diamond", "Coal", "Brick", "Chalk"], correct: 0 },
    { q: "A group of horses pulling a royal coach is called a...", a: ["Team", "Flock", "School", "Pod"], correct: 0 },
    { q: "What is a baby swan called?", a: ["Cygnet", "Puppy", "Kit", "Foal"], correct: 0 },
    { q: "Which flower is often called the queen of the garden?", a: ["Rose", "Cactus", "Dandelion", "Moss"], correct: 0 },
    { q: "What do you say when someone gives you a gift?", a: ["Thank you", "Go away", "Nothing", "Give me more"], correct: 0 },
    { q: "A royal event with dancing is called a...", a: ["Ball", "Nap", "Race", "Storm"], correct: 0 },
  ];
  let quizOrder = [];
  let quizIndex = 0;
  let quizScore = 0;

  function startQuiz() {
    quizOrder = shuffle([...Array(quizBank.length).keys()]).slice(0, 5);
    quizIndex = 0;
    quizScore = 0;
    $("#quizDone").classList.add("hidden");
    $(".quiz-card").classList.remove("hidden");
    renderQuiz();
  }

  function renderQuiz() {
    const item = quizBank[quizOrder[quizIndex]];
    $("#quizProgress").textContent = `Question ${quizIndex + 1} of ${quizOrder.length}`;
    $("#quizQuestion").textContent = item.q;
    $("#quizFeedback").textContent = "";
    $("#quizNextBtn").classList.add("hidden");
    const answers = $("#quizAnswers");
    answers.innerHTML = "";
    // Shuffle answer order but track the correct one
    const order = shuffle([...Array(item.a.length).keys()]);
    order.forEach((optIdx) => {
      const btn = document.createElement("button");
      btn.className = "answer-btn";
      btn.textContent = item.a[optIdx];
      btn.addEventListener("click", () => handleQuizAnswer(btn, optIdx === item.correct));
      answers.appendChild(btn);
    });
  }

  function handleQuizAnswer(btn, isCorrect) {
    $$("#quizAnswers .answer-btn").forEach((b) => (b.disabled = true));
    if (isCorrect) {
      btn.classList.add("correct");
      $("#quizFeedback").textContent = "Correct! 🎉";
      $("#quizFeedback").style.color = "#2e9e5b";
      quizScore++;
      addCrowns(2);
    } else {
      btn.classList.add("wrong");
      $("#quizFeedback").textContent = "Oops! Not quite.";
      $("#quizFeedback").style.color = "#d34a4a";
      // reveal correct answer
      const item = quizBank[quizOrder[quizIndex]];
      $$("#quizAnswers .answer-btn").forEach((b) => {
        if (b.textContent === item.a[item.correct]) b.classList.add("correct");
      });
    }
    $("#quizNextBtn").classList.remove("hidden");
  }

  $("#quizNextBtn").addEventListener("click", () => {
    quizIndex++;
    if (quizIndex < quizOrder.length) {
      renderQuiz();
    } else {
      $(".quiz-card").classList.add("hidden");
      $("#quizDone").classList.remove("hidden");
      $("#quizScore").textContent = `You scored ${quizScore} out of ${quizOrder.length}!`;
      if (quizScore === quizOrder.length) {
        addCrowns(5);
        toast("Perfect score! +5 bonus 👑");
      }
    }
  });
  $("#quizRestartBtn").addEventListener("click", startQuiz);

  /* ================================================================
   *  MEMORY MATCH
   * ============================================================== */
  const memoryIcons = ["👑", "👗", "🏰", "🦄", "🌹", "💎", "🎀", "🦋"];
  let memFirst = null;
  let memLock = false;
  let memMoves = 0;
  let memPairs = 0;

  function startMemory() {
    memFirst = null;
    memLock = false;
    memMoves = 0;
    memPairs = 0;
    $("#memMoves").textContent = "0";
    $("#memPairs").textContent = "0";
    $("#memoryWin").classList.add("hidden");

    const deck = shuffle([...memoryIcons, ...memoryIcons]);
    const board = $("#memoryBoard");
    board.innerHTML = "";
    deck.forEach((icon) => {
      const card = document.createElement("div");
      card.className = "mem-card";
      card.dataset.icon = icon;
      card.textContent = icon;
      card.addEventListener("click", () => flipCard(card));
      board.appendChild(card);
    });
  }

  function flipCard(card) {
    if (memLock || card.classList.contains("flipped") || card.classList.contains("matched")) return;
    card.classList.add("flipped");

    if (!memFirst) {
      memFirst = card;
      return;
    }

    memMoves++;
    $("#memMoves").textContent = memMoves;

    if (memFirst.dataset.icon === card.dataset.icon) {
      memFirst.classList.add("matched");
      card.classList.add("matched");
      memFirst = null;
      memPairs++;
      $("#memPairs").textContent = memPairs;
      if (memPairs === memoryIcons.length) winMemory();
    } else {
      memLock = true;
      const first = memFirst;
      memFirst = null;
      setTimeout(() => {
        first.classList.remove("flipped");
        card.classList.remove("flipped");
        memLock = false;
      }, 800);
    }
  }

  function winMemory() {
    const reward = Math.max(4, 20 - memMoves); // fewer moves = more crowns
    addCrowns(reward);
    $("#memoryWin").classList.remove("hidden");
    $("#memoryWinText").textContent = `You finished in ${memMoves} moves and earned ${reward} 👑!`;
  }

  $("#memRestartBtn").addEventListener("click", startMemory);

  /* ================================================================
   *  ETIQUETTE CLASS
   * ============================================================== */
  const mannersBank = [
    {
      s: "A guest arrives at the palace. What do you do?",
      opts: ["Greet them warmly and welcome them in", "Ignore them", "Slam the door"],
      correct: 0,
      good: "Yes! A warm welcome makes everyone feel special.",
    },
    {
      s: "Someone accidentally steps on your gown at the ball.",
      opts: ["Yell at them", "Say 'It's alright, no harm done'", "Cry loudly"],
      correct: 1,
      good: "Perfect — kindness and patience are truly royal.",
    },
    {
      s: "You are served a meal you don't love.",
      opts: ["Politely thank the cook anyway", "Throw the plate", "Complain loudly"],
      correct: 0,
      good: "Wonderful! Gratitude is always in fashion.",
    },
    {
      s: "A younger child in the academy is feeling shy.",
      opts: ["Laugh at them", "Invite them to play with you", "Walk away"],
      correct: 1,
      good: "Beautiful! A kind princess lifts others up.",
    },
    {
      s: "You receive a lovely gift from a visiting queen.",
      opts: ["Say nothing", "Say 'Thank you so much!'", "Ask for a bigger one"],
      correct: 1,
      good: "Exactly — a heartfelt thank you means so much.",
    },
  ];
  let mannersIndex = 0;

  function startManners() {
    mannersIndex = 0;
    $("#mannersDone").classList.add("hidden");
    $("#mannersCard").classList.remove("hidden");
    renderManners();
  }

  function renderManners() {
    const item = mannersBank[mannersIndex];
    $("#mannersScenario").textContent = item.s;
    $("#mannersFeedback").textContent = "";
    $("#mannersNextBtn").classList.add("hidden");
    const box = $("#mannersOptions");
    box.innerHTML = "";
    shuffle([...Array(item.opts.length).keys()]).forEach((optIdx) => {
      const btn = document.createElement("button");
      btn.className = "answer-btn";
      btn.textContent = item.opts[optIdx];
      btn.addEventListener("click", () => handleManners(btn, optIdx === item.correct, item));
      box.appendChild(btn);
    });
  }

  function handleManners(btn, isCorrect, item) {
    $$("#mannersOptions .answer-btn").forEach((b) => (b.disabled = true));
    if (isCorrect) {
      btn.classList.add("correct");
      $("#mannersFeedback").textContent = item.good;
      $("#mannersFeedback").style.color = "#2e9e5b";
      addCrowns(3);
    } else {
      btn.classList.add("wrong");
      $("#mannersFeedback").textContent = "A true princess would be kinder. Try to remember for next time!";
      $("#mannersFeedback").style.color = "#d34a4a";
      $$("#mannersOptions .answer-btn").forEach((b) => {
        if (b.textContent === item.opts[item.correct]) b.classList.add("correct");
      });
    }
    $("#mannersNextBtn").classList.remove("hidden");
  }

  $("#mannersNextBtn").addEventListener("click", () => {
    mannersIndex++;
    if (mannersIndex < mannersBank.length) {
      renderManners();
    } else {
      $("#mannersCard").classList.add("hidden");
      $("#mannersDone").classList.remove("hidden");
    }
  });
  $("#mannersRestartBtn").addEventListener("click", startManners);

  /* ---------- Lazy-start activities when their screen opens ---------- */
  const starters = {
    "screen-dressup": () => {
      lookRewardedThisVisit = false;
      applyLook();
    },
    "screen-quiz": startQuiz,
    "screen-memory": startMemory,
    "screen-manners": startManners,
    "screen-home": setGreeting,
  };
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-goto]");
    if (nav && starters[nav.getAttribute("data-goto")]) {
      starters[nav.getAttribute("data-goto")]();
    }
  });

  /* ---------- Utility: Fisher–Yates shuffle ---------- */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---------- Init ---------- */
  renderCrowns();
  setGreeting();
  buildSwatches();
  applyLook();
})();
