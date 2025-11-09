const DEFAULT_PACK_ID = "ks2_2024_streaky_and_squeaky";
const PACK_MANIFEST_URL = "data/packs.json";
const params = new URLSearchParams(window.location.search);
const requestedPackId = params.get("pack") || DEFAULT_PACK_ID;

const state = {
  packId: requestedPackId,
  currentPack: null,
  questions: [],
  currentQuestionIndex: 0,
  isMarked: false,
  packList: []
};

const dom = {
  questionList: null,
  questionProgress: null,
  questionTitle: null,
  questionText: null,
  answerArea: null,
  bookmarkBtn: null,
  backBtn: null,
  nextBtn: null,
  markWarning: null,
  markWarningMessage: null,
  confirmMarkBtn: null,
  cancelMarkBtn: null,
  resultsPanel: null,
  questionFeedback: null,
  passageTitle: null,
  passageBody: null,
  packSelect: null
};

document.addEventListener("DOMContentLoaded", () => {
  cacheDomReferences();
  attachEventHandlers();
  showLoadingState();

  loadPackList()
    .then((packs) => {
      state.packList = packs;
      renderPackOptions();
      const resolvedPackId = resolveInitialPackId(packs);
      state.packId = resolvedPackId;
      updatePackSelectValue(resolvedPackId);
      setPackSelectDisabled(true);
      return loadPack(resolvedPackId);
    })
    .then((pack) => {
      setPackSelectDisabled(false);
      initAppWithPack(pack);
    })
    .catch((error) => {
      console.error(error);
      setPackSelectDisabled(false);
      const message =
        error && error.code === "PACK_LIST"
          ? "Could not load the list of packs."
          : `Could not load pack: ${state.packId}`;
      showAppError(message);
    });
});

async function loadPackList() {
  const response = await fetch(PACK_MANIFEST_URL, {
    cache: "no-cache"
  });

  if (!response.ok) {
    const error = new Error("Unable to fetch pack manifest.");
    error.code = "PACK_LIST";
    throw error;
  }

  const data = await response.json();
  const packs = data && Array.isArray(data.packs) ? data.packs : null;
  if (!packs) {
    const error = new Error("Pack manifest is missing a packs array.");
    error.code = "PACK_LIST";
    throw error;
  }

  return packs;
}

async function loadPack(id) {
  if (!id) {
    throw new Error("Pack id is required");
  }

  const safeId = encodeURIComponent(id);
  const response = await fetch(`data/${safeId}.json`, {
    cache: "no-cache"
  });

  if (!response.ok) {
    const error = new Error(`Unable to fetch pack: ${id}`);
    error.code = "PACK_LOAD";
    throw error;
  }

  return response.json();
}

function cacheDomReferences() {
  dom.questionList = document.getElementById("question-list");
  dom.questionProgress = document.getElementById("question-progress");
  dom.questionTitle = document.getElementById("question-title");
  dom.questionText = document.getElementById("question-text");
  dom.answerArea = document.getElementById("answer-area");
  dom.bookmarkBtn = document.getElementById("bookmark-btn");
  dom.backBtn = document.getElementById("back-btn");
  dom.nextBtn = document.getElementById("next-btn");
  dom.markWarning = document.getElementById("mark-warning");
  dom.markWarningMessage = document.getElementById("mark-warning-message");
  dom.confirmMarkBtn = document.getElementById("confirm-mark-btn");
  dom.cancelMarkBtn = document.getElementById("cancel-mark-btn");
  dom.resultsPanel = document.getElementById("results-panel");
  dom.questionFeedback = document.getElementById("question-feedback");
  dom.passageTitle = document.getElementById("passage-title");
  dom.passageBody = document.getElementById("passage-body");
  dom.packSelect = document.getElementById("pack-select");
}

