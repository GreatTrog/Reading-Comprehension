const questions = [
  {
    id: 1,
    type: "mcq",
    text: "Why do the villagers of Gullhaven feel connected to Lantern Point Lighthouse?",
    options: [
      "They believe the light can predict when storms will end.",
      "They rely on its steady beam for safety and guidance.",
      "They use the tower as a meeting place during festivals.",
      "They think it hides a treasure beneath the lamp room."
    ],
    correctIndex: 1,
    answer: null,
    bookmarked: false
  },
  {
    id: 2,
    type: "short",
    text: "List two unusual supplies that Rafi noticed being delivered to the lighthouse.",
    markingConfig: {
      requiredPatterns: [
        "\\bclockwork\\b",
        "\\bcopper\\s+wire\\b",
        "\\bglow\\s*lantern\\s*algae\\b"
      ],
      fuzzyKeywords: ["clockwork parts", "copper wire", "glow lantern algae"],
      fuzzyThreshold: 0.82
    },
    answer: "",
    bookmarked: false
  },
  {
    id: 3,
    type: "mcq",
    text: 'What is the best meaning of the phrase "questions as tall as the tide" describing Rafi?',
    options: [
      "He is worried about the sea level rising.",
      "He is curious and full of big ideas.",
      "He is too busy to listen to stories.",
      "He enjoys climbing the lighthouse stairs."
    ],
    correctIndex: 1,
    answer: null,
    bookmarked: false
  },
  {
    id: 4,
    type: "mcq",
    text: "Which detail shows that Mrs. Calder is protective of her invention?",
    options: [
      "She orders glow-lantern algae from distant harbors.",
      "She works only during the brightest part of the day.",
      "She refuses to sell the contraption to visitors.",
      "She asks the villagers to guard the lighthouse."
    ],
    correctIndex: 2,
    answer: null,
    bookmarked: false
  },
  {
    id: 5,
    type: "short",
    text: "Explain in one or two sentences what promise Mrs. Calder keeps through her work.",
    markingConfig: {
      requiredPatterns: [
        "\\bguide\\b.*\\btraveler(s)?\\b",
        "\\bhelp\\b.*\\beveryone\\b",
        "\\blight\\b.*\\beveryone\\b"
      ],
      fuzzyKeywords: [
        "guide every traveler",
        "help every traveler",
        "guide every ship",
        "light belongs to everyone"
      ],
      fuzzyThreshold: 0.8
    },
    answer: "",
    bookmarked: false
  },
  {
    id: 6,
    type: "mcq",
    text: "What is the primary function of the new contraption Rafi discovers?",
    options: [
      "To make the lighthouse ring bells during storms.",
      "To bend the light so it can reach ships hidden in fog.",
      "To store extra food for the keepers.",
      "To send coded messages to the village."
    ],
    correctIndex: 1,
    answer: null,
    bookmarked: false
  },
  {
    id: 7,
    type: "mcq",
    text: "Which paragraph is mainly about preparing for the coming winter storms?",
    options: [
      "The opening description of Gullhaven.",
      "The Midnight Experiment with the mirrors.",
      "The Looking Ahead section at the end.",
      "The paragraph about Rafi's arrival."
    ],
    correctIndex: 2,
    answer: null,
    bookmarked: false
  },
  {
    id: 8,
    type: "short",
    text: "How do the villagers react to the lighthouse during the blizzard, and what does this show about their feelings?",
    markingConfig: {
      requiredPatterns: [
        "\\bfelt\\b.*\\bsafe\\b",
        "\\bfeel\\b.*\\breassured\\b",
        "\\bwatch(ed)?\\b.*\\bbeam\\b.*\\bsafe\\b"
      ],
      fuzzyKeywords: ["felt safe", "felt reassured", "felt protected"],
      fuzzyThreshold: 0.8
    },
    answer: "",
    bookmarked: false
  },
  {
    id: 9,
    type: "boolean",
    text: "True or False: Mrs. Calder plans to keep the lighthouse's new light-bending method a secret from everyone, including sailors.",
    options: ["True", "False"],
    correctIndex: 1,
    answer: null,
    bookmarked: false
  }
];

