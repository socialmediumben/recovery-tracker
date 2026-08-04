# Recovery Tracker 💊❤️ (v1.1.6)

A modern, responsive, and intuitive web application to track medication doses and interval compliance. Designed to run as a static site hosted on **GitHub Pages** with optional seamless **Google Sheets backend integration** (via Google Apps Script).

---

## 🌟 Key Features (v1.1.6)

1. **"As Needed" Medications (Interval-based)**:
   - Minimum interval constraints (e.g. at least 4 hours between doses).
   - **🛑 RED / Rose Card**: Displayed when a dose is taken within the minimum interval period. Shows live countdown to next eligible dose.
   - **🟢 GREEN / Emerald Card**: Displayed when the minimum interval has elapsed, indicating it is safe to take again.
   - Tracks exact ISO date-time timestamps for every dose instance.

2. **"Scheduled" Medications (Time of Day)**:
   - Schedule slots: **Morning**, **Afternoon**, **Evening**, **Night**.
   - Daily checklist view with progress badges.

3. **Light / Dark Mode Theme Switcher**:
   - Built-in theme toggle switch in the header (`☀️ Light Mode` / `🌙 Dark Mode`).
   - Theme choice is saved automatically in your browser.

4. **Blank Initial State**:
   - Opens clean & blank by default without placeholder test data.

5. **JSONP Sync Engine (CORS-Free Google Sheets Backend)**:
   - Uses JSONP dynamic script injection to read and write to Google Sheets smoothly without CORS blocks.

6. **Information & Help Modal**:
   - Usage guide, version tracking (`v1.1.6`), and full release changelog.

7. **History Log & Doctor Reports**:
   - Full timeline log of all dose instances.
   - Date range & search filters.
   - **Export CSV** and **Print Doctor Report** buttons.

---

## 🚀 How to Host on GitHub Pages

1. Push your repository to GitHub (`https://github.com/socialmediumben/recovery-tracker`).
2. Enable GitHub Pages under **Settings** > **Pages** > **Source**: `Deploy from a branch` (`main` branch, `/ (root)`).

---

## 📊 Setting Up Google Sheets Integration

1. Create a blank Google Sheet named **"Recovery Tracker DB"** (or open an existing sheet).
2. Click **Extensions** > **Apps Script**.
3. Copy the full script from [`google_apps_script.gs`](google_apps_script.gs) (or from the **Google Sheets Sync** tab inside Recovery Tracker).
4. Click **Save (Disk icon)**.
5. Click **Deploy** > **New deployment**.
6. Set **Execute as**: `Me` and **Who has access**: `Anyone`.
7. Click **Deploy**, click **Authorize Access**, copy the Web App URL, and paste it into **Recovery Tracker Settings**.