function attachEventHandlers() {
  if (dom.packSelect) {
    dom.packSelect.addEventListener("change", (event) => {
      const nextPackId = event.target.value;
      if (!nextPackId || nextPackId === state.packId) {
        return;
      }
      handlePackSelection(nextPackId);
    });
  }

  if (dom.bookmarkBtn) {
    dom.bookmarkBtn.addEventListener("click", () => {
      const question = state.questions[state.currentQuestionIndex];
      if (!question) {
        return;
      }
      question.bookmarked = !question.bookmarked;
      updateBookmarkButton(question);
      renderSidebar();
    });
  }

  if (dom.backBtn) {
    dom.backBtn.addEventListener("click", () => {
      if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex -= 1;
        renderQuestion();
        renderSidebar();
      }
    });
  }

  if (dom.nextBtn) {
    dom.nextBtn.addEventListener("click", () => {
      if (!state.questions.length) {
        return;
      }

      if (state.currentQuestionIndex === state.questions.length - 1) {
        showMarkWarning();
        return;
      }

      state.currentQuestionIndex += 1;
      renderQuestion();
      renderSidebar();
    });
  }

  if (dom.cancelMarkBtn) {
    dom.cancelMarkBtn.addEventListener("click", hideMarkWarning);
  }

  if (dom.confirmMarkBtn) {
    dom.confirmMarkBtn.addEventListener("click", () => {
      hideMarkWarning();
      markAllQuestions();
    });
  }
}

function showLoadingState() {
  if (dom.passageTitle) {
    dom.passageTitle.textContent = "Loading pack...";
  }

  if (dom.passageBody) {
    dom.passageBody.innerHTML = "";
    const paragraph = document.createElement("p");
    paragraph.textContent = "Please wait while we load your reading passage.";
    dom.passageBody.appendChild(paragraph);
  }

  if (dom.questionList) {
    dom.questionList.innerHTML = "";
  }

  if (dom.questionProgress) {
    dom.questionProgress.textContent = "";
  }

  if (dom.questionTitle) {
    dom.questionTitle.textContent = "Question";
  }

  if (dom.questionText) {
    dom.questionText.textContent = "Loading questions...";
  }

  if (dom.answerArea) {
    dom.answerArea.innerHTML = "";
  }

  if (dom.resultsPanel) {
    dom.resultsPanel.hidden = true;
    dom.resultsPanel.innerHTML = "";
  }

  setControlAvailability(false);
}

function setControlAvailability(enabled) {
  if (dom.backBtn) {
    dom.backBtn.disabled = !enabled;
  }

  if (dom.nextBtn) {
    dom.nextBtn.disabled = !enabled;
  }

  if (dom.bookmarkBtn) {
    dom.bookmarkBtn.disabled = !enabled;
  }
}

function showAppError(message) {
  if (dom.passageTitle) {
    dom.passageTitle.textContent = "Pack unavailable";
  }

  if (dom.passageBody) {
    dom.passageBody.innerHTML = "";
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    dom.passageBody.appendChild(paragraph);
  }

  if (dom.questionList) {
    dom.questionList.innerHTML = "";
    const item = document.createElement("li");
    item.className = "question-empty";
    item.textContent = "Questions could not be loaded.";
    dom.questionList.appendChild(item);
  }

  if (dom.questionProgress) {
    dom.questionProgress.textContent = "";
  }

  if (dom.questionTitle) {
    dom.questionTitle.textContent = "Question";
  }

  if (dom.questionText) {
    dom.questionText.textContent = message;
  }

  if (dom.answerArea) {
    dom.answerArea.innerHTML = "";
  }

  if (dom.questionFeedback) {
    dom.questionFeedback.hidden = true;
    dom.questionFeedback.textContent = "";
  }

  if (dom.resultsPanel) {
    dom.resultsPanel.hidden = false;
    dom.resultsPanel.innerHTML = "";
    const summary = document.createElement("p");
    summary.className = "result-summary";
    summary.textContent = message;
    dom.resultsPanel.appendChild(summary);
  }

  hideMarkWarning();
  state.questions = [];
  state.currentQuestionIndex = 0;
  state.isMarked = false;
  setControlAvailability(false);
}

function initAppWithPack(pack) {
  state.currentPack = pack;
  state.questions = prepareQuestions(pack.questions || []);
  state.currentQuestionIndex = 0;
  state.isMarked = false;

  renderReadingText(pack);
  setControlAvailability(Boolean(state.questions.length));
  renderSidebar();
  renderQuestion();
  hideMarkWarning();

  if (dom.resultsPanel) {
    dom.resultsPanel.hidden = true;
    dom.resultsPanel.innerHTML = "";
  }
}

