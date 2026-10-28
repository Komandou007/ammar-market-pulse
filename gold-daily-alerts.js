
/* AMMAR MARKET PULSE - GOLD ALERTS V2 */
(function () {
  "use strict";

  const ID = "ammarGoldAlerts";
  if (document.getElementById(ID)) return;

  const isEnglish = () => document.documentElement.lang === "en";
  const text = (ar, en) => isEnglish() ? en : ar;

  const directGold =
    /\b(gold|xauusd|bullion|precious metals?)\b|الذهب|المعادن الثمينة/i;

  const goldDrivers =
    /\b(federal reserve|fed\b|fomc|interest rates?|inflation|cpi|pce|nonfarm|payrolls?|unemployment|us dollar|dxy|treasury yields?|jobs report|central bank|rate decision|powell)\b|الفيدرالي|الفائدة|التضخم|الدولار|عوائد السندات|الوظائف|البنك المركزي/i;

  const panel = document.createElement("section");
  panel.id = ID;
  panel.style.cssText =
    "margin:18px 0;padding:16px;border:1px solid #8b6b2e;" +
    "border-radius:14px;background:#0d1b2b;color:#eef4fb;" +
    "font-family:inherit;direction:rtl;";

  const title = document.createElement("h2");
  title.textContent = "🟡 " +
    text("تنبيهات الذهب والأخبار المؤثرة", "Gold & Market Alerts");

  const description = document.createElement("p");
  description.textContent = text(
    "يراقب هذا القسم موجز الأخبار المنشور بالموقع. أبقِ الصفحة مفتوحة لاستقبال الإشعارات.",
    "This panel monitors the site's news feed. Keep this page open to receive notifications."
  );

  const enable = document.createElement("button");
  enable.type = "button";
  enable.textContent = text("تفعيل إشعارات الأخبار", "Enable news notifications");
  enable.style.cssText =
    "padding:10px 14px;border:0;border-radius:8px;" +
    "background:#f2c66d;color:#07111e;font-weight:bold;";

  const status = document.createElement("p");
  status.textContent = text("جارٍ تحميل الأخبار...", "Loading news...");

  const list = document.createElement("div");
  list.style.cssText = "display:grid;gap:10px;";

  panel.append(title, description, enable, status, list);

  const target =
  document.getElementById("live-news") ||
  document.querySelector("main") ||
  document.body;

  target.appendChild(panel);

  const storageKey = "ammarGoldAlertsSeenV2";
  let seen = new Set();
  let initialized = false;
  let busy = false;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) seen = new Set(saved);
  } catch (_) {}

  function getItems(data) {
    return Array.isArray(data.items) ? data.items : [];
  }

  function itemKey(item) {
    return String(item.url || "") ||
      String(item.title || "") + "|" + String(item.published || "");
  }

  function makeLink(item) {
    const card = document.createElement("article");
    card.style.cssText =
      "padding:12px;border:1px solid #20354b;border-radius:10px;";

    const category = document.createElement("small");
    category.textContent = directGold.test(item.title)
      ? text("خبر مرتبط مباشرة بالذهب", "Direct gold news")
      : text("عامل اقتصادي قد يؤثر في الذهب", "Potential gold market driver");
    category.style.color = "#f2c66d";

    const heading = document.createElement("h3");
    heading.textContent = item.title;
    heading.style.margin = "8px 0";

    const source = document.createElement("p");
    source.textContent = item.source || text("مصدر إخباري", "News source");

    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = text("قراءة الخبر من المصدر ↗", "Read original source ↗");
    link.style.color = "#f2c66d";

    card.append(category, heading, source, link);
    return card;
  }

  enable.addEventListener("click", async function () {
    if (!("Notification" in window)) {
      status.textContent = text(
        "هذا المتصفح لا يدعم إشعارات الويب.",
        "This browser does not support web notifications."
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      status.textContent = permission === "granted"
        ? text(
            "الإشعارات مفعّلة. أبقِ الموقع مفتوحًا لمراقبة الأخبار.",
            "Notifications enabled. Keep the page open to monitor news."
          )
        : text(
            "لم يُمنح إذن الإشعارات. تحقق من إعدادات المتصفح.",
            "Notification permission was not granted."
          );
    } catch (_) {
      status.textContent = text(
        "تعذر تفعيل الإشعارات.",
        "Could not enable notifications."
      );
    }
  });

  async function refresh() {
    if (busy) return;
    busy = true;

    try {
      const response = await fetch("./news.json?ts=" + Date.now(), {
        cache: "no-store"
      });

      if (!response.ok) throw new Error("News feed unavailable");

      const data = await response.json();
      const items = getItems(data).filter(item =>
        item && item.title && item.url
      );

      const relevant = items.filter(item =>
        directGold.test(item.title) ||
        goldDrivers.test(item.title)
      );

      const fresh = relevant.filter(item => !seen.has(itemKey(item)));

      list.replaceChildren();

      if (!relevant.length) {
        status.textContent = text(
          "لا توجد أخبار مرتبطة بالذهب أو العوامل المحددة في الموجز الحالي.",
          "No matching gold or market-driver headlines in the current feed."
        );
      } else {
        relevant.slice(0, 10).forEach(item => list.appendChild(makeLink(item)));

        status.textContent = text(
          "عدد الأخبار المرتبطة: ",
          "Relevant headlines: "
        ) + relevant.length;
      }

      // عند أول تحميل نسجل الأخبار الموجودة فقط؛ لا نرسل إشعارات قديمة.
      if (!initialized) {
        items.forEach(item => seen.add(itemKey(item)));
        initialized = true;
      } else {
        fresh.forEach(item => {
          if ("Notification" in window &&
              Notification.permission === "granted") {
            try {
              new Notification(
                text("AMMAR MARKET PULSE — تنبيه سوق", "AMMAR MARKET PULSE — Market Alert"),
                {
                  body: item.title,
                  tag: itemKey(item)
                }
              );
            } catch (_) {}
          }

          seen.add(itemKey(item));
        });
      }

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(Array.from(seen).slice(-300))
        );
      } catch (_) {}

    } catch (_) {
      status.textContent = text(
        "تعذر تحديث الأخبار الآن. حاول لاحقًا.",
        "Could not refresh the news feed. Try again later."
      );
    } finally {
      busy = false;
    }
  }

  refresh();
  window.setInterval(refresh, 5 * 60 * 1000);
})();
