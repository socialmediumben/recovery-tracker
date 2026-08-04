# Recovery Tracker 💊❤️ (v2.0.0)

A comprehensive, modern web application to track medication doses, interval compliance, and **4 Medical Surgical Drains** across all your devices (laptop, phone, tablet). Designed to run as a static site hosted on **GitHub Pages** with **Google Sheets** as the single source of truth.

---

## 🌟 Major Version 2.0.0 Features

1. **🩸 Medical Drain Output Tracker (4 Drains)**:
   - **Track 4 Surgical Drains**: Record output volume in **ml/cc** for Drain 1, Drain 2, Drain 3, and Drain 4.
   - **Fluid Character Classification**: Log fluid appearance (*Serosanguinous*, *Serous*, *Sanguinous*, *Purulent*, *Other*).
   - **24-Hour Total Metrics**: Live dashboard displaying daily output total per drain and aggregate output total.
   - **Clinical History**: Dedicated Drain Output table with CSV export and printable clinical reports.

2. **🛡️ Pull-First Cloud Safety Guard (Phone Setup Protection)**:
   - **Zero-Overwrite Guarantee**: When connecting a new device (like a phone) for the first time, Recovery Tracker ALWAYS fetches data from Google Sheets first.
   - **Safety Guard**: Prevents empty local state on fresh devices from wiping Google Sheets.

3. **Multi-Device 2-Way Conflict-Free Sync**:
   - Merges dose logs and drain outputs across all your devices without overwriting.
   - Auto-syncs on tab focus & background polling every 30 seconds.

4. **"As Needed" & "Scheduled" Medications**:
   - **🛑 RED / Rose Card**: Active minimum interval cooldown with live countdown timer.
   - **🟢 GREEN / Emerald Card**: Interval elapsed, ready to take.
   - Daily checklist for **Morning**, **Afternoon**, **Evening**, **Night**.

5. **Light / Dark Mode Theme Switcher**:
   - Dynamic theme switch (`☀️ Light Mode` / `🌙 Dark Mode`).

---

## 🚀 How to Host on GitHub Pages

1. Push your repository to GitHub (`https://github.com/socialmediumben/recovery-tracker`).
2. Enable GitHub Pages under **Settings** > **Pages** > **Source**: `Deploy from a branch` (`main` branch, `/ (root)`).

---

## 📊 Setting Up Google Sheets Integration (v2.0.0 Script)

1. Open your Google Sheet.
2. Click **Extensions** > **Apps Script**.
3. Copy the full script from [`google_apps_script.gs`](google_apps_script.gs) (or from the **Google Sheets Sync** tab inside Recovery Tracker).
4. Click **Save (Disk icon)**.
5. Click **Deploy** > **New deployment** (or **Manage Deployments** > **Edit** > **New Version**).
6. Set **Execute as**: `Me` and **Who has access**: `Anyone`.
7. Click **Deploy**, click **Authorize Access**, copy the Web App URL, and paste it into **Recovery Tracker Settings**!