function prepareQuestions(rawQuestions = []) {
  return rawQuestions.map((question, index) => {
    const prepared = {
      ...question,
      label: question.label || String(question.id ?? index + 1),
      options: Array.isArray(question.options) ? [...question.options] : [],
      correctOptions: Array.isArray(question.correctOptions)
        ? [...question.correctOptions]
        : [],
      bookmarked: false,
      selectedOptions: [],
      score: 0
    };

    if (question.type === "matrix") {
      prepared.statements = Array.isArray(question.statements)
        ? question.statements.map((statement) => ({
            ...statement,
            options: Array.isArray(statement.options)
              ? [...statement.options]
              : [],
            selectedIndex: null
          }))
        : [];
      prepared.maxScore =
        typeof question.maxScore === "number"
          ? question.maxScore
          : prepared.statements.length;
    } else {
      prepared.maxScore =
        typeof question.maxScore === "number"
          ? question.maxScore
          : prepared.correctOptions.length || 1;
    }

    return prepared;
  });
}

function renderReadingText(pack) {
  if (!dom.passageTitle || !dom.passageBody) {
    return;
  }

  const packTitle = pack && pack.title ? pack.title : "Reading passage";
  dom.passageTitle.textContent = packTitle;
  dom.passageBody.innerHTML = "";

  const nodes = Array.isArray(pack && pack.text) ? pack.text : [];
  if (!nodes.length) {
    const placeholder = document.createElement("p");
    placeholder.textContent = "No reading text is available for this pack.";
    dom.passageBody.appendChild(placeholder);
    return;
  }

  nodes.forEach((node) => {
    const element = createReadingElement(node);
    dom.passageBody.appendChild(element);
  });
}

function renderPackOptions() {
  if (!dom.packSelect) {
    return;
  }

  dom.packSelect.innerHTML = "";

  if (!state.packList.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No packs available";
    dom.packSelect.appendChild(option);
    dom.packSelect.disabled = true;
    return;
  }

  state.packList.forEach((pack) => {
    const option = document.createElement("option");
    option.value = pack.id;
    option.textContent = pack.title || pack.id;
    dom.packSelect.appendChild(option);
  });

  dom.packSelect.disabled = false;
  updatePackSelectValue(state.packId);
}

function updatePackSelectValue(id) {
  if (!dom.packSelect) {
    return;
  }

  if (id) {
    dom.packSelect.value = id;
  } else {
    dom.packSelect.selectedIndex = -1;
  }
}

function resolveInitialPackId(packs) {
  if (!Array.isArray(packs) || !packs.length) {
    return state.packId || DEFAULT_PACK_ID;
  }

  const hasRequested = packs.some((pack) => pack.id === state.packId);
  if (hasRequested) {
    return state.packId;
  }

  const hasDefault = packs.some((pack) => pack.id === DEFAULT_PACK_ID);
  if (hasDefault) {
    return DEFAULT_PACK_ID;
  }

  return packs[0].id;
}

function handlePackSelection(nextPackId) {
  if (!nextPackId) {
    return;
  }

  state.packId = nextPackId;
  updatePackSelectValue(nextPackId);
  updatePackQueryParam(nextPackId);
  showLoadingState();
  setPackSelectDisabled(true);

  loadPack(nextPackId)
    .then((pack) => {
      setPackSelectDisabled(false);
      initAppWithPack(pack);
    })
    .catch((error) => {
      setPackSelectDisabled(false);
      console.error(error);
      showAppError(`Could not load pack: ${nextPackId}`);
    });
}

function updatePackQueryParam(id) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("pack", id);
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
    console.warn("Could not update URL with pack id.", error);
  }
}

function setPackSelectDisabled(disabled) {
  if (!dom.packSelect) {
    return;
  }
  dom.packSelect.disabled = disabled || !state.packList.length;
}

function createReadingElement(node) {
  const type = node && node.type ? node.type : "paragraph";
  const text = node && node.text ? node.text : "";

  if (type === "heading") {
    const heading = document.createElement("h3");
    heading.textContent = text;
    return heading;
  }

  if (type === "quote") {
    const quote = document.createElement("blockquote");
    quote.textContent = text;
    return quote;
  }

  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}

