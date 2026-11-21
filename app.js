/*
  حالت نمایشی: داده‌ها از reports.json خوانده می‌شوند.
  بعد از آماده‌شدن بک‌اند، API_BASE_URL را تنظیم و USE_API را true کنید.
*/
const USE_API = true;
const API_BASE_URL = "https://agent-analysis-b.onrender.com";
/*کد برای اجرای فرانت: python -m http.server 5500*/
const reportsElement = document.getElementById("reports");
const searchInput = document.getElementById("searchInput");
const severityFilter = document.getElementById("severityFilter");
const reportCount = document.getElementById("reportCount");
const lastUpdated = document.getElementById("lastUpdated");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");

let allReports = [];

const severityLabels = { high: "زیاد", medium: "متوسط", low: "کم" };
const faNumber = value => Number(value || 0).toLocaleString("fa-IR");
const formatDate = value => {
  if (!value) return "تاریخ نامشخص";
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" }).format(date);
};
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[ch]));


async function loadReports() {
  reportCount.classList.add("is-loading");
  reportCount.textContent = "در حال دریافت گزارش‌ها...";
  errorState.hidden = true;

  try {
    const url = USE_API ? `${API_BASE_URL}/api/reports` : "./reports.json";
    await new Promise(resolve => setTimeout(resolve, 3000));
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`خطا در دریافت گزارش‌ها (${response.status})`);
    }

    const data = await response.json();

    allReports = Array.isArray(data) ? data : (data.reports || [data]);

    allReports.sort((a, b) =>
      String(b.report_date).localeCompare(String(a.report_date))
    );

    lastUpdated.textContent = `آخرین دریافت: ${new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date())}`;

    reportCount.classList.remove("is-loading");
    renderReports();

  } catch (error) {
    reportCount.classList.remove("is-loading");
    errorState.hidden = false;
    errorState.textContent = `دریافت اطلاعات ناموفق بود: ${error.message}`;
    reportCount.textContent = "گزارشی دریافت نشد";
  }
}


function renderReports() {
  const query = searchInput.value.trim().toLocaleLowerCase("fa");
  const severity = severityFilter.value;

  const filtered = allReports.filter(report => {
    const problems = report.problems || [];
    const matchesSeverity = severity === "all" || problems.some(p => p.severity === severity);
    const searchable = [
      report.report_date, report.report_title, report.daily_summary?.description,
      ...problems.flatMap(p => [p.title, p.description])
    ].join(" ").toLocaleLowerCase("fa");
    return matchesSeverity && (!query || searchable.includes(query));
  });

  reportCount.textContent = `${faNumber(filtered.length)} گزارش`;
  emptyState.hidden = filtered.length > 0;
  reportsElement.innerHTML = filtered.map((report, index) => {
    const problems = (report.problems || []).filter(p => severity === "all" || p.severity === severity);
    const isOpen = index === 0;
    return `
      <article class="report-card ${isOpen ? "open" : ""}">
        <button class="report-toggle" type="button" aria-expanded="${isOpen}">
          <span class="report-date">${escapeHTML(formatDate(report.report_date))}</span>
          <span class="report-toggle-left">
            <span class="problem-total">${faNumber(problems.length)} مشکل</span>
            <i class="chevron" aria-hidden="true"></i>
          </span>
        </button>
        <div class="report-body" ${isOpen ? "" : "hidden"}>
          <div class="section-label">${escapeHTML(report.daily_summary?.title || "خلاصه کلی")}</div>
          <p class="summary">${escapeHTML(report.daily_summary?.description || "خلاصه‌ای برای این روز ثبت نشده است.")}</p>
          <div class="problem-heading">مشکلات این روز</div>
          <div class="problem-list">
            ${problems.length ? problems.map((p, i) => `
              <div class="problem-item">
                <span class="problem-number">${faNumber(i + 1)}</span>
                <div class="problem-main">
                  <div class="problem-title">${escapeHTML(p.title || "مشکل بدون عنوان")}</div>
                  ${p.description ? `<div class="problem-description">${escapeHTML(p.description)}</div>` : ""}
                </div>
                <div class="problem-meta">
                  <span class="count">${faNumber(p.count)} پیام</span>
                  <span class="severity ${["high", "medium", "low"].includes(p.severity) ? p.severity : "low"}">${severityLabels[p.severity] || "نامشخص"}</span>
                </div>
              </div>`).join("") : `<div class="problem-description">موردی مطابق فیلتر انتخاب‌شده وجود ندارد.</div>`}
          </div>
        </div>
      </article>`;
  }).join("");

  reportsElement.querySelectorAll(".report-toggle").forEach(button => {
    button.addEventListener("click", () => {
      const card = button.closest(".report-card");
      const body = card.querySelector(".report-body");
      const open = card.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
      body.hidden = !open;
    });
  });
}

searchInput.addEventListener("input", renderReports);
severityFilter.addEventListener("change", renderReports);
loadReports();
