
/* AMMAR MARKET PULSE - GOLD ALERTS */
(function () {
  "use strict";

  const LANG = () =>
    document.documentElement.lang === "en" ? "en" : "ar";

  const TEXT = {
    title: ["تنبيهات أخبار الذهب", "Gold News Alerts"],
    enable: ["تفعيل التنبيهات", "Enable notifications"],
    loading: ["جارٍ فحص الأخبار...", "Checking news..."],
    empty: [
      "لا توجد أخبار مرتبطة بالذهب في الموجز الحالي.",
      "No gold-related news in the current feed."
    ],
    error: [
      "تعذر تحميل الأخبار. حاول لاحقًا.",
      "Could not load news. Try again later."
    ],
    source: ["قراءة الخبر من المصدر", "Read source"],
    permission: [
      "اسمح بالإشعارات من المتصفح لتلقي التنبيهات أثناء فتح الموقع.",
      "Allow browser notifications to receive alerts while the site is open."
    ]
  };

  const t = (key) => TEXT[key][LANG() === "en" ? 1 : 0];

  const keywords =
    /gold|xauusd|bullion|precious metal|federal reserve|interest rate|inflation|cpi|pce|nonfarm|payroll|unemployment|dollar|treasury yield|الذهب|الفيدرالي|الفائدة|التضخم|الدولار|الوظائف/i;

  function start() {
    if (document.getElementById("ammarGoldAlerts")) return;

    const panel = document.createElement("section");
    panel.id = "ammarGoldAlerts";
    panel.style.cssText =
      "margin:18px 0;padding:16px;border:1px solid #8b6b2e;" +
      "border-radius:14px;background:#0d1b2b;color:#eef4fb;" +
      "font-family:inherit;";

    const title = document.createElement("h2");
    title.textContent = "🟡 " + t("title");
    title.style.marginTop = "0";

    const note = document.createElement("p");
    note.textContent = t("permission");

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = t("enable");
    button.style.cssText =
      "padding:10px 14px;border:0;border-radius:8px;" +
      "background:#f2c66d;color:#07111e;font-weight:bold;";

    const status = document.createElement("p");
    status.textContent = t("loading");

    const list = document.createElement("div");
    list.style.cssText = "display:grid;gap:10px;";

    panel.append(title, note, button, status, list);

    const target =
      document.getElementById("liveNewsList") ||
      document.querySelector("main") ||
      document.body;

    target.appendChild(panel);

    button.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        status.textContent =
          "المتصفح لا يدعم إشعارات الويب.";
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        status.textContent =
          permission === "granted"
            ? "تم السماح بالإشعارات. يجب إبقاء الموقع مفتوحًا."
            : "لم يتم السماح بالإشعارات.";
      } catch (_) {
        status.textContent = "تعذر تفعيل الإشعارات.";
      }
    });

    async function refresh() {
      try {
        const response = await fetch("./news.json?ts=" + Date.now(), {
          cache: "no-store"
        });

        if (!response.ok) throw new Error("News unavailable");

        const data = await response.json();
        const items = Array.isArray(data.items) ? data.items : [];
        const matches = items.filter(item =>
          item && item.title && item.url &&
          keywords.test(item.title + " " + (item.source || ""))
        );

        list.replaceChildren();

        if (!matches.length) {
          status.textContent = t("empty");
          return;
        }

        matches.slice(0, 8).forEach(item => {
          const card = document.createElement("article");
          card.style.cssText =
            "padding:10px;border:1px solid #20354b;border-radius:9px;";

          const heading = document.createElement("strong");
          heading.textContent = item.title;

          const source = document.createElement("p");
          source.textContent = item.source || "News source";

          const link = document.createElement("a");
          link.href = item.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = t("source");
          link.style.color = "#f2c66d";

          card.append(heading, source, link);
          list.appendChild(card);
        });

        status.textContent =
          (LANG() === "en" ? "Matching headlines: " : "عدد الأخبار المرتبطة: ") +
          matches.length;
      } catch (_) {
        status.textContent = t("error");
      }
    }

    refresh();
    window.setInterval(refresh, 5 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
