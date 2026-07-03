/* script.js - Shared logic for index.html and dashboard.html */

(function () {
  const STORAGE_KEY = "expenses";

  // Utility: fetch expenses from localStorage
  function getExpenses() {
    const data = localStorage.getItem(STORAGE_KEY);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to parse stored expenses:", e);
      return [];
    }
  }

  // Utility: persist expenses to localStorage
  function saveExpenses(expenses) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error("Failed to save expenses:", e);
    }
  }

  // Add a new expense object and persist
  function addExpense(expense) {
    const expenses = getExpenses();
    expenses.push(expense);
    saveExpenses(expenses);
    // Notify other tabs/pages
    window.dispatchEvent(new Event("expensesUpdated"));
  }

  // Calculate total amount from an array of expenses
  function calculateTotal(expenses) {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }

  // Compute breakdown by category (sum and percentage)
  function calculateBreakdown(expenses) {
    const total = calculateTotal(expenses) || 1; // avoid div by zero
    const categories = {};
    expenses.forEach((exp) => {
      if (!categories[exp.category]) categories[exp.category] = 0;
      categories[exp.category] += exp.amount;
    });
    const result = {};
    Object.entries(categories).forEach(([cat, amt]) => {
      result[cat] = {
        amount: amt,
        percent: ((amt / total) * 100).toFixed(1),
      };
    });
    return result;
  }

  // Formatting helpers
  function formatCurrency(val) {
    return "$" + val.toFixed(2);
  }

  function formatDate(str) {
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString();
  }

  // ---------- INDEX PAGE LOGIC ----------
  function initIndexPage() {
    const form = document.getElementById("expense-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const desc = document.getElementById("desc").value.trim();
      const amountVal = document.getElementById("amount").value;
      const category = document.getElementById("category").value;
      const dateVal = document.getElementById("date").value;

      if (!desc || !amountVal || !dateVal) {
        alert("Please fill in all fields.");
        return;
      }

      const amount = parseFloat(amountVal);
      if (isNaN(amount) || amount <= 0) {
        alert("Enter a valid amount.");
        return;
      }

      const expense = {
        id: Date.now(),
        description: desc,
        amount: amount,
        category: category,
        date: dateVal, // store as YYYY-MM-DD
      };

      addExpense(expense);
      form.reset();
      alert("Expense added successfully!");
    });
  }

  // ---------- DASHBOARD PAGE LOGIC ----------
  function initDashboardPage() {
    const totalEl = document.getElementById("total-amount");
    const breakdownEl = document.getElementById("category-breakdown");
    const expensesBody = document.getElementById("expenses-body");
    const filterForm = document.getElementById("filter-form");

    if (!totalEl || !breakdownEl || !expensesBody) return;

    // Render all expenses (or filtered list)
    function render(expenses) {
      // Total
      const total = calculateTotal(expenses);
      totalEl.textContent = formatCurrency(total);

      // Breakdown
      const breakdown = calculateBreakdown(expenses);
      breakdownEl.innerHTML = "";
      const categories = ["Food", "Transport", "Bills", "Other"];
      categories.forEach((cat) => {
        const data = breakdown[cat] || { amount: 0, percent: "0.0" };
        const row = document.createElement("div");
        row.className = "breakdown-item";
        row.innerHTML = `
          <span class="cat-name">${cat}</span>
          <span class="cat-amt">${formatCurrency(data.amount)}</span>
          <span class="cat-pct">(${data.percent}%)</span>
        `;
        breakdownEl.appendChild(row);
      });

      // Table rows
      expensesBody.innerHTML = "";
      if (expenses.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "No expenses to display.";
        td.style.textAlign = "center";
        tr.appendChild(td);
        expensesBody.appendChild(tr);
        return;
      }

      expenses
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach((exp) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${exp.description}</td>
            <td>${formatCurrency(exp.amount)}</td>
            <td>${exp.category}</td>
            <td>${formatDate(exp.date)}</td>
          `;
          expensesBody.appendChild(tr);
        });
    }

    // Apply filters from the filter form (if present)
    function applyFilters() {
      const allExpenses = getExpenses();
      if (!filterForm) {
        render(allExpenses);
        return;
      }

      const catVal = document.getElementById("filter-category").value;
      const startVal = document.getElementById("filter-start").value;
      const endVal = document.getElementById("filter-end").value;

      let filtered = allExpenses;

      if (catVal && catVal !== "All") {
        filtered = filtered.filter((e) => e.category === catVal);
      }

      if (startVal) {
        const startDate = new Date(startVal);
        filtered = filtered.filter((e) => new Date(e.date) >= startDate);
      }

      if (endVal) {
        const endDate = new Date(endVal);
        filtered = filtered.filter((e) => new Date(e.date) <= endDate);
      }

      render(filtered);
    }

    // Initial render
    applyFilters();

    // Hook filter changes
    if (filterForm) {
      filterForm.addEventListener("change", applyFilters);
      filterForm.addEventListener("submit", function (e) {
        e.preventDefault();
        applyFilters();
      });
    }

    // Listen for updates from other tabs/pages
    window.addEventListener("expensesUpdated", applyFilters);
    window.addEventListener("storage", function (e) {
      if (e.key === STORAGE_KEY) applyFilters();
    });
  }

  // ---------- COMMON INITIALISATION ----------
  document.addEventListener("DOMContentLoaded", function () {
    initIndexPage();
    initDashboardPage();
  });
})();