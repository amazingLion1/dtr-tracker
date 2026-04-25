# 📋 DTR Tracker — KCP Intern

> **Daily Time Record & Weekly Journal System for King's College of the Philippines OJT Interns**

A modern, mobile-friendly Progressive Web App (PWA) that helps KCP interns log their daily attendance (AM/PM time-in/out), write weekly journal entries with photo documentation, and generate print-ready official forms. Now with **Supabase Cloud Sync** and **Supervisor Oversight**.

---

## 🌟 Key Features

- **🚀 Cloud Sync**: Powered by **Supabase**. Data is securely synced to the cloud while maintaining a robust **offline-first** `localStorage` cache.
- **👮 Supervisor Mode**: A hidden "Super Admin" role with passcode protection (`1234`) allows supervisors to oversee and edit all intern records.
- **✍️ Digital Signatures**: Physically draw your signature on the screen before printing your DTR or Journal.
- **📅 Visual Heatmap**: Toggle between a standard table and a GitHub-style calendar heatmap to visualize your work hours.
- **📱 Mobile Optimized**: Handheld-first design with a fixed bottom navigation bar and **swipe gestures** for month navigation.
- **🖨️ Print-Ready Forms**: Generate pixel-perfect replicas of the official KCP DTR and Weekly Journal forms with letterheads.
- **💾 Easy Backups**: Export your entire profile data to JSON or CSV any time.
- **🔔 Smart Reminders**: Opt-in browser notifications to remind you to clock in and out.
- **🔄 Refresh Process**: Students can self-reset their DTR/Journal process for any month if errors are found, with automatic versioning.
- **📁 Document Archive**: A secure storage page that keeps snapshots of all previously submitted or refreshed documents.
- **🛡️ SuperAdmin Role**: Dedicated role for centralized account management (creating Admin/Supervisor and Student accounts).

---

## 💎 Premium Upgrade (Latest Features)

The system has been upgraded to a **Premium Tier** with the following enhancements:

- **📊 Advanced Data Viz**: `recharts` integration on the Dashboard showing daily productivity trends and OJT hours progression.
- **⚡ Bulk Operations**: Supervisors can now approve multiple DTR/Journal requests simultaneously from the Request Inbox.
- **🛡️ Enhanced Security**: SuperAdmins can now remotely reset user passwords via the new Control Panel.
- **👁️ Live Draft Preview**: Real-time visualization of your DTR/Journal draft in a "Final Form" sidebar while you type.
- **📁 Vault Comparison**: Side-by-side comparison of archived snapshots vs live production data in the Archive page.
- **✨ High-Fidelity UI**: Fully refactored interface using `framer-motion` for micro-animations, glassmorphism components, and curated HSL color palettes.
- **🚀 Skeleton Loading**: Replaced generic pulse animations with content-aware skeleton loaders for a smoother experience.

---

## 🏗️ Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **NPM** or **Yarn**
- A **Supabase** account and project

### 2. Installation
```bash
git clone https://github.com/your-username/dtr-tracker.git
cd dtr-tracker
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Database Setup
Execute the following SQL in your Supabase SQL Editor to initialize the 3 required tables:

```sql
-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT DEFAULT 'intern', -- 'intern' or 'supervisor'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DTR Entries Table
CREATE TABLE dtr_entries (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_in_am TEXT,
  time_out_am TEXT,
  time_in_pm TEXT,
  time_out_pm TEXT,
  status_tag TEXT, -- 'Leave', 'Holiday', etc.
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, date)
);

-- 3. Journal Entries Table
CREATE TABLE journal_entries (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  week_num INTEGER NOT NULL,
  task TEXT,
  doc_note TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, year, month, week_num)
);
```

### 5. Launch
```bash
npm run dev
```

---

## 🔑 Access Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **SuperAdmin** | `superadmin@kcp.edu.ph` | `SuperAdmin@1234` |
| **Supervisor** | `admin@kcp.edu.ph` | `Admin@1234` |
| **Student** | `student@kcp.edu.ph` | `Student@1234` |

---

## 🧩 Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion
- **State Management**: Zustand
- **Database**: Supabase (Postgres)
- **Visuals**: Recharts, Lucide React
- **PWA**: vite-plugin-pwa

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Created with ❤️ for King's College of the Philippines.*
