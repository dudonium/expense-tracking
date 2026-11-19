let categories = [];
let currentOffset = 0;
const PAGE_LIMIT = 5;

function showGlobalError(msg) {
    const alertEl = document.getElementById("global-alert");
    alertEl.textContent = msg;
    alertEl.classList.remove("hidden");
    setTimeout(() => alertEl.classList.add("hidden"), 5000);
}

function formatMoney(val) {
    return Number(val).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateShort(isoDate) {
    const parts = isoDate.split("-");
    return `${parts[2]}.${parts[1]}`;
}

function getFilterParams() {
    const params = new URLSearchParams();
    const search = document.getElementById("filter-search").value.trim();
    const categoryId = document.getElementById("filter-category").value;
    const dateFrom = document.getElementById("filter-from").value;
    const dateTo = document.getElementById("filter-to").value;
    const sortBy = document.getElementById("sort-select").value;

    if (search) params.set("search", search);
    if (categoryId) params.set("category_id", categoryId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("sort_by", sortBy);
    return params;
}

async function checkAuth() {
    const user = await apiRequest("/api/auth/me");
    document.getElementById("user-name").textContent = user.username;
}

async function loadCategories() {
    categories = await apiRequest("/api/categories");

    const chipsBox = document.getElementById("categories-list");
    const formSelect = document.getElementById("exp-category");
    const filterSelect = document.getElementById("filter-category");

    chipsBox.innerHTML = "";
    formSelect.innerHTML = "";
    filterSelect.innerHTML = "";

    const defaultFormOpt = document.createElement("option");
    defaultFormOpt.value = "";
    defaultFormOpt.textContent = "Без категории";
    formSelect.appendChild(defaultFormOpt);

    const defaultFilterOpt = document.createElement("option");
    defaultFilterOpt.value = "";
    defaultFilterOpt.textContent = "Все категории";
    filterSelect.appendChild(defaultFilterOpt);

    categories.forEach(cat => {

        const chip = document.createElement("div");
        chip.className = "chip";

        const label = document.createElement("span");
        label.textContent = cat.name;

        const delBtn = document.createElement("button");
        delBtn.className = "chip-del";
        delBtn.type = "button";
        delBtn.textContent = "×";
        delBtn.title = "Удалить категорию";
        delBtn.addEventListener("click", async () => {
            try {
                await apiRequest(`/api/categories/${cat.id}`, { method: "DELETE" });
                await refreshAll();
            } catch (err) {
                showGlobalError(err.message);
            }
        });

        chip.appendChild(label);
        chip.appendChild(delBtn);
        chipsBox.appendChild(chip);

        const opt1 = document.createElement("option");
        opt1.value = cat.id;
        opt1.textContent = cat.name;
        formSelect.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = cat.id;
        opt2.textContent = cat.name;
        filterSelect.appendChild(opt2);
    });
}

async function loadStats() {
    const params = new URLSearchParams();
    const dateFrom = document.getElementById("filter-from").value;
    const dateTo = document.getElementById("filter-to").value;
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const periodLabel = document.getElementById("current-period-label");
    if (dateFrom || dateTo) {
        periodLabel.textContent = `${dateFrom || "..."} — ${dateTo || "..."}`;
    } else {
        periodLabel.textContent = "За всё время";
    }

    const stats = await apiRequest(`/api/expenses/stats?${params.toString()}`);

    document.getElementById("stat-balance").textContent = formatMoney(stats.balance);
    document.getElementById("stat-income").textContent = formatMoney(stats.total_income);
    document.getElementById("stat-expense").textContent = formatMoney(stats.total_expense);

    const chartContainer = document.getElementById("chart-container");
    chartContainer.innerHTML = "";

    if (!stats.by_category.length) {
        const empty = document.createElement("div");
        empty.className = "state-msg";
        empty.textContent = "Нет расходов за выбранный период для построения графика";
        chartContainer.appendChild(empty);
        return;
    }

    const barsArea = document.createElement("div");
    barsArea.className = "bars-area";

    const legendArea = document.createElement("div");
    legendArea.className = "legend-area";

    const maxPct = Math.max(...stats.by_category.map(c => c.percentage), 1);

    stats.by_category.forEach(item => {
        const col = document.createElement("div");
        col.className = "bar-col";

        const pctText = document.createElement("span");
        pctText.className = "bar-pct";
        pctText.textContent = `${Math.round(item.percentage)}%`;

        const fill = document.createElement("div");
        fill.className = "bar-fill";
        fill.style.backgroundColor = item.color;
        fill.style.height = `${Math.max((item.percentage / maxPct) * 120, 10)}px`;

        col.appendChild(pctText);
        col.appendChild(fill);
        barsArea.appendChild(col);

        const legItem = document.createElement("div");
        legItem.className = "legend-item";

        const dot = document.createElement("span");
        dot.className = "legend-dot";
        dot.style.backgroundColor = item.color;

        const nameSpan = document.createElement("span");
        nameSpan.textContent = `${item.category_name} (${formatMoney(item.total)} ₽)`;

        legItem.appendChild(dot);
        legItem.appendChild(nameSpan);
        legendArea.appendChild(legItem);
    });

    chartContainer.appendChild(barsArea);
    chartContainer.appendChild(legendArea);
}

async function loadExpenses(append = false) {
    const tbody = document.getElementById("expenses-tbody");
    const stateEl = document.getElementById("list-state");
    const loadMoreBtn = document.getElementById("load-more-btn");

    if (!append) {
        currentOffset = 0;
        tbody.innerHTML = "";
        stateEl.textContent = "Загрузка...";
        stateEl.classList.remove("hidden");
    }

    const params = getFilterParams();
    params.set("limit", PAGE_LIMIT);
    params.set("offset", currentOffset);

    const items = await apiRequest(`/api/expenses?${params.toString()}`);

    if (!append && items.length === 0) {
        stateEl.textContent = "Операций пока нет. Добавьте первую запись!";
        loadMoreBtn.classList.add("hidden");
        return;
    }

    stateEl.classList.add("hidden");

    items.forEach(exp => {
        const tr = document.createElement("tr");

        const tdDate = document.createElement("td");
        tdDate.textContent = formatDateShort(exp.spent_date);

        const tdTitle = document.createElement("td");
        tdTitle.textContent = exp.title;
        if (exp.comment) {
            tdTitle.title = exp.comment;
        }

        const tdCat = document.createElement("td");
        tdCat.textContent = exp.category ? exp.category.name : "Без категории";

        const tdAmount = document.createElement("td");
        tdAmount.className = exp.is_income ? "amount-pos" : "amount-neg";
        const sign = exp.is_income ? "+" : "-";
        tdAmount.textContent = `${sign}${formatMoney(exp.amount)} ₽`;

        const tdActions = document.createElement("td");
        const actionsWrap = document.createElement("div");
        actionsWrap.className = "action-btns";

        const editBtn = document.createElement("button");
        editBtn.className = "icon-btn";
        editBtn.type = "button";
        editBtn.textContent = "✎";
        editBtn.title = "Изменить";
        editBtn.addEventListener("click", () => startEditExpense(exp));

        const delBtn = document.createElement("button");
        delBtn.className = "icon-btn del";
        delBtn.type = "button";
        delBtn.textContent = "🗑";
        delBtn.title = "Удалить";
        delBtn.addEventListener("click", async () => {
            try {
                await apiRequest(`/api/expenses/${exp.id}`, { method: "DELETE" });
                await refreshAll();
            } catch (err) {
                showGlobalError(err.message);
            }
        });

        actionsWrap.appendChild(editBtn);
        actionsWrap.appendChild(delBtn);
        tdActions.appendChild(actionsWrap);

        tr.appendChild(tdDate);
        tr.appendChild(tdTitle);
        tr.appendChild(tdCat);
        tr.appendChild(tdAmount);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });

    currentOffset += items.length;
    if (items.length === PAGE_LIMIT) {
        loadMoreBtn.classList.remove("hidden");
    } else {
        loadMoreBtn.classList.add("hidden");
    }
}

function startEditExpense(exp) {
    document.getElementById("edit-expense-id").value = exp.id;
    document.getElementById("form-title").textContent = "Редактирование";
    document.getElementById("exp-submit-btn").textContent = "Сохранить";
    document.getElementById("cancel-edit-btn").classList.remove("hidden");

    document.getElementById("exp-title").value = exp.title;
    document.getElementById("exp-amount").value = exp.amount;
    document.getElementById("exp-date").value = exp.spent_date;
    document.getElementById("exp-category").value = exp.category_id || "";
    document.getElementById("exp-comment").value = exp.comment || "";

    const radioVal = exp.is_income ? "income" : "expense";
    document.querySelector(`input[name="op_type"][value="${radioVal}"]`).checked = true;
}

function resetExpenseForm() {
    document.getElementById("expense-form").reset();
    document.getElementById("edit-expense-id").value = "";
    document.getElementById("form-title").textContent = "Добавление расхода";
    document.getElementById("exp-submit-btn").textContent = "Добавить";
    document.getElementById("cancel-edit-btn").classList.add("hidden");
    document.getElementById("exp-date").valueAsDate = new Date();
}

async function refreshAll() {
    await loadStats();
    await loadExpenses(false);
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await checkAuth();
        document.getElementById("exp-date").valueAsDate = new Date();
        await loadCategories();
        await refreshAll();
    } catch (err) {
        console.error(err);
    }

    document.getElementById("logout-btn").addEventListener("click", async () => {
        await apiRequest("/api/auth/logout", { method: "POST" });
        window.location.href = "/login.html";
    });

    document.getElementById("category-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("new-category-name");
        try {
            await apiRequest("/api/categories", {
                method: "POST",
                body: JSON.stringify({ name: input.value })
            });
            input.value = "";
            await loadCategories();
        } catch (err) {
            showGlobalError(err.message);
        }
    });

    document.getElementById("expense-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("edit-expense-id").value;
        const catVal = document.getElementById("exp-category").value;
        const opType = document.querySelector('input[name="op_type"]:checked').value;

        const payload = {
            title: document.getElementById("exp-title").value,
            amount: parseFloat(document.getElementById("exp-amount").value),
            spent_date: document.getElementById("exp-date").value,
            category_id: catVal ? parseInt(catVal, 10) : null,
            comment: document.getElementById("exp-comment").value || null,
            is_income: opType === "income"
        };

        try {
            if (editId) {
                await apiRequest(`/api/expenses/${editId}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                });
            } else {
                await apiRequest("/api/expenses", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            }
            resetExpenseForm();
            await refreshAll();
        } catch (err) {
            showGlobalError(err.message);
        }
    });

    document.getElementById("cancel-edit-btn").addEventListener("click", resetExpenseForm);

    document.getElementById("filter-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await refreshAll();
    });

    document.getElementById("reset-filters-btn").addEventListener("click", async () => {
        document.getElementById("filter-form").reset();
        await refreshAll();
    });

    document.getElementById("sort-select").addEventListener("change", () => loadExpenses(false));
    document.getElementById("load-more-btn").addEventListener("click", () => loadExpenses(true));
});