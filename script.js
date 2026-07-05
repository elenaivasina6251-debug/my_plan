(() => {
  "use strict";

  const STORAGE_KEY = "taskPlanner.tasks";
  const DAY_NAMES = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
  ];
  const MOTIVATIONAL_PHRASES = [
    "Время для новых планов",
    "Свободное место для важного",
    "Спокойный день для фокуса",
    "Планируйте только нужное",
    "Новый день — новые возможности",
  ];
  const PRIORITY_LABELS = {
    high: "Высокий",
    medium: "Средний",
    low: "Низкий",
  };
  const storageError = document.getElementById("storageError");
  const clearStorageButton = document.getElementById("clearStorageButton");
  const dateRange = document.getElementById("dateRange");
  const daysGrid = document.getElementById("daysGrid");
  const previousWeekButton = document.getElementById("previousWeekButton");
  const currentWeekButton = document.getElementById("currentWeekButton");
  const nextWeekButton = document.getElementById("nextWeekButton");
  const addTaskButton = document.getElementById("addTaskButton");
  const taskModal = document.getElementById("taskModal");
  const closeTaskModalButton = document.getElementById("closeTaskModalButton");
  const cancelTaskButton = document.getElementById("cancelTaskButton");
  const taskForm = document.getElementById("taskForm");
  const taskTitleInput = document.getElementById("taskTitle");
  const taskDescriptionInput = document.getElementById("taskDescription");
  const taskDateInput = document.getElementById("taskDate");
  const taskTimeInput = document.getElementById("taskTime");
  const taskPriorityInput = document.getElementById("taskPriority");
  const taskFormError = document.getElementById("taskFormError");

  let tasks = [];
  let currentViewedDate = getWeekStart(new Date());
  let modalTrigger = null;

  function showStorageError() {
    storageError.hidden = false;
  }

  function hideStorageError() {
    storageError.hidden = true;
  }

  function loadTasks() {
    try {
      const storedValue = localStorage.getItem(STORAGE_KEY);

      if (storedValue === null || storedValue.trim() === "") {
        return [];
      }

      const parsedTasks = JSON.parse(storedValue);

      if (!Array.isArray(parsedTasks)) {
        throw new TypeError("Сохраненные данные должны быть массивом.");
      }

      hideStorageError();
      return parsedTasks;
    } catch {
      showStorageError();
      return [];
    }
  }

  function saveTasks(nextTasks) {
    if (!Array.isArray(nextTasks)) {
      throw new TypeError("Для сохранения задач требуется массив.");
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));
      hideStorageError();
      return true;
    } catch {
      showStorageError();
      return false;
    }
  }

  function clearStoredTasks() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      tasks = [];
      hideStorageError();
      renderWeek();
      return true;
    } catch {
      showStorageError();
      return false;
    }
  }

  function getWeekStart(date) {
    const result = new Date(date);
    const day = result.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;

    result.setDate(result.getDate() - daysSinceMonday);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function addDays(date, numberOfDays) {
    const result = new Date(date);
    result.setDate(result.getDate() + numberOfDays);
    return result;
  }

  function isSameDate(firstDate, secondDate) {
    return (
      firstDate.getFullYear() === secondDate.getFullYear()
      && firstDate.getMonth() === secondDate.getMonth()
      && firstDate.getDate() === secondDate.getDate()
    );
  }

  function formatIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatDayMonth(date) {
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
  }

  function formatDateRange(startDate, endDate) {
    const startLabel = formatDayMonth(startDate);
    const endLabel = formatDayMonth(endDate);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    if (startYear !== endYear) {
      return `${startLabel} ${startYear} - ${endLabel} ${endYear}`;
    }

    return `${startLabel} - ${endLabel}`;
  }

  function getRandomMotivationalPhrase() {
    const index = Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length);
    return MOTIVATIONAL_PHRASES[index];
  }

  function createTaskCard(task) {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const meta = document.createElement("div");
    const priority = document.createElement("span");
    const safePriority = Object.hasOwn(PRIORITY_LABELS, task.priority)
      ? task.priority
      : "medium";

    card.className = `task-card task-card--${safePriority}`;
    card.dataset.taskId = String(task.id);

    title.className = "task-card__title";
    title.textContent = task.title;
    card.append(title);

    if (task.description) {
      const description = document.createElement("p");
      description.className = "task-card__description";
      description.textContent = task.description;
      card.append(description);
    }

    meta.className = "task-card__meta";
    priority.className = "task-card__tag task-card__tag--priority";
    priority.textContent = PRIORITY_LABELS[safePriority];
    meta.append(priority);

    if (task.time) {
      const time = document.createElement("time");
      time.className = "task-card__tag";
      time.dateTime = task.time;
      time.textContent = task.time;
      meta.append(time);
    }

    card.append(meta);
    return card;
  }

  function createDayColumn(date, dayIndex, today) {
    const column = document.createElement("article");
    const header = document.createElement("header");
    const dayName = document.createElement("span");
    const dateElement = document.createElement("time");
    const tasksContainer = document.createElement("div");
    const dayDate = formatIsoDate(date);
    const dayTasks = tasks.filter((task) => task.date === dayDate);

    column.className = "day-column";
    column.dataset.dayIndex = String(dayIndex);
    column.dataset.date = dayDate;

    if (dayIndex >= 5) {
      column.classList.add("day-column--weekend");
    }

    if (isSameDate(date, today)) {
      column.classList.add("day-column--today");
    }

    header.className = "day-column__header";
    dayName.className = "day-column__name";
    dayName.textContent = DAY_NAMES[dayIndex];

    dateElement.className = "day-column__date";
    dateElement.dateTime = dayDate;
    dateElement.textContent = formatDayMonth(date);

    tasksContainer.className = "day-column__tasks";
    tasksContainer.dataset.taskDate = dayDate;

    header.append(dayName, dateElement);

    if (dayTasks.length === 0) {
      const emptyState = document.createElement("span");
      emptyState.className = "empty-state";
      emptyState.textContent = getRandomMotivationalPhrase();
      tasksContainer.append(emptyState);
    } else {
      dayTasks.forEach((task) => tasksContainer.append(createTaskCard(task)));
    }

    column.append(header, tasksContainer);

    return column;
  }

  function renderWeek() {
    const today = new Date();
    const weekEnd = addDays(currentViewedDate, 6);
    const fragment = document.createDocumentFragment();

    dateRange.textContent = formatDateRange(currentViewedDate, weekEnd);
    daysGrid.replaceChildren();

    DAY_NAMES.forEach((dayName, dayIndex) => {
      const date = addDays(currentViewedDate, dayIndex);
      fragment.append(createDayColumn(date, dayIndex, today));
    });

    daysGrid.append(fragment);
  }

  function moveWeek(numberOfWeeks) {
    currentViewedDate = addDays(currentViewedDate, numberOfWeeks * 7);
    renderWeek();
  }

  function showTaskFormError(message, field) {
    taskFormError.textContent = message;
    taskFormError.hidden = false;

    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
  }

  function clearTaskFormError() {
    taskFormError.textContent = "";
    taskFormError.hidden = true;
    taskTitleInput.removeAttribute("aria-invalid");
    taskDescriptionInput.removeAttribute("aria-invalid");
    taskDateInput.removeAttribute("aria-invalid");
  }

  function openTaskModal() {
    modalTrigger = document.activeElement;
    taskForm.reset();
    clearTaskFormError();
    taskDateInput.value = formatIsoDate(new Date());
    taskModal.hidden = false;
    document.body.classList.add("modal-open");
    taskTitleInput.focus();
  }

  function closeTaskModal() {
    taskModal.hidden = true;
    document.body.classList.remove("modal-open");
    taskForm.reset();
    clearTaskFormError();

    if (modalTrigger) {
      modalTrigger.focus();
    }
  }

  function generateTaskId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createTaskFromForm() {
    const timestamp = new Date().toISOString();

    return {
      id: generateTaskId(),
      title: taskTitleInput.value.trim(),
      description: taskDescriptionInput.value.trim(),
      date: taskDateInput.value,
      time: taskTimeInput.value,
      priority: taskPriorityInput.value,
      status: "active",
      originalDate: null,
      isTransferred: false,
      transferCount: 0,
      transferHistory: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
      canceledAt: null,
    };
  }

  function handleTaskFormSubmit(event) {
    event.preventDefault();
    clearTaskFormError();

    if (taskTitleInput.value.trim() === "") {
      showTaskFormError("Введите название задачи.", taskTitleInput);
      return;
    }

    if (taskTitleInput.value.length > 120) {
      showTaskFormError("Название не должно превышать 120 символов.", taskTitleInput);
      return;
    }

    if (taskDescriptionInput.value.length > 1000) {
      showTaskFormError("Описание не должно превышать 1000 символов.", taskDescriptionInput);
      return;
    }

    if (taskDateInput.value === "") {
      showTaskFormError("Выберите дату задачи.", taskDateInput);
      return;
    }

    const task = createTaskFromForm();
    const updatedTasks = [...tasks, task];

    if (!saveTasks(updatedTasks)) {
      showTaskFormError("Не удалось сохранить задачу. Проверьте доступ к хранилищу.");
      return;
    }

    tasks = updatedTasks;
    renderWeek();
    closeTaskModal();
  }

  clearStorageButton.addEventListener("click", clearStoredTasks);
  previousWeekButton.addEventListener("click", () => moveWeek(-1));
  currentWeekButton.addEventListener("click", () => {
    currentViewedDate = getWeekStart(new Date());
    renderWeek();
  });
  nextWeekButton.addEventListener("click", () => moveWeek(1));
  addTaskButton.addEventListener("click", openTaskModal);
  closeTaskModalButton.addEventListener("click", closeTaskModal);
  cancelTaskButton.addEventListener("click", closeTaskModal);
  taskForm.addEventListener("submit", handleTaskFormSubmit);
  taskModal.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-modal-close")) {
      closeTaskModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !taskModal.hidden) {
      closeTaskModal();
    }
  });
  taskTitleInput.addEventListener("input", clearTaskFormError);
  taskDateInput.addEventListener("input", clearTaskFormError);

  tasks = loadTasks();
  renderWeek();

  window.taskPlannerStorage = Object.freeze({
    key: STORAGE_KEY,
    loadTasks,
    saveTasks,
    clearTasks: clearStoredTasks,
  });

  window.taskPlannerCalendar = Object.freeze({
    get currentViewedDate() {
      return new Date(currentViewedDate);
    },
    getWeekStart,
    formatDateRange,
    renderWeek,
  });

  window.taskPlannerTasks = Object.freeze({
    createTaskFromForm,
    openTaskModal,
    closeTaskModal,
  });
})();