function renderSidebar() {
  if (!dom.questionList) {
    return;
  }

  dom.questionList.innerHTML = "";

  if (!state.questions.length) {
    const item = document.createElement("li");
    item.className = "question-empty";
    item.textContent = "No questions available.";
    dom.questionList.appendChild(item);
    return;
  }

  state.questions.forEach((question, index) => {
    const listItem = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "question-nav-btn";

    if (index === state.currentQuestionIndex) {
      button.classList.add("current");
    }

    const labelSpan = document.createElement("span");
    labelSpan.className = "question-label";
    const labelText = question.label ? question.label : question.id;
    labelSpan.textContent = `Q${labelText}`;

    ["status-correct", "status-incorrect", "status-bookmarked"].forEach((cls) =>
      button.classList.remove(cls)
    );
    const statusClasses = getQuestionStatusClasses(question);
    statusClasses.forEach((cls) => button.classList.add(cls));

    button.addEventListener("click", () => {
      state.currentQuestionIndex = index;
      renderQuestion();
      renderSidebar();
    });

    button.append(labelSpan);
    listItem.appendChild(button);
    dom.questionList.appendChild(listItem);
  });
}

function getQuestionStatusClasses(question) {
  const classes = [];
  if (!question) {
    return classes;
  }

  if (question.bookmarked) {
    classes.push("status-bookmarked");
  }

  if (!state.isMarked || !question.maxScore || !hasAnswer(question)) {
    return classes;
  }

  if (question.score === question.maxScore) {
    classes.push("status-correct");
  } else if (question.score === 0) {
    classes.push("status-incorrect");
  }

  return classes;
}

function renderQuestion() {
  if (!dom.questionProgress || !dom.questionTitle || !dom.questionText || !dom.answerArea) {
    return;
  }

  if (!state.questions.length) {
    dom.questionProgress.textContent = "";
    dom.questionTitle.textContent = "Question";
    dom.questionText.textContent = "This pack does not include any questions yet.";
    dom.answerArea.innerHTML = "";
    updateBookmarkButton(null);
    updateQuestionFeedback(null);
    updateNavButtons();
    return;
  }

  if (state.currentQuestionIndex >= state.questions.length) {
    state.currentQuestionIndex = state.questions.length - 1;
  }

  const question = state.questions[state.currentQuestionIndex];
  dom.questionProgress.textContent = `Question ${state.currentQuestionIndex + 1} of ${state.questions.length}`;
  dom.questionTitle.textContent = `Question ${question.label}`;
  dom.questionText.textContent = question.text;
  dom.answerArea.innerHTML = "";
  hideMarkWarning();

  if (question.type === "single" || question.type === "multi") {
    renderChoiceQuestion(question);
  } else if (question.type === "matrix") {
    renderMatrixQuestion(question);
  }

  updateBookmarkButton(question);
  updateQuestionFeedback(question);
  updateNavButtons();
}

function renderChoiceQuestion(question) {
  const inputType = question.type === "single" ? "radio" : "checkbox";
  const inputName = `question-${question.id}`;

  question.options.forEach((option, optionIndex) => {
    const label = document.createElement("label");
    label.className = "option";

    const input = document.createElement("input");
    input.type = inputType;
    input.name = inputName;
    input.value = optionIndex;
    input.checked = question.selectedOptions.includes(optionIndex);

    input.addEventListener("change", (event) => {
      if (question.type === "single") {
        question.selectedOptions = [Number(event.target.value)];
      } else if (event.target.checked) {
        question.selectedOptions = [...new Set([...question.selectedOptions, optionIndex])];
      } else {
        question.selectedOptions = question.selectedOptions.filter((value) => value !== optionIndex);
      }
      invalidateResults();
    });

    const span = document.createElement("span");
    span.textContent = option;

    label.append(input, span);
    dom.answerArea.appendChild(label);
  });
}

