# Recovery Tracker 💊❤️

A modern, responsive, and intuitive web application to track medication doses and interval compliance. Designed to run as a static site hosted on **GitHub Pages** with optional seamless **Google Sheets backend integration** (via Google Apps Script).

---

## 🌟 Key Features

1. **"As Needed" Medications (Interval-based)**:
   - Minimum interval constraints (e.g. at least 4 hours between doses).
   - **🛑 RED / Rose Card**: Displayed when a dose is taken within the minimum interval period. Shows live countdown to next eligible dose.
   - **🟢 GREEN / Emerald Card**: Displayed when the minimum interval has elapsed, indicating it is safe to take again.
   - Tracks exact ISO date-time timestamps for every dose instance.

2. **"Scheduled" Medications (Time of Day)**:
   - Schedule slots: **Morning**, **Afternoon**, **Evening**, **Night**.
   - Daily checklist view with progress badges.

3. **Core Medication Fields**:
   - Medication Name
   - Quantity Number (e.g. `1`, `2.5`, `500`)
   - Quantity Unit (`Tablet`, `Capsule`, `Teaspoon`, `mg`, `ml`, `Drop`, `Puff`, etc.)
   - Last Time Taken (Relative time + exact timestamp)
   - Notes & Special Instructions

4. **Information & Help Modal**:
   - Usage instructions and guide.
   - Version number (`v1.0.0`).
   - Feature changelog.

5. **History Log & Doctor Reports**:
   - Full timeline log of all dose instances.
   - Filter by date range (Today, Last 7 Days, Last 30 Days, All Time) or medication type.
   - Live search bar.
   - **Export CSV** button for data backup or spreadsheet analysis.
   - **Print Doctor Report** button formatted specifically for print/PDF output.

6. **Dual Data Engine (LocalStorage + Google Sheets)**:
   - Works offline immediately out-of-the-box using browser LocalStorage.
   - Built-in wizard for connecting a free Google Sheet as a persistent cloud database API.

---

## 🚀 How to Host on GitHub Pages

1. **Initialize Git Repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Recovery Tracker"
   ```
2. **Push to GitHub**:
   - Create a public or private repository on GitHub (e.g., `recovery-tracker`).
   - Push your code:
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/recovery-tracker.git
     git branch -M main
     git push -u origin main
     ```
3. **Enable GitHub Pages**:
   - Go to your GitHub repository **Settings** > **Pages**.
   - Under **Source**, select `Deploy from a branch`.
   - Select branch `main` and folder `/ (root)`.
   - Click **Save**. Your site will be live at `https://YOUR_USERNAME.github.io/recovery-tracker/` in seconds!

---

## 📊 How to Set Up Google Sheets as Database Backend

1. Open [Google Sheets](https://sheets.new) and create a blank sheet named **"Recovery Tracker DB"**.
2. Click **Extensions** > **Apps Script**.
3. Copy the entire code from [`google_apps_script.gs`](google_apps_script.gs) and paste it into `Code.gs` in the Apps Script editor.
4. Click **Save (Disk icon)**.
5. Click **Deploy** > **New deployment**.
6. Under "Select type", choose **Web app**.
7. Configure:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
8. Click **Deploy**, grant permissions, and copy the resulting **Web App URL**.
9. In Recovery Tracker, navigate to **Google Sheets Sync**, paste your Web App URL, and click **Save & Test Connection**.

---

## 💻 Tech Stack
- **HTML5 & Vanilla CSS3**: Tailwind-free glassmorphic design system, CSS HSL color tokens, dark mode support.
- **JavaScript (ES6+)**: SPA architecture, LocalStorage API, Fetch API, live interval timers.
- **Google Apps Script**: Lightweight Web App REST service returning JSON for Google Sheets.
