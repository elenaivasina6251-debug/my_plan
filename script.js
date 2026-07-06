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
  const PRIORITY_ORDER = {
    high: 0,
    medium: 1,
    low: 2,
  };
  const STATUS_ORDER = {
    active: 0,
    completed: 1,
    canceled: 2,
  };
  const STATUS_LABELS = {
    active: "Активная",
    completed: "Выполнена",
    canceled: "Отменена",
  };
  const PERCENT_FORMATTER = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
  });
  const CSV_COLUMNS = [
    "id",
    "title",
    "description",
    "date",
    "time",
    "priority",
    "status",
    "originalDate",
    "isTransferred",
    "transferCount",
    "transferHistory",
    "createdAt",
    "updatedAt",
    "completedAt",
    "canceledAt",
  ];
  const storageError = document.getElementById("storageError");
  const clearStorageButton = document.getElementById("clearStorageButton");
  const dateRange = document.getElementById("dateRange");
  const daysGrid = document.getElementById("daysGrid");
  const previousWeekButton = document.getElementById("previousWeekButton");
  const currentWeekButton = document.getElementById("currentWeekButton");
  const nextWeekButton = document.getElementById("nextWeekButton");
  const addTaskButton = document.getElementById("addTaskButton");
  const taskModal = document.getElementById("taskModal");
  const taskModalCaption = document.getElementById("taskModalCaption");
  const taskModalTitle = document.getElementById("taskModalTitle");
  const closeTaskModalButton = document.getElementById("closeTaskModalButton");
  const cancelTaskButton = document.getElementById("cancelTaskButton");
  const taskForm = document.getElementById("taskForm");
  const taskTitleInput = document.getElementById("taskTitle");
  const taskDescriptionInput = document.getElementById("taskDescription");
  const taskDateInput = document.getElementById("taskDate");
  const taskTimeInput = document.getElementById("taskTime");
  const taskPriorityInput = document.getElementById("taskPriority");
  const taskFormError = document.getElementById("taskFormError");
  const taskSubmitButton = document.getElementById("taskSubmitButton");
  const taskDetailsModal = document.getElementById("taskDetailsModal");
  const taskDetailsCloseButton = document.getElementById("taskDetailsCloseButton");
  const taskDetailsTitle = document.getElementById("taskDetailsTitle");
  const taskDetailsDescription = document.getElementById("taskDetailsDescription");
  const taskDetailsDate = document.getElementById("taskDetailsDate");
  const taskDetailsTime = document.getElementById("taskDetailsTime");
  const taskDetailsPriority = document.getElementById("taskDetailsPriority");
  const taskDetailsStatus = document.getElementById("taskDetailsStatus");
  const taskDetailsTransferredBadge = document.getElementById(
    "taskDetailsTransferredBadge",
  );
  const taskDetailsActions = document.getElementById("taskDetailsActions");
  const taskDetailsTransferControls = document.getElementById(
    "taskDetailsTransferControls",
  );
  const taskDetailsTransferDate = document.getElementById("taskDetailsTransferDate");
  const taskDetailsTransferCancelButton = document.getElementById(
    "taskDetailsTransferCancelButton",
  );
  const exportStartDate = document.getElementById("exportStartDate");
  const exportEndDate = document.getElementById("exportEndDate");
  const exportCsvButton = document.getElementById("exportCsvButton");
  const printPdfButton = document.getElementById("printPdfButton");
  const exportMessage = document.getElementById("exportMessage");
  const printReport = document.getElementById("printReport");
  const printReportPeriod = document.getElementById("printReportPeriod");
  const printReportCreatedAt = document.getElementById("printReportCreatedAt");
  const printReportRows = document.getElementById("printReportRows");
  const weekStatisticsPeriod = document.getElementById("weekStatisticsPeriod");
  const monthStatisticsPeriod = document.getElementById("monthStatisticsPeriod");
  const weekStatisticElements = {
    plan: document.getElementById("weekPlanValue"),
    fact: document.getElementById("weekFactValue"),
    completion: document.getElementById("weekCompletionValue"),
    transferred: document.getElementById("weekTransferredValue"),
    canceled: document.getElementById("weekCanceledValue"),
  };
  const monthStatisticElements = {
    plan: document.getElementById("monthPlanValue"),
    fact: document.getElementById("monthFactValue"),
    completion: document.getElementById("monthCompletionValue"),
    transferred: document.getElementById("monthTransferredValue"),
    canceled: document.getElementById("monthCanceledValue"),
  };

  let tasks = [];
  let currentViewedDate = getWeekStart(new Date());
  let modalTrigger = null;
  let editingTaskId = null;
  let detailsTrigger = null;
  let currentDetailsTaskId = null;
  let draggedTaskId = null;

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

  function escapeCsvValue(value) {
    const stringValue = value === null || value === undefined
      ? ""
      : String(value);

    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  function createCsvContent(taskList) {
    const header = CSV_COLUMNS.join(";");
    const rows = taskList.map((task) => CSV_COLUMNS.map((column) => {
      const value = column === "transferHistory"
        ? JSON.stringify(Array.isArray(task.transferHistory) ? task.transferHistory : [])
        : task[column];

      return escapeCsvValue(value);
    }).join(";"));

    return `\uFEFF${[header, ...rows].join("\r\n")}`;
  }

  function isValidIsoDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      return false;
    }

    const [, year, month, day] = match.map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year
      && date.getMonth() === month - 1
      && date.getDate() === day;
  }

  function showExportMessage(message, isError = false) {
    exportMessage.textContent = message;
    exportMessage.classList.toggle("export-panel__message--error", isError);
    exportMessage.hidden = false;
  }

  function clearExportMessage() {
    exportMessage.hidden = true;
    exportMessage.textContent = "";
    exportMessage.classList.remove("export-panel__message--error");
  }

  function getSelectedExportPeriod() {
    const startDate = exportStartDate.value;
    const endDate = exportEndDate.value;

    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      showExportMessage("Укажите начальную и конечную даты.", true);
      return null;
    }

    if (startDate > endDate) {
      showExportMessage("Начальная дата не может быть позже конечной.", true);
      return null;
    }

    clearExportMessage();
    return { startDate, endDate };
  }

  function filterTasksByPeriod(taskList, startDate, endDate) {
    return taskList
      .filter((task) => (
        typeof task.date === "string"
        && task.date >= startDate
        && task.date <= endDate
      ))
      .sort((firstTask, secondTask) => (
        firstTask.date.localeCompare(secondTask.date)
        || compareTasks(firstTask, secondTask)
      ));
  }

  function setExportPeriodForWeek(weekStart = currentViewedDate) {
    exportStartDate.value = formatIsoDate(weekStart);
    exportEndDate.value = formatIsoDate(addDays(weekStart, 6));
    clearExportMessage();
  }

  function downloadTasksCsv(startDate, endDate) {
    const selectedPeriod = startDate && endDate
      ? { startDate, endDate }
      : getSelectedExportPeriod();

    if (
      !selectedPeriod
      || !isValidIsoDate(selectedPeriod.startDate)
      || !isValidIsoDate(selectedPeriod.endDate)
      || selectedPeriod.startDate > selectedPeriod.endDate
    ) {
      return null;
    }

    const exportedTasks = filterTasksByPeriod(
      tasks,
      selectedPeriod.startDate,
      selectedPeriod.endDate,
    );
    const csvContent = createCsvContent(exportedTasks);
    const fileName = `tasks-${selectedPeriod.startDate}_${selectedPeriod.endDate}.csv`;
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    showExportMessage(`В CSV выгружено задач: ${exportedTasks.length}.`);

    return {
      fileName,
      taskCount: exportedTasks.length,
      startDate: selectedPeriod.startDate,
      endDate: selectedPeriod.endDate,
    };
  }

  function appendPrintCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }

  function preparePrintReport(taskList, startDate, endDate) {
    printReportPeriod.textContent = `Период: ${formatStoredTaskDate(startDate)} — ${formatStoredTaskDate(endDate)}`;
    printReportCreatedAt.textContent = `Сформировано: ${new Date().toLocaleString("ru-RU")}`;
    printReportRows.replaceChildren();

    if (taskList.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.className = "print-report__empty";
      cell.textContent = "За выбранный период задач нет.";
      row.append(cell);
      printReportRows.append(row);
      return;
    }

    taskList.forEach((task) => {
      const row = document.createElement("tr");
      const priority = Object.hasOwn(PRIORITY_LABELS, task.priority)
        ? PRIORITY_LABELS[task.priority]
        : PRIORITY_LABELS.medium;
      const status = Object.hasOwn(STATUS_LABELS, task.status)
        ? STATUS_LABELS[task.status]
        : STATUS_LABELS.active;

      appendPrintCell(row, formatStoredTaskDate(task.date));
      appendPrintCell(row, task.time || "—");
      appendPrintCell(row, task.title || "—");
      appendPrintCell(row, task.description || "—");
      appendPrintCell(row, priority);
      appendPrintCell(row, status);
      appendPrintCell(row, task.isTransferred === true ? "Да" : "Нет");
      printReportRows.append(row);
    });
  }

  function printTasks() {
    const selectedPeriod = getSelectedExportPeriod();

    if (!selectedPeriod) {
      return false;
    }

    const printedTasks = filterTasksByPeriod(
      tasks,
      selectedPeriod.startDate,
      selectedPeriod.endDate,
    );

    preparePrintReport(
      printedTasks,
      selectedPeriod.startDate,
      selectedPeriod.endDate,
    );
    printReport.setAttribute("aria-hidden", "false");
    window.print();
    printReport.setAttribute("aria-hidden", "true");
    showExportMessage(`Подготовлено к печати задач: ${printedTasks.length}.`);
    return true;
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

  function getDominantMonth(weekStart) {
    const monthCounts = new Map();

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(weekStart, dayIndex);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1);
    }

    const [selectedMonthKey, dayCount] = [...monthCounts.entries()]
      .sort((firstMonth, secondMonth) => secondMonth[1] - firstMonth[1])[0];
    const [year, monthNumber] = selectedMonthKey.split("-").map(Number);

    return {
      key: selectedMonthKey,
      year,
      month: monthNumber - 1,
      dayCount,
    };
  }

  function calculateStatistics(scopedTasks) {
    const plan = scopedTasks.length;
    const fact = scopedTasks.filter((task) => task.status === "completed").length;
    const transferred = scopedTasks.filter((task) => task.isTransferred === true).length;
    const canceled = scopedTasks.filter((task) => task.status === "canceled").length;
    const completion = plan === 0 ? 0 : (fact / plan) * 100;

    return {
      plan,
      fact,
      completion,
      transferred,
      canceled,
    };
  }

  function updateStatisticElements(elements, statistics) {
    elements.plan.textContent = String(statistics.plan);
    elements.fact.textContent = String(statistics.fact);
    elements.completion.textContent = `${PERCENT_FORMATTER.format(statistics.completion)}%`;
    elements.transferred.textContent = String(statistics.transferred);
    elements.canceled.textContent = String(statistics.canceled);
  }

  function renderStatistics() {
    const weekEnd = addDays(currentViewedDate, 6);
    const weekStartKey = formatIsoDate(currentViewedDate);
    const weekEndKey = formatIsoDate(weekEnd);
    const dominantMonth = getDominantMonth(currentViewedDate);
    const weekTasks = tasks.filter(
      (task) => task.date >= weekStartKey && task.date <= weekEndKey,
    );
    const monthTasks = tasks.filter(
      (task) => typeof task.date === "string" && task.date.startsWith(dominantMonth.key),
    );
    const monthName = new Date(
      dominantMonth.year,
      dominantMonth.month,
      1,
    ).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

    weekStatisticsPeriod.textContent = formatDateRange(currentViewedDate, weekEnd);
    monthStatisticsPeriod.textContent = monthName.replace(" г.", "");
    updateStatisticElements(weekStatisticElements, calculateStatistics(weekTasks));
    updateStatisticElements(monthStatisticElements, calculateStatistics(monthTasks));
  }

  function getRandomMotivationalPhrase() {
    const index = Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length);
    return MOTIVATIONAL_PHRASES[index];
  }

  function compareTasks(firstTask, secondTask) {
    const statusDifference = (STATUS_ORDER[firstTask.status] ?? 99)
      - (STATUS_ORDER[secondTask.status] ?? 99);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const firstHasTime = Boolean(firstTask.time);
    const secondHasTime = Boolean(secondTask.time);

    if (firstHasTime !== secondHasTime) {
      return firstHasTime ? -1 : 1;
    }

    if (firstHasTime && firstTask.time !== secondTask.time) {
      return firstTask.time.localeCompare(secondTask.time);
    }

    const priorityDifference = (PRIORITY_ORDER[firstTask.priority] ?? 99)
      - (PRIORITY_ORDER[secondTask.priority] ?? 99);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return String(firstTask.createdAt ?? "").localeCompare(
      String(secondTask.createdAt ?? ""),
    );
  }

  function buildTransferredTask(task, toDate, transferType, transferredAt) {
    const fromDate = task.date;
    const transferHistory = Array.isArray(task.transferHistory)
      ? task.transferHistory
      : [];
    const currentTransferCount = Number.isFinite(task.transferCount)
      ? task.transferCount
      : 0;

    return {
      ...task,
      date: toDate,
      originalDate: task.originalDate ?? fromDate,
      isTransferred: true,
      transferCount: currentTransferCount + 1,
      transferHistory: [
        ...transferHistory,
        {
          fromDate,
          toDate,
          transferredAt,
          type: transferType,
        },
      ],
      updatedAt: transferredAt,
    };
  }

  function manualTransferTask(taskId, toDate, transferType = "manual") {
    const taskIndex = tasks.findIndex((task) => String(task.id) === String(taskId));
    const currentTask = tasks[taskIndex];

    if (
      taskIndex === -1
      || currentTask.status !== "active"
      || !isValidIsoDate(toDate)
      || toDate <= currentTask.date
    ) {
      return false;
    }

    const transferredAt = new Date().toISOString();
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = buildTransferredTask(
      currentTask,
      toDate,
      transferType,
      transferredAt,
    );

    if (!saveTasks(updatedTasks)) {
      return false;
    }

    tasks = updatedTasks;
    renderWeek();
    return true;
  }

  function clearDragHighlights() {
    document.querySelectorAll(
      ".day-column--drop-available, .day-column--drop-target",
    ).forEach((column) => {
      column.classList.remove(
        "day-column--drop-available",
        "day-column--drop-target",
      );
    });
  }

  function markAvailableDropDays(task) {
    document.querySelectorAll(".day-column").forEach((column) => {
      column.classList.toggle(
        "day-column--drop-available",
        task.status === "active" && column.dataset.date > task.date,
      );
    });
  }

  function handleTaskDragStart(event, task) {
    if (task.status !== "active") {
      event.preventDefault();
      return;
    }

    draggedTaskId = task.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(task.id));
    event.currentTarget.classList.add("task-card--dragging");
    document.body.classList.add("task-dragging");
    markAvailableDropDays(task);
  }

  function handleTaskDragEnd(event) {
    event.currentTarget.classList.remove("task-card--dragging");
    document.body.classList.remove("task-dragging");
    clearDragHighlights();
    draggedTaskId = null;
  }

  function getDraggedTask(event) {
    const transferredId = event.dataTransfer.getData("text/plain");
    return getTaskById(draggedTaskId ?? transferredId);
  }

  function handleDayDragOver(event, dayDate, column) {
    const draggedTask = getDraggedTask(event);

    if (!draggedTask || draggedTask.status !== "active" || dayDate <= draggedTask.date) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearDragHighlights();
    markAvailableDropDays(draggedTask);
    column.classList.add("day-column--drop-target");
  }

  function handleDayDragLeave(event, column) {
    if (!column.contains(event.relatedTarget)) {
      column.classList.remove("day-column--drop-target");
    }
  }

  function handleDayDrop(event, dayDate) {
    const draggedTask = getDraggedTask(event);

    if (!draggedTask || draggedTask.status !== "active" || dayDate <= draggedTask.date) {
      return false;
    }

    event.preventDefault();
    const transferred = manualTransferTask(draggedTask.id, dayDate, "drag");
    document.body.classList.remove("task-dragging");
    clearDragHighlights();
    draggedTaskId = null;
    return transferred;
  }

  function autoTransferOverdueTasks(referenceDate = new Date()) {
    const today = formatIsoDate(referenceDate);
    const transferredAt = new Date().toISOString();
    let transferCount = 0;

    const updatedTasks = tasks.map((task) => {
      const shouldTransfer = task.status === "active"
        && /^\d{4}-\d{2}-\d{2}$/.test(task.date)
        && task.date < today;

      if (!shouldTransfer) {
        return task;
      }

      transferCount += 1;
      return buildTransferredTask(task, today, "auto", transferredAt);
    });

    if (transferCount === 0) {
      return 0;
    }

    if (!saveTasks(updatedTasks)) {
      return 0;
    }

    tasks = updatedTasks;
    return transferCount;
  }

  function createDetailsActionButton(label, modifier, handler) {
    const button = document.createElement("button");
    button.className = `button ${modifier}`.trim();
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function formatStoredTaskDate(dateString) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

    if (!match) {
      return dateString || "—";
    }

    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
      "ru-RU",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  }

  function getTaskById(taskId) {
    return tasks.find((task) => String(task.id) === String(taskId));
  }

  function renderTaskDetails() {
    const task = getTaskById(currentDetailsTaskId);

    if (!task) {
      closeTaskDetails(false);
      return;
    }

    const safePriority = Object.hasOwn(PRIORITY_LABELS, task.priority)
      ? task.priority
      : "medium";
    const safeStatus = Object.hasOwn(STATUS_LABELS, task.status)
      ? task.status
      : "active";

    taskDetailsTitle.textContent = task.title;
    taskDetailsDescription.textContent = task.description || "Описание не добавлено.";
    taskDetailsDate.textContent = formatStoredTaskDate(task.date);
    taskDetailsTime.textContent = task.time || "Не указано";
    taskDetailsPriority.textContent = PRIORITY_LABELS[safePriority];
    taskDetailsStatus.textContent = STATUS_LABELS[safeStatus];
    taskDetailsTransferredBadge.hidden = task.isTransferred !== true;
    taskDetailsTransferControls.hidden = true;
    taskDetailsTransferDate.min = formatIsoDate(
      addDays(new Date(`${task.date}T00:00:00`), 1),
    );
    taskDetailsTransferDate.value = taskDetailsTransferDate.min;
    taskDetailsActions.replaceChildren();

    if (safeStatus !== "active") {
      return;
    }

    const editButton = createDetailsActionButton(
      "Редактировать",
      "button--secondary",
      () => {
        const returnTrigger = detailsTrigger;
        closeTaskDetails(false);
        openTaskModal(task, returnTrigger);
      },
    );
    const completeButton = createDetailsActionButton(
      "Выполнить",
      "button--secondary",
      () => completeTask(task.id),
    );
    const cancelButton = createDetailsActionButton(
      "Отменить",
      "button--danger",
      () => confirmCancelTask(task.id),
    );
    const transferButton = createDetailsActionButton(
      "Перенести",
      "button--secondary",
      () => {
        taskDetailsTransferControls.hidden = false;
        taskDetailsTransferDate.focus();

        if (typeof taskDetailsTransferDate.showPicker === "function") {
          try {
            taskDetailsTransferDate.showPicker();
          } catch {
            // Поле остается видимым, если браузер не открыл календарь.
          }
        }
      },
    );

    taskDetailsActions.append(
      editButton,
      completeButton,
      cancelButton,
      transferButton,
    );
  }

  function openTaskDetails(taskId, trigger = document.activeElement) {
    if (!getTaskById(taskId)) {
      return false;
    }

    detailsTrigger = trigger;
    currentDetailsTaskId = taskId;
    renderTaskDetails();
    taskDetailsModal.hidden = false;
    document.body.classList.add("modal-open");
    taskDetailsCloseButton.focus();
    return true;
  }

  function closeTaskDetails(restoreFocus = true) {
    taskDetailsModal.hidden = true;
    taskDetailsTransferControls.hidden = true;
    currentDetailsTaskId = null;

    if (taskModal.hidden) {
      document.body.classList.remove("modal-open");
    }

    if (restoreFocus && detailsTrigger) {
      detailsTrigger.focus();
    }
  }

  function refreshOpenTaskDetails() {
    if (!taskDetailsModal.hidden) {
      renderTaskDetails();
    }
  }

  function createTaskCard(task) {
    const card = document.createElement("article");
    const openButton = document.createElement("button");
    const time = document.createElement("span");
    const title = document.createElement("span");
    const markers = document.createElement("span");
    const priorityMarker = document.createElement("span");
    const safePriority = Object.hasOwn(PRIORITY_LABELS, task.priority)
      ? task.priority
      : "medium";
    const safeStatus = Object.hasOwn(STATUS_ORDER, task.status)
      ? task.status
      : "active";

    card.className = `task-card task-card--${safePriority} task-card--${safeStatus}`;
    card.dataset.taskId = String(task.id);

    if (task.isTransferred === true) {
      card.classList.add("task-card--transferred");
    }

    if (safeStatus === "active") {
      card.draggable = true;
      card.title = "Перетащите задачу на более поздний день";
      card.addEventListener("dragstart", (event) => handleTaskDragStart(event, task));
      card.addEventListener("dragend", handleTaskDragEnd);
    }

    openButton.className = "task-card__open";
    openButton.type = "button";
    openButton.title = `Открыть задачу: ${task.title}`;
    openButton.setAttribute("aria-label", `Открыть задачу «${task.title}»`);
    openButton.addEventListener("click", () => openTaskDetails(task.id, openButton));

    time.className = "task-card__time";
    time.textContent = task.time || "—";

    title.className = "task-card__title";
    title.textContent = task.title;
    title.title = task.title;

    markers.className = "task-card__markers";
    priorityMarker.className = "task-card__priority-dot";
    priorityMarker.title = `Приоритет: ${PRIORITY_LABELS[safePriority]}`;
    priorityMarker.setAttribute(
      "aria-label",
      `Приоритет: ${PRIORITY_LABELS[safePriority]}`,
    );
    markers.append(priorityMarker);

    if (task.isTransferred === true) {
      const transferredMarker = document.createElement("span");
      transferredMarker.className = "task-card__state-mark task-card__state-mark--transferred";
      transferredMarker.textContent = "↗";
      transferredMarker.title = "Перенесена";
      transferredMarker.setAttribute("aria-label", "Перенесена");
      markers.append(transferredMarker);
    }

    if (safeStatus !== "active") {
      const statusMarker = document.createElement("span");
      statusMarker.className = "task-card__state-mark";
      statusMarker.textContent = safeStatus === "completed" ? "✓" : "×";
      statusMarker.title = STATUS_LABELS[safeStatus];
      statusMarker.setAttribute("aria-label", STATUS_LABELS[safeStatus]);
      markers.append(statusMarker);
    }

    openButton.append(time, title, markers);
    card.append(openButton);
    return card;
  }

  function createDayColumn(date, dayIndex, today) {
    const column = document.createElement("article");
    const header = document.createElement("header");
    const dayName = document.createElement("span");
    const dateElement = document.createElement("time");
    const tasksContainer = document.createElement("div");
    const dayDate = formatIsoDate(date);
    const dayTasks = tasks
      .filter((task) => task.date === dayDate)
      .sort(compareTasks);

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
    column.addEventListener(
      "dragover",
      (event) => handleDayDragOver(event, dayDate, column),
    );
    column.addEventListener(
      "dragleave",
      (event) => handleDayDragLeave(event, column),
    );
    column.addEventListener("drop", (event) => handleDayDrop(event, dayDate));

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
    renderStatistics();
    refreshOpenTaskDetails();
  }

  function moveWeek(numberOfWeeks) {
    currentViewedDate = addDays(currentViewedDate, numberOfWeeks * 7);
    autoTransferOverdueTasks();
    renderWeek();
    setExportPeriodForWeek();
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

  function openTaskModal(taskToEdit = null, trigger = document.activeElement) {
    modalTrigger = trigger;
    editingTaskId = taskToEdit?.id ?? null;
    taskForm.reset();
    clearTaskFormError();

    if (taskToEdit && taskToEdit.status === "active") {
      taskModalCaption.textContent = "Редактирование";
      taskModalTitle.textContent = "Редактировать задачу";
      taskSubmitButton.textContent = "Сохранить изменения";
      taskTitleInput.value = taskToEdit.title;
      taskDescriptionInput.value = taskToEdit.description;
      taskDateInput.value = taskToEdit.date;
      taskTimeInput.value = taskToEdit.time;
      taskPriorityInput.value = taskToEdit.priority;
    } else {
      editingTaskId = null;
      taskModalCaption.textContent = "Новая запись";
      taskModalTitle.textContent = "Добавить задачу";
      taskSubmitButton.textContent = "Сохранить";
      taskDateInput.value = formatIsoDate(new Date());
    }

    taskModal.hidden = false;
    document.body.classList.add("modal-open");
    taskTitleInput.focus();
  }

  function closeTaskModal() {
    taskModal.hidden = true;

    if (taskDetailsModal.hidden) {
      document.body.classList.remove("modal-open");
    }

    taskForm.reset();
    clearTaskFormError();
    editingTaskId = null;

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

  function getTaskFormUpdates() {
    return {
      title: taskTitleInput.value.trim(),
      description: taskDescriptionInput.value.trim(),
      date: taskDateInput.value,
      time: taskTimeInput.value,
      priority: taskPriorityInput.value,
    };
  }

  function updateTaskStatus(taskId, nextStatus) {
    const taskIndex = tasks.findIndex((task) => String(task.id) === String(taskId));
    const currentTask = tasks[taskIndex];

    if (taskIndex === -1 || currentTask.status !== "active") {
      return false;
    }

    const timestamp = new Date().toISOString();
    const updatedTask = {
      ...currentTask,
      status: nextStatus,
      updatedAt: timestamp,
    };

    if (nextStatus === "completed") {
      updatedTask.completedAt = timestamp;
    }

    if (nextStatus === "canceled") {
      updatedTask.canceledAt = timestamp;
    }

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;

    if (!saveTasks(updatedTasks)) {
      return false;
    }

    tasks = updatedTasks;
    renderWeek();
    return true;
  }

  function completeTask(taskId) {
    return updateTaskStatus(taskId, "completed");
  }

  function confirmCancelTask(taskId) {
    const confirmed = window.confirm(
      "Отменить задачу? Она останется в списке со статусом «Отменена».",
    );

    return confirmed ? updateTaskStatus(taskId, "canceled") : false;
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

    let updatedTasks;

    if (editingTaskId !== null) {
      const taskIndex = tasks.findIndex(
        (task) => String(task.id) === String(editingTaskId),
      );
      const currentTask = tasks[taskIndex];

      if (taskIndex === -1 || currentTask.status !== "active") {
        showTaskFormError("Редактировать можно только активную задачу.");
        return;
      }

      const updatedTask = {
        ...currentTask,
        ...getTaskFormUpdates(),
        updatedAt: new Date().toISOString(),
      };

      updatedTasks = [...tasks];
      updatedTasks[taskIndex] = updatedTask;
    } else {
      updatedTasks = [...tasks, createTaskFromForm()];
    }

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
    autoTransferOverdueTasks();
    renderWeek();
    setExportPeriodForWeek();
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
  taskDetailsCloseButton.addEventListener("click", () => closeTaskDetails());
  taskDetailsModal.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-details-close")) {
      closeTaskDetails();
    }
  });
  taskDetailsTransferDate.addEventListener("change", () => {
    if (
      currentDetailsTaskId === null
      || !manualTransferTask(currentDetailsTaskId, taskDetailsTransferDate.value)
    ) {
      taskDetailsTransferControls.hidden = true;
    }
  });
  taskDetailsTransferCancelButton.addEventListener("click", () => {
    taskDetailsTransferControls.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !taskModal.hidden) {
      closeTaskModal();
    } else if (event.key === "Escape" && !taskDetailsModal.hidden) {
      closeTaskDetails();
    }
  });
  taskTitleInput.addEventListener("input", clearTaskFormError);
  taskDateInput.addEventListener("input", clearTaskFormError);
  exportStartDate.addEventListener("input", clearExportMessage);
  exportEndDate.addEventListener("input", clearExportMessage);
  exportCsvButton.addEventListener("click", downloadTasksCsv);
  printPdfButton.addEventListener("click", printTasks);

  tasks = loadTasks();
  autoTransferOverdueTasks();
  renderWeek();
  setExportPeriodForWeek();

  window.taskPlannerStorage = Object.freeze({
    key: STORAGE_KEY,
    loadTasks,
    saveTasks,
    clearTasks: clearStoredTasks,
  });

  window.taskPlannerExport = Object.freeze({
    columns: [...CSV_COLUMNS],
    escapeCsvValue,
    createCsvContent,
    filterTasksByPeriod,
    downloadTasksCsv,
    printTasks,
  });

  window.taskPlannerCalendar = Object.freeze({
    get currentViewedDate() {
      return new Date(currentViewedDate);
    },
    getWeekStart,
    formatDateRange,
    getDominantMonth,
    calculateStatistics,
    renderWeek,
  });

  window.taskPlannerTasks = Object.freeze({
    get tasks() {
      return tasks.map((task) => ({ ...task }));
    },
    createTaskFromForm,
    openTaskModal,
    closeTaskModal,
    openTaskDetails,
    closeTaskDetails,
    compareTasks,
    completeTask,
    confirmCancelTask,
    manualTransferTask,
    autoTransferOverdueTasks,
    handleDayDrop,
  });
})();
