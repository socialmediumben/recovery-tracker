# Recovery Tracker 💊❤️ (v2.2.0)

A comprehensive, modern web application to track medication doses, interval compliance, and **4 Medical Surgical Drains** across all your devices (laptop, phone, tablet). Designed to run as a static site hosted on **GitHub Pages** with **Google Sheets** as the single source of truth.

---

## 🌟 Key Features (v2.2.0)

1. **📱 Mobile-First UX & Ergonomics (v2.2.0)**:
   - **Fixed Bottom Tab Navigation Bar**: Native app tab bar on mobile screens (`Meds`, `Drains`, `Schedule`, `Reports`, `Sync`) with notch safe-area insets.
   - **Mobile Speed Dial FAB Button**: Floating Action Button (+ FAB) in the bottom right corner for 1-tap logging of medication doses or drain outputs from anywhere.
   - **Mobile Bottom Sheets**: Modals transform into bottom sheets with touch targets (min 44px) and 16px inputs to prevent mobile browser auto-zoom.

2. **🩸 Medical Drain Output Tracker (4 Drains)**:
   - **Track 4 Surgical Drains**: Record output volume in **ml/cc** for Drain 1, Drain 2, Drain 3, and Drain 4.
   - **Fluid Character Classification**: Log fluid appearance (*Serosanguinous*, *Serous*, *Sanguinous*, *Purulent*, *Other*).
   - **Accurate Local 24-Hour "ml today" Totals**: Calculated using local timezone calendar matcher (`isTodayLocal()`).

3. **🛡️ Pull-First Cloud Safety Guard (Phone Setup Protection)**:
   - **Zero-Overwrite Guarantee**: When connecting a new device (like a phone) for the first time, Recovery Tracker ALWAYS fetches data from Google Sheets first.

4. **Multi-Device 2-Way Conflict-Free Sync**:
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