const STOPWORDS = new Set(["the", "a", "an", "their", "to", "of", "and", "for"]);

let currentQuestionIndex = 0;
let isMarked = false;

document.addEventListener("DOMContentLoaded", () => {
  const questionListEl = document.getElementById("question-list");
  const questionProgressEl = document.getElementById("question-progress");
  const questionTitleEl = document.getElementById("question-title");
  const questionTextEl = document.getElementById("question-text");
  const answerAreaEl = document.getElementById("answer-area");
  const bookmarkBtn = document.getElementById("bookmark-btn");
  const backBtn = document.getElementById("back-btn");
  const nextBtn = document.getElementById("next-btn");
  const markWarningEl = document.getElementById("mark-warning");
  const markWarningMessage = document.getElementById("mark-warning-message");
  const confirmMarkBtn = document.getElementById("confirm-mark-btn");
  const cancelMarkBtn = document.getElementById("cancel-mark-btn");
  const resultsPanelEl = document.getElementById("results-panel");
  const questionFeedbackEl = document.getElementById("question-feedback");

  function renderSidebar() {
    questionListEl.innerHTML = "";
    questions.forEach((question, index) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "question-nav-btn";

      if (index === currentQuestionIndex) {
        button.classList.add("current");
      }

      if (question.bookmarked) {
        button.classList.add("bookmarked");
      }

      const labelSpan = document.createElement("span");
      labelSpan.className = "question-label";
      labelSpan.textContent = `Question ${question.id}`;

      const statusSpan = document.createElement("span");
      statusSpan.className = "status-icon";
      const status = getQuestionStatus(question);
      if (status) {
        statusSpan.textContent = status.icon;
        statusSpan.classList.add(status.className);
      } else {
        statusSpan.classList.add("empty");
      }

      const bookmarkSpan = document.createElement("span");
      bookmarkSpan.className = "bookmark-indicator";
      bookmarkSpan.textContent = question.bookmarked ? "🚩" : "";
      bookmarkSpan.setAttribute("aria-hidden", "true");

      button.addEventListener("click", () => {
        currentQuestionIndex = index;
        renderQuestion();
        renderSidebar();
      });

      button.append(labelSpan, statusSpan, bookmarkSpan);
      listItem.appendChild(button);
      questionListEl.appendChild(listItem);
    });
  }

  function getQuestionStatus(question) {
    if (!isMarked || typeof question.score !== "number" || !question.maxScore) {
      return null;
    }

    if (!hasAnswer(question)) {
      return null;
    }

    const correct = question.score === question.maxScore;
    return {
      icon: correct ? "✅" : "❌",
      className: correct ? "correct" : "incorrect"
    };
  }

  function renderQuestion() {
    const question = questions[currentQuestionIndex];
    questionProgressEl.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    questionTitleEl.textContent = `Question ${question.id}`;
    questionTextEl.textContent = question.text;
    answerAreaEl.innerHTML = "";
    hideMarkWarning();

    if (question.type === "mcq" || question.type === "boolean") {
      renderMultipleChoice(question);
    } else if (question.type === "short") {
      renderShortAnswer(question);
    }

    updateBookmarkButton(question);
    updateQuestionFeedback(question);
    updateNavButtons();
  }

  function renderMultipleChoice(question) {
    question.options.forEach((option, optionIndex) => {
      const label = document.createElement("label");
      label.className = "option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `question-${question.id}`;
      input.value = optionIndex;
      input.checked = question.answer === optionIndex;
      input.addEventListener("change", () => {
        question.answer = optionIndex;
        invalidateResults();
      });

      const span = document.createElement("span");
      span.textContent = option;

      label.append(input, span);
      answerAreaEl.appendChild(label);
    });
  }

  function renderShortAnswer(question) {
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Type your answer here...";
    textarea.value = question.answer || "";
    textarea.addEventListener("input", (event) => {
      question.answer = event.target.value;
      invalidateResults();
    });
    answerAreaEl.appendChild(textarea);
  }

  function updateBookmarkButton(question) {
    bookmarkBtn.classList.toggle("active", question.bookmarked);
    bookmarkBtn.setAttribute("aria-pressed", String(question.bookmarked));
    bookmarkBtn.textContent = question.bookmarked ? "🚩 Bookmarked" : "⚑ Bookmark";
  }

  function updateQuestionFeedback(question) {
    if (!questionFeedbackEl) return;
    questionFeedbackEl.className = "question-feedback";

    if (!isMarked || typeof question.score !== "number") {
      questionFeedbackEl.hidden = true;
      questionFeedbackEl.textContent = "";
      return;
    }

    const answered = hasAnswer(question);
    questionFeedbackEl.hidden = false;

    if (!answered) {
      questionFeedbackEl.classList.add("unanswered");
      questionFeedbackEl.textContent = "No answer submitted";
      return;
    }

    const correct = question.score === question.maxScore;
    questionFeedbackEl.classList.add(correct ? "correct" : "incorrect");
    questionFeedbackEl.textContent = correct ? "✅ Correct" : "❌ Incorrect";
  }

  function updateNavButtons() {
    const atFirst = currentQuestionIndex === 0;
    const atLast = currentQuestionIndex === questions.length - 1;
    backBtn.disabled = atFirst;
    nextBtn.disabled = false;

    if (atLast) {
      nextBtn.textContent = "Check answers";
      nextBtn.classList.add("mark-mode");
    } else {
      nextBtn.textContent = "Next";
      nextBtn.classList.remove("mark-mode");
    }
  }

  function showMarkWarning() {
    const message = isMarked
      ? "You have already checked your answers. Checking again will refresh your feedback. Continue?"
      : "You're about to check your answers. You can still go back if you need to change anything.";
    markWarningMessage.textContent = message;
    markWarningEl.hidden = false;
  }

  function hideMarkWarning() {
    markWarningEl.hidden = true;
  }

  function invalidateResults() {
    if (!isMarked) {
      return;
    }
    isMarked = false;
    questions.forEach((question) => {
      delete question.score;
      delete question.maxScore;
    });
    resultsPanelEl.hidden = true;
    resultsPanelEl.innerHTML = "";
    renderSidebar();
    updateQuestionFeedback(questions[currentQuestionIndex]);
  }

  function hasAnswer(question) {
    if (question.type === "short") {
      return Boolean(question.answer && question.answer.trim());
    }
    return typeof question.answer === "number";
  }

  function markAllQuestions() {
    let totalScore = 0;
    let totalMax = 0;

    questions.forEach((question) => {
      const { score, maxScore } = markQuestion(question);
      totalScore += score;
      totalMax += maxScore;
    });

    isMarked = true;
    renderSidebar();
    renderQuestion();
    renderResults(totalScore, totalMax);
    updateNavButtons();
  }

  function markQuestion(question) {
    if (question.type === "mcq" || question.type === "boolean") {
      const maxScore = 1;
      const score = question.answer === question.correctIndex ? 1 : 0;
      question.score = score;
      question.maxScore = maxScore;
      return { score, maxScore };
    }

    if (question.type === "short") {
      const config = question.markingConfig || {};
      const maxScore = config.maxScore ?? 1;
      const correct = checkShortAnswer(question.answer, config);
      const score = correct ? maxScore : 0;
      question.score = score;
      question.maxScore = maxScore;
      return { score, maxScore };
    }

    question.score = 0;
    question.maxScore = 0;
    return { score: 0, maxScore: 0 };
  }

  function renderResults(totalScore, totalMax) {
    const heading = document.createElement("h3");
    heading.textContent = "Results";

    const summary = document.createElement("p");
    summary.className = "result-summary";
    summary.textContent = `You scored ${totalScore} out of ${totalMax}.`;

    const fragment = document.createDocumentFragment();

    questions.forEach((question) => {
      const resultItem = document.createElement("div");
      resultItem.classList.add("result-item");

      const answered = hasAnswer(question);
      if (question.score === question.maxScore && question.maxScore > 0) {
        resultItem.classList.add("correct");
      } else if (answered) {
        resultItem.classList.add("incorrect");
      } else {
        resultItem.classList.add("review");
      }

      const title = document.createElement("h4");
      title.textContent = `Question ${question.id}`;

      const detail = document.createElement("p");
      detail.className = "result-detail";
      detail.textContent = buildResultDetail(question, answered);

      resultItem.append(title, detail);
      fragment.appendChild(resultItem);
    });

    resultsPanelEl.innerHTML = "";
    resultsPanelEl.append(heading, summary, fragment);
    resultsPanelEl.hidden = false;
    resultsPanelEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildResultDetail(question, answered) {
    if (question.type === "mcq" || question.type === "boolean") {
      if (!answered) {
        return `No answer submitted. Correct answer: ${question.options[question.correctIndex]}.`;
      }
      if (question.score === question.maxScore) {
        return "Correct!";
      }
      const chosen = question.options[question.answer];
      return `Not quite. You chose: ${chosen}. Correct answer: ${question.options[question.correctIndex]}.`;
    }

    if (question.type === "short") {
      if (!answered) {
        return "No answer submitted. Try mentioning key details from the passage.";
      }
      if (question.score === question.maxScore) {
        return "Great explanation! You included the key idea.";
      }
      const hints = question.markingConfig?.fuzzyKeywords
        ?.slice(0, 2)
        .join(", ");
      return hints
        ? `Needs another detail. Try including: ${hints}.`
        : "Needs another detail from the passage.";
    }

    return "This question type is not marked automatically.";
  }

  bookmarkBtn.addEventListener("click", () => {
    const question = questions[currentQuestionIndex];
    question.bookmarked = !question.bookmarked;
    updateBookmarkButton(question);
    renderSidebar();
  });

  backBtn.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex -= 1;
      renderQuestion();
      renderSidebar();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentQuestionIndex === questions.length - 1) {
      showMarkWarning();
      return;
    }
    currentQuestionIndex += 1;
    renderQuestion();
    renderSidebar();
  });

  cancelMarkBtn.addEventListener("click", hideMarkWarning);
  confirmMarkBtn.addEventListener("click", () => {
    hideMarkWarning();
    markAllQuestions();
  });

  renderSidebar();
  renderQuestion();
});

function normalize(text) {
  if (!text) return "";
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/[^\w\s]/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();
  const tokens = normalized
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token));
  return tokens.join(" ");
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarityRatio(a, b) {
  if (!a && !b) return 1;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

function checkShortAnswer(answer, config = {}) {
  if (Array.isArray(config.acceptablePoints) && config.acceptablePoints.length) {
    return config.acceptablePoints.some((point) => checkShortAnswer(answer, point));
  }

  const normalized = normalize(answer);
  if (!normalized) return false;

  const patterns = config.requiredPatterns || [];
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, "i");
    if (regex.test(normalized)) {
      return true;
    }
  }

  const keywords = config.fuzzyKeywords || [];
  const threshold = config.fuzzyThreshold ?? 0.85;
  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);
    if (!normalizedKeyword) continue;
    const wholeRatio = similarityRatio(normalized, normalizedKeyword);
    if (wholeRatio >= threshold) {
      return true;
    }
    const tokens = normalized.split(" ");
    for (const token of tokens) {
      const tokenRatio = similarityRatio(token, normalizedKeyword);
      if (tokenRatio >= threshold) {
        return true;
      }
    }
  }

  return false;
}
