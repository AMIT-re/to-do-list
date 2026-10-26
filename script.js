
"use strict";

// 1. DOM references
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit");
const emptyState = document.getElementById("empty-state");
const emptyTitle = document.getElementById("empty-title");
const emptyMessage = document.getElementById("empty-message");
const clearCompletedBtn = document.getElementById("clear-completed");
const saveStatus = document.getElementById("save-status");

const totalCount = document.getElementById("total-count");
const activeCount = document.getElementById("active-count");
const completedCount = document.getElementById("completed-count");
const remainingText = document.getElementById("remaining-text");

const filterButtons = document.querySelector(".filters");

// 2. Application state
const STORAGE_KEY = "taskflow_tasks";

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

// 3. Read saved tasks safely
function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.text === "string" &&
            typeof task.completed === "boolean"
        );
    } catch (error) {
        console.error("Could not load tasks:", error);
        return [];
    }
}

// 4. Save state to localStorage
function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        saveStatus.textContent = "Saved locally";
    } catch (error) {
        console.error("Could not save tasks:", error);
        saveStatus.textContent = "Unable to save";
    }
}

// 5. Add or update a task
taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const text = taskInput.value.trim();

    if (!text) {
        taskInput.focus();
        return;
    }

    if (editingTaskId !== null) {
        tasks = tasks.map(task =>
            task.id === editingTaskId
                ? { ...task, text: text }
                : task
        );
    } else {
        const newTask = {
            id: createTaskId(),
            text: text,
            completed: false,
            createdAt: Date.now()
        };

        tasks.unshift(newTask);
    }

    saveTasks();
    resetEditor();
    renderTasks();
});

function createTaskId() {
    if (typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// 6. Reset add/edit form
function resetEditor() {
    editingTaskId = null;
    taskForm.reset();
    submitBtn.textContent = "+ Add Task";
    cancelEditBtn.hidden = true;
}

// 7. Start editing an existing task
function startEditing(task) {
    editingTaskId = task.id;
    taskInput.value = task.text;
    submitBtn.textContent = "Save Changes";
    cancelEditBtn.hidden = false;
    taskInput.focus();
}

// 8. Cancel editing
cancelEditBtn.addEventListener("click", function () {
    resetEditor();
});

// 9. Event delegation for task actions
taskList.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");

    if (!button || !taskList.contains(button)) {
        return;
    }

    const taskItem = button.closest(".task-item");

    if (!taskItem) {
        return;
    }

    const taskId = taskItem.dataset.id;
    const action = button.dataset.action;
    const task = tasks.find(item => item.id === taskId);

    if (!task) {
        return;
    }

    if (action === "edit") {
        startEditing(task);
    }

    if (action === "delete") {
        tasks = tasks.filter(item => item.id !== taskId);

        if (editingTaskId === taskId) {
            resetEditor();
        }

        saveTasks();
        renderTasks();
    }
});

// 10. Handle completion using event delegation
taskList.addEventListener("change", function (event) {
    const checkbox = event.target;

    if (!checkbox.matches('input[data-action="toggle"]')) {
        return;
    }

    const taskItem = checkbox.closest(".task-item");

    if (!taskItem) {
        return;
    }

    const taskId = taskItem.dataset.id;

    tasks = tasks.map(task =>
        task.id === taskId
            ? { ...task, completed: checkbox.checked }
            : task
    );

    saveTasks();
    renderTasks();
});

// 11. Filtering
filterButtons.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-filter]");

    if (!button) {
        return;
    }

    currentFilter = button.dataset.filter;

    filterButtons.querySelectorAll("[data-filter]").forEach(btn => {
        const selected = btn.dataset.filter === currentFilter;

        btn.classList.toggle("active", selected);
        btn.setAttribute("aria-pressed", String(selected));
    });

    renderTasks();
});

// 12. Clear all completed tasks
clearCompletedBtn.addEventListener("click", function () {
    const completedTasks = tasks.filter(task => task.completed);

    if (completedTasks.length === 0) {
        return;
    }

    tasks = tasks.filter(task => !task.completed);

    if (editingTaskId !== null &&
        !tasks.some(task => task.id === editingTaskId)) {
        resetEditor();
    }

    saveTasks();
    renderTasks();
});

// 13. Select tasks based on the active filter
function getFilteredTasks() {
    if (currentFilter === "active") {
        return tasks.filter(task => !task.completed);
    }

    if (currentFilter === "completed") {
        return tasks.filter(task => task.completed);
    }

    return tasks;
}

// 14. Create task DOM elements safely
function createTaskElement(task) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.id = task.id;

    if (task.completed) {
        li.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";
    checkbox.setAttribute(
        "aria-label",
        `Mark "${task.text}" as ${task.completed ? "active" : "completed"}`
    );

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "action-btn";
    editBtn.dataset.action = "edit";
    editBtn.textContent = "Edit";
    editBtn.setAttribute("aria-label", `Edit ${task.text}`);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "action-btn delete-btn";
    deleteBtn.dataset.action = "delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", `Delete ${task.text}`);

    actions.append(editBtn, deleteBtn);
    li.append(checkbox, text, actions);

    return li;
}

// 15. Render the UI from the current state
function renderTasks() {
    const visibleTasks = getFilteredTasks();
    const fragment = document.createDocumentFragment();

    visibleTasks.forEach(task => {
        fragment.appendChild(createTaskElement(task));
    });

    // Replace the old task elements in one operation.
    taskList.replaceChildren(fragment);

    // Update task counters.
    const completed = tasks.filter(task => task.completed).length;
    const active = tasks.length - completed;

    totalCount.textContent = tasks.length;
    activeCount.textContent = active;
    completedCount.textContent = completed;
    remainingText.textContent =
        `${active} ${active === 1 ? "task" : "tasks"} remaining`;

    // Display a useful empty state.
    const hasVisibleTasks = visibleTasks.length > 0;
    emptyState.hidden = hasVisibleTasks;
    taskList.hidden = !hasVisibleTasks;

    if (!hasVisibleTasks) {
        if (currentFilter === "active" && tasks.length > 0) {
            emptyTitle.textContent = "All caught up!";
            emptyMessage.textContent =
                "You have no active tasks. Nice work.";
        } else if (currentFilter === "completed" && tasks.length > 0) {
            emptyTitle.textContent = "Nothing completed yet";
            emptyMessage.textContent =
                "Finish a task and it will appear here.";
        } else {
            emptyTitle.textContent = "Ready to get things done?";
            emptyMessage.textContent =
                "Add your first task above to get started.";
        }
    }

    clearCompletedBtn.disabled = completed === 0;
    clearCompletedBtn.style.opacity = completed === 0 ? "0.5" : "1";
}

// 16. Initial render when the page loads
renderTasks();