function renderMatrixQuestion(question) {
  question.statements.forEach((statement, statementIndex) => {
    const row = document.createElement("div");
    row.className = "matrix-row";

    const prompt = document.createElement("p");
    prompt.className = "matrix-statement";
    prompt.textContent = statement.text;
    row.appendChild(prompt);

    const optionsContainer = document.createElement("div");
    optionsContainer.className = "matrix-options";

    statement.options.forEach((option, optionIndex) => {
      const label = document.createElement("label");
      label.className = "matrix-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `matrix-${question.id}-${statementIndex}`;
      input.value = optionIndex;
      input.checked = statement.selectedIndex === optionIndex;
      input.addEventListener("change", () => {
        statement.selectedIndex = optionIndex;
        invalidateResults();
      });

      const optionText = document.createElement("span");
      optionText.textContent = option;

      label.append(input, optionText);
      optionsContainer.appendChild(label);
    });

    row.appendChild(optionsContainer);
    dom.answerArea.appendChild(row);
  });
}

function updateBookmarkButton(question) {
  if (!dom.bookmarkBtn) {
    return;
  }

  if (!question) {
    dom.bookmarkBtn.classList.remove("active");
    dom.bookmarkBtn.setAttribute("aria-pressed", "false");
    dom.bookmarkBtn.disabled = true;
    dom.bookmarkBtn.textContent = "Bookmark";
    return;
  }

  dom.bookmarkBtn.disabled = false;
  dom.bookmarkBtn.classList.toggle("active", question.bookmarked);
  dom.bookmarkBtn.setAttribute("aria-pressed", String(question.bookmarked));
  dom.bookmarkBtn.textContent = question.bookmarked ? "Bookmarked" : "Bookmark";
}

function updateQuestionFeedback(question) {
  if (!dom.questionFeedback) {
    return;
  }

  dom.questionFeedback.className = "question-feedback";

  if (!state.isMarked || !question) {
    dom.questionFeedback.hidden = true;
    dom.questionFeedback.textContent = "";
    return;
  }

  const answered = hasAnswer(question);
  dom.questionFeedback.hidden = false;

  if (!answered) {
    dom.questionFeedback.classList.add("unanswered");
    dom.questionFeedback.textContent = "No answer submitted";
    return;
  }

  if (question.score === question.maxScore) {
    dom.questionFeedback.classList.add("correct");
    dom.questionFeedback.textContent = "Correct";
    return;
  }

  if (question.score > 0) {
    dom.questionFeedback.classList.add("partial");
    dom.questionFeedback.textContent = "Partly correct";
    return;
  }

  dom.questionFeedback.classList.add("incorrect");
  dom.questionFeedback.textContent = "Incorrect";
}

function updateNavButtons() {
  if (!dom.backBtn || !dom.nextBtn) {
    return;
  }

  if (!state.questions.length) {
    dom.backBtn.disabled = true;
    dom.nextBtn.disabled = true;
    dom.nextBtn.textContent = "Next";
    dom.nextBtn.classList.remove("mark-mode");
    return;
  }

  const atFirst = state.currentQuestionIndex === 0;
  const atLast = state.currentQuestionIndex === state.questions.length - 1;
  dom.backBtn.disabled = atFirst;
  dom.nextBtn.disabled = false;

  if (atLast) {
    dom.nextBtn.textContent = "Check answers";
    dom.nextBtn.classList.add("mark-mode");
  } else {
    dom.nextBtn.textContent = "Next";
    dom.nextBtn.classList.remove("mark-mode");
  }
}

function showMarkWarning() {
  if (!dom.markWarning || !dom.markWarningMessage || !state.questions.length) {
    return;
  }

  const message = state.isMarked
    ? "You have already checked your answers. Checking again will refresh your feedback. Continue?"
    : "You're about to check your answers. You can still go back if you need to change anything.";
  dom.markWarningMessage.textContent = message;
  dom.markWarning.hidden = false;
}

function hideMarkWarning() {
  if (dom.markWarning) {
    dom.markWarning.hidden = true;
  }
}

function invalidateResults() {
  if (!state.isMarked) {
    return;
  }

  state.isMarked = false;
  state.questions.forEach((question) => {
    question.score = 0;
  });

  if (dom.resultsPanel) {
    dom.resultsPanel.hidden = true;
    dom.resultsPanel.innerHTML = "";
  }

  renderSidebar();
  updateQuestionFeedback(state.questions[state.currentQuestionIndex]);
}

function hasAnswer(question) {
  if (!question) {
    return false;
  }

  if (question.type === "matrix") {
    return question.statements.some(
      (statement) => typeof statement.selectedIndex === "number"
    );
  }

  return question.selectedOptions.length > 0;
}

