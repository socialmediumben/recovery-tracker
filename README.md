# Recovery Tracker 💊❤️ (v1.2.0)

A modern, responsive, and intuitive web application to track medication doses and interval compliance across all your devices (laptop, phone, tablet). Designed to run as a static site hosted on **GitHub Pages** with **Google Sheets** as the single source of truth.

---

## 🌟 Key Features (v1.2.0)

1. **Multi-Device 2-Way Smart Merge Sync**:
   - **No Data Loss / No Overwriting**: Uses a 2-way conflict-free smart merge algorithm. Dose logs created on your phone and laptop combine seamlessly.
   - **Auto-Sync on Tab Focus**: Whenever you switch to the app on your phone or laptop (`visibilitychange` / `window.onfocus`), the app automatically fetches and merges the latest doses from Google Sheets.
   - **Background Auto-Sync**: Automatically polls every 30 seconds while the app tab is open.

2. **"As Needed" Medications (Interval-based)**:
   - Minimum interval constraints (e.g. at least 4 hours between doses).
   - **🛑 RED / Rose Card**: Cooldown active with live countdown timer to next eligible dose.
   - **🟢 GREEN / Emerald Card**: Minimum interval elapsed, safe to take.

3. **"Scheduled" Medications (Time of Day)**:
   - Slots: **Morning**, **Afternoon**, **Evening**, **Night**.

4. **Light / Dark Mode Theme Switcher**:
   - Built-in theme toggle switch (`☀️ Light Mode` / `🌙 Dark Mode`).

5. **History Log & Doctor Reports**:
   - Date range & search filters, **Export CSV**, and **Print Doctor Report**.

---

## 🚀 How to Host on GitHub Pages

1. Push your repository to GitHub (`https://github.com/socialmediumben/recovery-tracker`).
2. Enable GitHub Pages under **Settings** > **Pages** > **Source**: `Deploy from a branch` (`main` branch, `/ (root)`).

---

## 📊 Setting Up Google Sheets Integration

1. Create a Google Sheet named **"Recovery Tracker DB"**.
2. Click **Extensions** > **Apps Script**.
3. Copy the full script from [`google_apps_script.gs`](google_apps_script.gs) (or from the **Google Sheets Sync** tab inside Recovery Tracker).
4. Click **Save (Disk icon)**.
5. Click **Deploy** > **New deployment**.
6. Set **Execute as**: `Me` and **Who has access**: `Anyone`.
7. Click **Deploy**, click **Authorize Access**, copy the Web App URL, and paste it into **Recovery Tracker Settings** on both your phone and laptop!
