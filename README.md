# ⚙️ Vegavruddhi Admin Panel (Core System & FSE Dashboard)

The primary administrative and system management platform for **Vegavruddhi Technologies**. This repository houses central Express.js backend services and the enterprise **FSE Operational Control Dashboard (`fse-dashboard`)**.

---

## 🎯 1. Purpose of the System
The **Main Admin Panel** is the ultimate administrative governance engine of the Vegavruddhi ecosystem. It controls user permissions, verification rules, salary slip generation, product configurations, point reward systems, meeting schedules, attendance tracking, and merchant form inspection across the entire company.

---

## 👥 2. Target Users & User Roles

| User Role | Target Audience | Primary Responsibilities | Access & Privileges |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Executive System Administrators | Global platform configuration, verification rule editing, salary slip generation, point system config | Master read/write access across all system modules |
| **Operations Admin** | Operations & Compliance Officers | Merchant form verification, attendance audit, employee registration approval | Read/write access for verification modules, employee approvals, and form builder |
| **HR / Payroll Admin** | HR & Finance Managers | Salary slip generation, attendance verification, meeting scheduling | Read/write access for attendance, salary slips, and meeting management |

---

## ✨ 3. Features & Functionalities

### 📊 Master Analytics Dashboard (`fse-dashboard/src/pages/Dashboard.js`)
- Real-time KPI summaries: Total Merchants Onboarded, Total FSEs Active, Total TLs Active, Pending Approvals, Total Points Issued.
- Interactive analytics charts showing daily onboarding volume, product-wise distribution, and territory breakdowns.

### 📋 Merchant Form Management Suite (`MerchantForms.js` - 250+ KB Module)
- Complete audit control over all incoming merchant applications across products.
- Multi-filter table supporting state, city, TL, FSE, date range, verification status, and merchant category filtering.
- Full document inspection viewer (PAN, Aadhaar, Bank Details, Shop Front, Geotagged QR photos).
- Batch verification, bulk approval, and bulk export to Excel (`.xlsx`).

### 👥 Employee Approval & Onboarding (`EmployeeApprovals.js`)
- Review new employee registration requests (FSEs and TLs).
- Verify uploaded ID proofs, bank details, and offer letter acknowledgments.
- Assign employee role, team leader mapping, base salary, and point tier.

### 👔 Team Leader Overview (`TLOverview.js`)
- Hierarchical tree view of all Team Leaders and their assigned FSE teams.
- Performance ranking matrix comparing team output, attendance percentages, and rejection rates.

### 👨‍💼 Manager Overview (`ManagerOverview.js`)
- Macro-level overview of regional managers, assigned territories, target quotas, and regional fulfillment rates.

### 📍 Attendance Management (`AttendanceManagement.js`)
- Centralized attendance log for all FSEs and TLs across regions.
- View punch-in/punch-out times, GPS location maps, self-captured selfies, and working hours calculation.
- Manual attendance correction and leave approval workflows.

### 📦 Product & Form Configurator (`ProductDashboard.js` & `FormBuilder.js`)
- Dynamic Form Builder to create custom onboarding forms for new financial products (e.g. Tide BT, Mobikwik, Bank Accounts).
- Product Dashboard to configure product payouts, commission structures, and verification workflows.

### ⚙️ Points Configuration & Verification Rules (`PointsConfiguration.js` & `VerificationRules.js`)
- Set up reward point algorithms for FSE incentives based on form approvals.
- Define custom automated verification rules (e.g., minimum document count, valid PAN regex, required geotag radius).

### 📑 Salary Slip Engine (`SalarySlips.js`)
- Automated monthly salary slip generation based on attendance, approved merchant points, and incentive slabs.
- Generate and download PDF salary slips for employees.

---

## 📄 4. Section & Module Directory Breakdown

