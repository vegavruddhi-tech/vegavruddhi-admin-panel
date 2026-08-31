# 🖥️ Vegavruddhi FSE Operations Dashboard

The central React frontend application inside `vegavruddhi-admin-panel` providing full operational management for FSEs, Team Leaders, Managers, Merchant Forms, Attendance, Salary Slips, and System Rules.

---

## 🎯 Purpose & Scope
This dashboard is the visual control tower for administrators. It combines 13 comprehensive feature pages into a single, high-performance web dashboard built with React 18 and Material-UI.

---

## 📄 Page Directory Breakdown

| Page File | Feature Area | Description & Functionality |
| :--- | :--- | :--- |
| [`src/pages/Dashboard.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/Dashboard.js) | Main Control Center | Executive KPI statistics, submission velocity, product distribution charts. |
| [`src/pages/MerchantForms.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/MerchantForms.js) | Merchant Audit Suite | Master table with multi-filtering, document image modal, batch approval, & Excel export. |
| [`src/pages/EmployeeApprovals.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/EmployeeApprovals.js) | Employee Onboarding | Verify new FSE & TL registrations, assign team leaders & salary tiers. |
| [`src/pages/TLOverview.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/TLOverview.js) | TL Team Hierarchy | Team Leader ranking matrix, assigned FSE lists, team completion rates. |
| [`src/pages/ManagerOverview.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/ManagerOverview.js) | Manager Hierarchy | Manager performance overview, regional target quotas. |
| [`src/pages/AttendanceManagement.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/AttendanceManagement.js) | Attendance & GPS | GPS location maps, shift punch-in/out times, selfie verification logs. |
| [`src/pages/ProductDashboard.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/ProductDashboard.js) | Product Suite Config | Manage financial products, payout rules, & commission structures. |
| [`src/pages/FormBuilder.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/FormBuilder.js) | Dynamic Form Engine | Build custom onboarding forms with drag-and-drop fields. |
| [`src/pages/PointsConfiguration.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/PointsConfiguration.js) | Incentive Rules | Define reward point algorithms for FSE form approvals. |
| [`src/pages/VerificationRules.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/VerificationRules.js) | Compliance Rules | Configure automated document validation regex and GPS radii. |
| [`src/pages/SalarySlips.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/SalarySlips.js) | Payroll Engine | Generate monthly salary slips and PDF downloads. |
| [`src/pages/Meetings.js`](file:///c:/VegaProject/vegavruddhi-admin-panel/fse-dashboard/src/pages/Meetings.js) | Team Meetings | Schedule team meetings and broadcast announcements. |

---

## 🚀 Setup & Execution
```bash
cd c:\VegaProject\vegavruddhi-admin-panel\fse-dashboard
npm install
npm start
```
Runs on default React development port.

---

## 📄 License
Internal Proprietary Software – Vegavruddhi Technologies.
