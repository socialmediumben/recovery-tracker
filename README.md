# Recovery Tracker - Personal Medication & Medical Drain Companion

Recovery Tracker is a mobile-first Progressive Web Application (PWA) designed for post-operative recovery, medication adherence, push notification reminders, and medical drain output monitoring.

## 🌟 Version 2.5.0 Highlights

### 📈 Interactive Drain Output Line Chart (Chart.js)
* **Visual Drain Trends**: Interactive vector line graph rendering fluid output for all 4 surgical drains (Drain 1: Crimson, Drain 2: Amber, Drain 3: Blue, Drain 4: Purple).
* **Dual Analytics Modes**:
  1. **Cumulative Output Mode**: Tracks the total volume accumulated over time per drain. The line never decreases—it only moves upward or plateaus.
  2. **Grouped by Day Mode**: Groups and displays the total output recorded specifically on each calendar day for each drain.
* **Theme-Aware**: Automatically recalculates grid lines, tooltips, and font colors when switching between Light Mode and Dark Mode.

---

### 🔔 Web Push Notifications & "Remind Me" Dose Timers (v2.4.0)
* **Web Push Alerts**: Receive browser push notifications when medication interval cooldowns expire.
* **1-Tap Remind Me Button**: Toggle notifications on individual As-Needed medication cards during cooldown.

---

### 📱 Mobile-First Responsive Design (v2.2.0 & v2.3.0)
* **Fixed Mobile Bottom Navigation Bar**: Quick tab navigation on phones (`Meds`, `Drains`, `Schedule`, `Reports`, `Sync`).
* **Floating Action Button (+ FAB)**: 1-tap quick logging on mobile devices.
* **Scheduled Time Window Boundaries**: Morning (7 AM–12 PM), Afternoon (12 PM–4 PM), Evening (4 PM–8 PM), Night (8 PM–2 AM) with active glowing indicators.

---

### ☁️ Cloud Sync & Setup

1. Open a Google Sheet at [sheets.new](https://sheets.new).
2. Go to **Extensions** > **Apps Script**.
3. Copy the script from `google_apps_script.gs` into `Code.gs`.
4. Deploy as Web App (`Execute as: Me`, `Who has access: Anyone`).
5. Copy Web App URL into Recovery Tracker **Sync** settings.

## 🚀 Live Demo
Access the live web app at: [socialmediumben.github.io/recovery-tracker](https://socialmediumben.github.io/recovery-tracker/)