```
vegavruddhi-admin-panel/
├── backend/                  # Central Express.js API Server
│   ├── models/               # MongoDB Mongoose Models (Employees, Forms, Attendance, Points)
│   ├── routes/               # REST API Endpoints (/admin, /merchant, /attendance, /salary)
│   └── server.js             # API Gateway Server Entry Point
└── fse-dashboard/            # React Operations Application
    └── src/pages/
        ├── Dashboard.js            # Main Analytics & KPI Overview
        ├── MerchantForms.js        # Master Merchant Audit & Export Suite
        ├── EmployeeApprovals.js    # Employee Onboarding & Verification
        ├── TLOverview.js           # Team Leader Management & Performance
        ├── ManagerOverview.js      # Manager Territory Oversight
        ├── AttendanceManagement.js # GPS Attendance Audit & Approvals
        ├── ProductDashboard.js     # Product Suite Configuration
        ├── FormBuilder.js          # Dynamic Form Builder Engine
        ├── PointsConfiguration.js  # Incentive & Reward Points Rules
        ├── VerificationRules.js    # Automated Compliance Rule Config
        ├── SalarySlips.js          # Automated Payroll & Payslip Engine
        └── Meetings.js             # Team Meeting Scheduler & Notices
```

---

## 🔄 5. Complete End-to-End Workflow

```
[ Field Form / Attendance ] ──► [ TL Audit ] ──► [ MAIN ADMIN PANEL ]
                                                        │
         ┌──────────────────────────────────────────────┼──────────────────────────────────────────────┐
         ▼                                              ▼                                              ▼
[ Master Verification Queue ]                  [ Attendance & GPS Audit ]                     [ Monthly Payroll Engine ]
         │                                              │                                              │
         ▼                                              ▼                                              ▼
[ Approve / Reject Merchant ]                  [ Approve Shift Hours ]                        [ Generate Salary Slips ]
         │                                              │                                              │
         ▼                                              ▼                                              ▼
[ Calculate Reward Points ]                   [ Update Employee Standing ]                    [ Export Excel Reports ]
```

1. **System Configuration**: Admin sets up product parameters, form fields (`FormBuilder.js`), and incentive rules (`PointsConfiguration.js`).
2. **User Onboarding**: Admin approves new employee requests (`EmployeeApprovals.js`) and assigns them to Team Leaders.
3. **Daily Operations**: Admin monitors incoming merchant forms (`MerchantForms.js`) and verifies GPS attendance logs (`AttendanceManagement.js`).
4. **Payroll & Export**: At month-end, Admin generates salary slips (`SalarySlips.js`) and exports master reports for finance and audit compliance.

---

## ⚡ 6. Key Actions & Operations

- **Approve / Reject Employee Registrations**: Activate FSE and TL accounts upon verifying credentials.
- **Master Merchant Form Verification**: Final verification and batch processing of merchant applications.
- **Dynamic Form Creation**: Build custom merchant onboarding forms for new financial products without writing code.
- **Attendance & GPS Audit**: Inspect field location maps, selfie verification, and shift duration.
- **Payroll Slip Generation**: Calculate points, bonuses, base salary, and generate PDF payslips.
- **Excel Master Export**: Export filtered data tables across merchants, attendance, and payroll.

---

## 🔗 7. Cross-Panel Connections & Integrations

- ⬇️ **All Sub-Panels (`Vegavruddhi-admin-tideBT`, `Vegavruddhi-Tl-tideBT`, `Vegavruddhi-employee-tideBT`, `Manager_Panel`)**: Connects to the central Express backend in this repository for master database storage and verification rule enforcement.

---

## 🛠️ 8. Tech Stack & Environment Setup

### Backend Architecture
- **Runtime**: Node.js, Express 4
- **Database**: MongoDB with Mongoose 7
- **Auth & Tokens**: JWT (`jsonwebtoken`), bcrypt password hashing

### Frontend Architecture (`fse-dashboard`)
- **Framework**: React 18, `@mui/material`, `@emotion/react`, Recharts, SheetJS (`xlsx`)

### Startup Instructions
```bash
# 1. Start Backend API
cd c:\VegaProject\vegavruddhi-admin-panel\backend
npm install
npm start

# 2. Start FSE Dashboard Frontend
cd c:\VegaProject\vegavruddhi-admin-panel\fse-dashboard
npm install
npm start
```

---

## 📄 License
Internal Proprietary Software – Vegavruddhi Technologies. All Rights Reserved.
