
/* AMMAR MARKET PULSE — WEEKLY CALENDAR & ALERTS V1 */
(() => {
  "use strict";

  const ID = "ammarWeeklyCalendar";
  if (document.getElementById(ID)) return;

  const ZONE = "Asia/Beirut";
  const API = "https://www.financecalendar.com/wp-json/fc/v1/calendar";
  const $ = (tag, cls, content) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (content !== undefined) el.textContent = content;
    return el;
  };

  const en = () => document.documentElement.lang === "en";
  const tr = (ar, english) => en() ? english : ar;
  const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const dateKey = d => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(d);
    const v = {};
    parts.forEach(p => v[p.type] = p.value);
    return `${v.year}-${v.month}-${v.day}`;
  };
  const dateText = d => new Intl.DateTimeFormat(en() ? "en-GB" : "ar-LB", {
    timeZone: ZONE, weekday: "long", day: "numeric", month: "long"
  }).format(d);
  const timeText = d => new Intl.DateTimeFormat(en() ? "en-GB" : "ar-LB", {
    timeZone: ZONE, hour: "2-digit", minute: "2-digit", hour12: false
  }).format(d);
  const escapeText = v => String(v ?? "").trim();

  const root = $("section");
  root.id = ID;
  root.dir = en() ? "ltr" : "rtl";
  root.style.cssText =
    "margin:22px 0;padding:16px;border:1px solid #20354b;" +
    "border-radius:16px;background:#0d1b2b;color:#eef4fb;font-family:inherit";

  const heading = $("h2", "", tr("الأجندة الاقتصادية والتنبيهات", "Economic Calendar & Alerts"));
  const intro = $("p", "", tr(
    "المواعيد بتوقيت بيروت. فعّل التنبيهات وأبقِ الصفحة مفتوحة لتلقي الإشعارات.",
    "Times are in Beirut time. Enable alerts and keep this page open to receive notifications."
  ));
  intro.style.cssText = "color:#9fb1c5;font-size:13px;line-height:1.8";

  const tabs = $("div");
  tabs.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin:14px 0";
  const content = $("div");
  const status = $("p");
  status.setAttribute("aria-live", "polite");
  status.style.color = "#9fb1c5";

  const controls = $("div");
  controls.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin:12px 0";

  const buttonStyle =
    "padding:9px 12px;border:1px solid #30465c;border-radius:9px;" +
    "background:#112338;color:#eef4fb;font:inherit;cursor:pointer";

  function button(label) {
    const b = $("button", "", label);
    b.type = "button";
    b.style.cssText = buttonStyle;
    return b;
  }

  const enableBtn = button(tr("تفعيل التنبيهات 🔔", "Enable alerts 🔔"));
  const soundBtn = button(tr("الصوت: متوقف", "Sound: Off"));
  const leadSelect = $("select");
  leadSelect.style.cssText = buttonStyle;
  [[30, "30"], [15, "15"], [5, "5"]].forEach(([v, label]) => {
    const opt = $("option", "", tr(`${label} دقيقة قبل الخبر`, `${label} min before event`));
    opt.value = String(v);
    leadSelect.appendChild(opt);
  });
  controls.append(enableBtn, soundBtn, leadSelect);

  root.append(heading, intro, controls, tabs, status, content);

  const oldCalendar = document.getElementById("friday-calendar");
  if (oldCalendar && oldCalendar.parentNode) {
    oldCalendar.parentNode.insertBefore(root, oldCalendar);
  } else {
    const main = document.querySelector("main");
    (main || document.body).appendChild(root);
  }

  let allEvents = [];
  let activeTab = "today";
  let alertsEnabled = false;
  let soundEnabled = false;
  let audioContext = null;
  let fired = new Set();

  try {
    const saved = JSON.parse(localStorage.getItem("ampWeeklyAlertFired") || "[]");
    if (Array.isArray(saved)) fired = new Set(saved);
    alertsEnabled = localStorage.getItem("ampWeeklyAlertsEnabled") === "yes";
    soundEnabled = localStorage.getItem("ampWeeklySoundEnabled") === "yes";
  } catch (_) {}

  function impactOf(e) {
    const value = String(e.impact || e.importance || e.volatility || "").toLowerCase();
    if (/high|3|مرتفع|عالي/.test(value)) return "high";
    if (/medium|moderate|2|متوسط/.test(value)) return "medium";
    if (/low|1|منخفض/.test(value)) return "low";
    return "unknown";
  }

  function impactLabel(value) {
    return value === "high" ? tr("مرتفعة", "High") :
      value === "medium" ? tr("متوسطة", "Medium") :
      value === "low" ? tr("منخفضة", "Low") :
      tr("غير محددة", "Unspecified");
  }

  function eventDate(e) {
    const raw = e.release_at_utc || e.time_utc || e.datetime_utc ||
      e.date_utc || e.date || e.datetime || null;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function valueOf(e, names) {
    for (const name of names) {
      if (e[name] !== undefined && e[name] !== null && e[name] !== "") {
        return String(e[name]);
      }
    }
    return "—";
  }

  function goldRelated(e) {
    return /gold|xauusd|bullion|precious metal|federal reserve|fomc|interest rate|inflation|cpi|pce|payroll|unemployment|dollar|treasury yield|الذهب|الفيدرالي|الفائدة|التضخم|الدولار|الوظائف/i
      .test(`${e.title || e.name || ""} ${e.country || ""} ${e.currency || ""}`);
  }

  function periodEvents() {
    const now = new Date();
    const today = dateKey(now);
    const tomorrow = dateKey(addDays(now, 1));
    const weekday = (Number(new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE, weekday: "numeric"
}).format(now)) || now.getDay());
    // Use Beirut calendar dates for the displayed date range.
    const beirutParts = new Intl.DateTimeFormat("en-US", {
      timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(now);
    const p = {};
    beirutParts.forEach(x => p[x.type] = x.value);
    const localToday = new Date(Number(p.year), Number(p.month) - 1, Number(p.day));
    const mondayOffset = (localToday.getDay() + 6) % 7;
    const monday = addDays(localToday, -mondayOffset);
    const nextMonday = addDays(monday, 7);

    return allEvents.filter(e => {
      if (!e.date) return false;
      const key = dateKey(e.date);
      if (activeTab === "today") return key === today;
      if (activeTab === "tomorrow") return key === tomorrow;
      if (activeTab === "week") return key >= dateKey(monday) && key < dateKey(nextMonday);
      if (activeTab === "nextweek") {
        return key >= dateKey(nextMonday) && key < dateKey(addDays(nextMonday, 7));
      }
      return true;
    });
  }

  function render() {
    root.dir = en() ? "ltr" : "rtl";
    heading.textContent = tr("الأجندة الاقتصادية والتنبيهات", "Economic Calendar & Alerts");
    intro.textContent = tr(
      "المواعيد بتوقيت بيروت. فعّل التنبيهات وأبقِ الصفحة مفتوحة لتلقي الإشعارات.",
      "Times are in Beirut time. Enable alerts and keep this page open to receive notifications."
    );
    enableBtn.textContent = alertsEnabled
      ? tr("التنبيهات مفعّلة ✓", "Alerts enabled ✓")
      : tr("تفعيل التنبيهات 🔔", "Enable alerts 🔔");
    soundBtn.textContent = soundEnabled
      ? tr("الصوت: يعمل", "Sound: On")
      : tr("الصوت: متوقف", "Sound: Off");

    const choices = [
      ["today", "اليوم", "Today"],
      ["tomorrow", "غدًا", "Tomorrow"],
      ["week", "هذا الأسبوع", "This week"],
      ["nextweek", "الأسبوع القادم", "Next week"]
    ];
    tabs.replaceChildren();
    choices.forEach(([key, ar, english]) => {
      const b = button(tr(ar, english));
      if (activeTab === key) {
        b.style.background = "#f2c66d";
        b.style.color = "#07111e";
      }
      b.addEventListener("click", () => {
        activeTab = key;
        render();
      });
      tabs.appendChild(b);
    });

    content.replaceChildren();
    const rows = periodEvents();

    if (!rows.length) {
      content.appendChild($("p", "", tr(
        "لا توجد أحداث متاحة من المصدر لهذه الفترة، أو لم تُحمّل البيانات بعد.",
        "No events are available from the source for this period, or the data has not loaded."
      )));
      return;
    }

    let previousDay = "";
    rows.forEach(e => {
      const key = dateKey(e.date);
      if (key !== previousDay) {
        const day = $("h3", "", dateText(e.date));
        day.style.cssText = "margin:20px 0 10px;color:#f2c66d;font-size:16px";
        content.appendChild(day);
        previousDay = key;
      }

      const card = $("article");
      card.style.cssText =
        "margin:8px 0;padding:12px;border:1px solid #20354b;border-radius:12px;background:#0a1725";

      const top = $("div");
      top.style.cssText = "display:flex;justify-content:space-between;gap:12px;align-items:start";
      const name = $("strong", "", e.title);
      name.style.cssText = "line-height:1.7";
      const time = $("strong", "", timeText(e.date));
      time.style.cssText = "white-space:nowrap;color:#f2c66d";
      top.append(name, time);

      const meta = $("p", "", `${e.country || "—"} · ${e.currency || "—"} · ${impactLabel(e.impact)}`);
      meta.style.cssText = "color:#9fb1c5;font-size:12px";

      const values = $("div");
      values.style.cssText = "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:10px";
      [
        [tr("السابق", "Previous"), e.previous],
        [tr("المتوقع", "Forecast"), e.forecast],
        [tr("الفعلي", "Actual"), e.actual]
      ].forEach(([label, value]) => {
        const box = $("div");
        box.style.cssText = "padding:8px;background:#112338;border-radius:8px;min-width:0";
        const small = $("div", "", label);
        small.style.cssText = "color:#9fb1c5;font-size:11px";
        const val = $("div", "", value || "—");
        val.style.cssText = "font-weight:600;overflow-wrap:anywhere;margin-top:4px";
        box.append(small, val);
        values.appendChild(box);
      });

      if (e.url) {
        const link = $("a", "", tr("المصدر ↗", "Source ↗"));
        link.href = e.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.cssText = "display:inline-block;margin-top:10px;color:#f2c66d";
        card.append(top, meta, values, link);
      } else {
        card.append(top, meta, values);
      }

      if (goldRelated(e)) {
        const gold = $("p", "", tr(
          "🟡 قد يكون لهذا الحدث تأثير في الذهب؛ ليس توصية تداول.",
          "🟡 This event may affect gold; this is not a trade recommendation."
        ));
        gold.style.cssText = "color:#f2c66d;font-size:12px";
        card.appendChild(gold);
      }

      content.appendChild(card);
    });
  }

  async function load() {
    status.textContent = tr("جارٍ تحميل الأجندة...", "Loading calendar...");
    const start = dateKey(new Date());
    const end = dateKey(addDays(new Date(), 14));

    try {
      const response = await fetch(
        `${API}?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}&limit=500`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Calendar source unavailable");
      const payload = await response.json();
      const raw = Array.isArray(payload) ? payload :
        Array.isArray(payload.events) ? payload.events :
        Array.isArray(payload.data) ? payload.data : [];

      allEvents = raw
        .filter(e => e && String(e.status || "").toLowerCase() !== "cancelled")
        .map(e => {
          const d = eventDate(e);
          return {
            title: escapeText(e.title || e.name || tr("حدث اقتصادي", "Economic event")),
            country: escapeText(e.country || e.country_name || ""),
            currency: escapeText(e.currency || e.currency_code || ""),
            impact: impactOf(e),
            date: d,
            previous: valueOf(e, ["previous", "previous_value", "previousValue"]),
            forecast: valueOf(e, ["forecast", "forecast_value", "consensus", "expected"]),
            actual: valueOf(e, ["actual", "actual_value", "actualValue"]),
            url: escapeText(e.source_url || e.url || ""),
            id: escapeText(e.id || e.event_id || e.url || e.title || e.name || "")
          };
        })
        .filter(e => e.date)
        .sort((a, b) => a.date - b.date);

      status.textContent = tr("آخر تحديث: ", "Last updated: ") +
        new Intl.DateTimeFormat(en() ? "en-GB" : "ar-LB", {
          timeZone: ZONE, hour: "2-digit", minute: "2-digit"
        }).format(new Date()) +
        tr(" بتوقيت بيروت", " Beirut time");

      render();
      checkAlerts();
    } catch (_) {
      status.textContent = tr(
        "تعذر الاتصال بمصدر الأجندة. لم نعرض مواعيد أو قيمًا غير مؤكدة.",
        "Could not connect to the calendar source. No unverified dates or values were shown."
      );
      content.replaceChildren();
    }
  }

  function playSound() {
    if (!soundEnabled || !audioContext) return;
    try {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.35);
    } catch (_) {}
  }

  function checkAlerts() {
    if (!alertsEnabled) return;
    const now = Date.now();
    const lead = Number(leadSelect.value || 15);
    allEvents.forEach(e => {
      if (!e.date || e.date.getTime() < now) return;
      if (e.impact !== "high") return;
      const diff = e.date.getTime() - now;
      if (diff > lead * 60000 || diff <= (lead - 1) * 60000) return;

      const key = `${e.id}|${lead}|${dateKey(e.date)}`;
      if (fired.has(key)) return;
      fired.add(key);
      try {
        localStorage.setItem("ampWeeklyAlertFired", JSON.stringify(Array.from(fired).slice(-300)));
      } catch (_) {}

      const message = `${e.title} — ${timeText(e.date)} ${tr("بتوقيت بيروت", "Beirut time")}`;
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(tr("تنبيه اقتصادي مهم", "Important economic event"), { body: message, tag: key });
        } catch (_) {}
      }
      playSound();
    });
  }

  enableBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      status.textContent = tr(
        "المتصفح لا يدعم إشعارات الويب.",
        "This browser does not support web notifications."
      );
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        alertsEnabled = true;
        try { localStorage.setItem("ampWeeklyAlertsEnabled", "yes"); } catch (_) {}
        status.textContent = tr(
          "تم تفعيل التنبيهات للأحداث مرتفعة الأهمية. أبقِ الصفحة مفتوحة.",
          "Alerts enabled for high-impact events. Keep the page open."
        );
      } else {
        status.textContent = tr(
          "لم يُمنح إذن الإشعارات من المتصفح.",
          "Browser notification permission was not granted."
        );
      }
      render();
    } catch (_) {}
  });

  soundBtn.addEventListener("click", async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error("Audio unavailable");
      audioContext = audioContext || new AudioCtx();
      if (audioContext.state === "suspended") await audioContext.resume();
      soundEnabled = !soundEnabled;
      localStorage.setItem("ampWeeklySoundEnabled", soundEnabled ? "yes" : "no");
      if (soundEnabled) playSound();
      render();
    } catch (_) {
      status.textContent = tr("تعذر تشغيل الصوت في هذا المتصفح.", "Sound is unavailable in this browser.");
    }
  });

  leadSelect.addEventListener("change", () => {
    status.textContent = tr(
      "تم تغيير وقت التنبيه. ستُراقب الأحداث القادمة أثناء فتح الصفحة.",
      "Alert lead time updated. Upcoming events will be monitored while the page is open."
    );
  });

  render();
  load();
  window.setInterval(load, 5 * 60 * 1000);
  window.setInterval(checkAlerts, 30 * 1000);

  window.addEventListener("languagechange", render);
})();