function markAllQuestions() {
  if (!state.questions.length) {
    return;
  }

  let totalScore = 0;
  let totalMax = 0;

  state.questions.forEach((question) => {
    markQuestion(question);
    totalScore += question.score;
    totalMax += question.maxScore;
  });

  state.isMarked = true;
  updateSidebarMarking();
  updateOverallScoreDisplay(totalScore, totalMax);
  renderQuestion();
  updateNavButtons();
}

function updateSidebarMarking() {
  renderSidebar();
}

function updateOverallScoreDisplay(totalScore, totalMax) {
  if (!dom.resultsPanel) {
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = "Results";

  const summary = document.createElement("p");
  summary.className = "result-summary";
  summary.textContent = `You scored ${totalScore} out of ${totalMax}.`;

  const list = document.createElement("ul");
  list.className = "results-list";

  state.questions.forEach((question) => {
    const listItem = document.createElement("li");
    listItem.className = "result-item";

    const answered = hasAnswer(question);
    if (!answered) {
      listItem.classList.add("review");
    } else if (question.score === question.maxScore) {
      listItem.classList.add("correct");
    } else if (question.score === 0) {
      listItem.classList.add("incorrect");
    } else {
      listItem.classList.add("partial");
    }

    const title = document.createElement("h4");
    title.textContent = `Question ${question.label}`;

    const detail = document.createElement("p");
    detail.className = "result-detail";
    detail.textContent = buildResultDetail(question, answered);

    listItem.append(title, detail);
    list.appendChild(listItem);
  });

  dom.resultsPanel.innerHTML = "";
  dom.resultsPanel.append(heading, summary, list);
  dom.resultsPanel.hidden = false;
  dom.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildResultDetail(question, answered) {
  if (question.type === "matrix") {
    if (!answered) {
      return "No statements answered.";
    }
    return `You answered ${question.score} of ${question.maxScore} statements correctly.`;
  }

  if (!answered) {
    return "No answer submitted.";
  }

  if (question.type === "single") {
    if (question.score === question.maxScore) {
      return "Correct!";
    }
    const chosen = question.options[question.selectedOptions[0]];
    const correct = question.options[question.correctOptions[0]];
    return `You chose "${chosen}". Correct answer: "${correct}".`;
  }

  if (question.type === "multi") {
    const chosen = formatOptionList(question, question.selectedOptions);
    const correct = formatOptionList(question, question.correctOptions);

    if (question.score === question.maxScore) {
      return "All correct selections.";
    }

    if (question.score === 0) {
      return `No credit awarded. Correct options: ${correct}.`;
    }

    return `Partly correct. You chose: ${chosen}. Correct options: ${correct}.`;
  }

  return "Reviewed.";
}

function formatOptionList(question, indices) {
  if (!Array.isArray(indices) || !indices.length) {
    return "";
  }

  const uniqueSorted = [...new Set(indices)].sort((a, b) => a - b);
  return uniqueSorted.map((index) => question.options[index]).join(", ");
}

function markQuestion(question) {
  if (question.type === "single") {
    markSingle(question);
  } else if (question.type === "multi") {
    markMulti(question);
  } else if (question.type === "matrix") {
    markMatrix(question);
  } else {
    question.score = 0;
  }
}

function markSingle(question) {
  if (question.selectedOptions.length !== 1) {
    question.score = 0;
    return;
  }

  const selected = question.selectedOptions[0];
  const correct = question.correctOptions[0];
  question.score = selected === correct ? question.maxScore : 0;
}

function markMulti(question) {
  const selected = [...question.selectedOptions].sort((a, b) => a - b);
  const correct = [...question.correctOptions].sort((a, b) => a - b);

  if (!selected.length) {
    question.score = 0;
    return;
  }

  const sameLength = selected.length === correct.length;
  const sameElements = sameLength && selected.every((value, index) => value === correct[index]);
  question.score = sameElements ? question.maxScore : 0;
}

function markMatrix(question) {
  let score = 0;
  question.statements.forEach((statement) => {
    if (statement.selectedIndex === statement.correctIndex) {
      score += 1;
    }
  });
  question.score = Math.min(score, question.maxScore);
}



