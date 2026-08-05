# Recovery Tracker 💊❤️ (v2.3.1)

A comprehensive, modern web application to track medication doses, interval compliance, and **4 Medical Surgical Drains** across all your devices (laptop, phone, tablet). Designed to run as a static site hosted on **GitHub Pages** with **Google Sheets** as the single source of truth.

---

## 🌟 Key Features & Cold-Start Fixes (v2.3.1)

1. **⚡ Google Apps Script Cold-Start Resilience (v2.3.1)**:
   - Expanded JSONP fetch timeout to 25 seconds to accommodate Google Apps Script server spin-up when idle.
   - Replaced immediate callback deletion with a safe no-op callback wrapper, completely preventing `Uncaught ReferenceError: rt_jsonp_cb is not defined` console errors.
   - Added SVG favicon and updated PWA mobile web app manifest tags.

2. **🕒 Scheduled Medication Dose Windows**:
   - **Morning**: 7:00 AM – 12:00 PM
   - **Afternoon**: 12:00 PM – 4:00 PM
   - **Evening**: 4:00 PM – 8:00 PM
   - **Night**: 8:00 PM – 2:00 AM
   - **Active Window Indicator**: Highlights the current active time slot card (`NOW ACTIVE`).

3. **📱 Mobile-First UX & Ergonomics**:
   - **Fixed Bottom Tab Navigation Bar**: Native app tab bar on mobile screens (`Meds`, `Drains`, `Schedule`, `Reports`, `Sync`).
   - **Mobile Speed Dial FAB Button**: Floating Action Button (+ FAB) for 1-tap dose or drain output logging.
   - **Mobile Bottom Sheets**: Modals transform into bottom sheets with touch targets (min 44px) and 16px inputs to prevent mobile browser zoom.

4. **🩸 Medical Drain Output Tracker (4 Drains)**:
   - **Track 4 Surgical Drains**: Record output volume in **ml/cc** for Drain 1, Drain 2, Drain 3, and Drain 4.
   - **Fluid Character Classification**: Log fluid appearance (*Serosanguinous*, *Serous*, *Sanguinous*, *Purulent*, *Other*).
   - **Accurate Local 24-Hour "ml today" Totals**: Calculated using local timezone calendar matcher (`isTodayLocal()`).

5. **🛡️ Pull-First Cloud Safety Guard (Phone Setup Protection)**:
   - **Zero-Overwrite Guarantee**: When connecting a new device (like a phone) for the first time, Recovery Tracker ALWAYS fetches data from Google Sheets first.

6. **Multi-Device 2-Way Conflict-Free Sync**:
   - Merges dose logs and drain outputs across all your devices without overwriting.
   - Auto-syncs on tab focus & background polling every 30 seconds.

---

## 🚀 How to Host on GitHub Pages

1. Push your repository to GitHub (`https://github.com/socialmediumben/recovery-tracker`).
2. Enable GitHub Pages under **Settings** > **Pages** > **Source**: `Deploy from a branch` (`main` branch, `/ (root)`).

---

## 📊 Setting Up Google Sheets Integration

1. Open your Google Sheet.
2. Click **Extensions** > **Apps Script**.
3. Copy the full script from [`google_apps_script.gs`](google_apps_script.gs) (or from the **Google Sheets Sync** tab inside Recovery Tracker).
4. Click **Save (Disk icon)**.
5. Click **Deploy** > **New deployment** (or **Manage Deployments** > **Edit** > **New Version**).
6. Set **Execute as**: `Me` and **Who has access**: `Anyone`.
7. Click **Deploy**, click **Authorize Access**, copy the Web App URL, and paste it into **Recovery Tracker Settings**!
