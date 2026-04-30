# 🏥 MediConnect - Doctor Appointment Management System

A fully functional doctor appointment booking system built with **HTML, CSS, JavaScript** (Frontend), **Node.js/Express** (Backend), and **MySQL** (Database).

---

## 📁 Project Structure

```
MediConnect/
│
├── frontend/
│   ├── index.html              # Home/Landing page
│   ├── style.css               # Global styles & design system
│   ├── script.js               # Common JS (API helpers, auth, includes)
│   ├── includes/
│   │     ├── header.html       # Reusable header component
│   │     └── footer.html       # Reusable footer component
│   ├── assets/
│   │     ├── images/           # Image assets
│   │     └── icons/            # Icon assets
│   ├── patient/
│   │     ├── appointment.html  # Book appointment form
│   │     ├── check-status.html # Check appointment status
│   │     └── patient.js        # Patient module logic
│   ├── doctor/
│   │     ├── login.html        # Doctor login portal
│   │     ├── dashboard.html    # Doctor dashboard with stats
│   │     ├── new-appointments.html
│   │     ├── approved-appointments.html
│   │     ├── cancelled-appointments.html
│   │     ├── all-appointments.html
│   │     ├── profile.html      # Doctor profile management
│   │     └── search.html       # Search appointments
│   └── admin/
│         ├── login.html        # Admin login portal
│         ├── dashboard.html    # Admin dashboard with stats
│         ├── manage-doctors.html
│         ├── manage-specialization.html
│         └── manage-appointments.html
│
├── backend/
│   ├── server.js               # Express server entry point
│   ├── db.js                   # MySQL connection pool
│   ├── .env                    # Environment variables
│   ├── package.json            # Dependencies
│   └── routes/
│         ├── auth.js           # Login/Register endpoints
│         ├── appointments.js   # Appointment CRUD
│         ├── doctors.js        # Doctor CRUD
│         ├── admin.js          # Admin dashboard & management
│         └── specializations.js # Specialization CRUD
│
└── database/
    └── schema.sql              # Database schema + seed data
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v14+)
- **MySQL** (v5.7+ or v8+)
- **npm**

### Step 1: Setup Database

1. Open MySQL (via command line or phpMyAdmin/MySQL Workbench)
2. Run the schema file:
```sql
source database/schema.sql
```
Or import it via your MySQL GUI tool.

### Step 2: Configure Environment

Edit `backend/.env` with your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=mediconnect
DB_PORT=3306
PORT=3000
```

### Step 3: Install Dependencies

```bash
cd backend
npm install
```

### Step 4: Start the Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

### Step 5: Open in Browser

Visit: **http://localhost:3000**

---

## 👤 Default Login Credentials

| Role   | Email                    | Password   |
|--------|--------------------------|------------|
| Admin  | admin@mediconnect.com    | admin123   |
| Doctor | emilia@mediconnect.com   | doctor123  |
| Doctor | james@mediconnect.com    | doctor123  |
| Doctor | pkandrikar11@gmail.com   | tappu11    |

---

## ✨ Features

### Patient Module
- ✅ Book appointments with specialization & doctor selection
- ✅ View appointment status by number/name/phone
- ✅ Responsive booking form with validation

### Doctor Module
- ✅ Secure login portal
- ✅ Dashboard with appointment statistics
- ✅ View new (pending) appointments
- ✅ Approve/Cancel appointments
- ✅ View approved & cancelled lists
- ✅ Profile management & password change
- ✅ Search appointments

### Admin Module
- ✅ Secure admin login
- ✅ Platform-wide dashboard stats
- ✅ Manage doctors (add, activate/deactivate, delete)
- ✅ Manage specializations (add, delete)
- ✅ Manage all appointments (filter, approve, cancel, delete)

---

## 🎨 Design

- **Color Scheme**: Warm teal/green (#1B4332 primary) with orange accents
- **Fonts**: Outfit (headings) + Inter (body)
- **Responsive**: Mobile, Tablet, Desktop
- **Features**: Glassmorphism header, gradient buttons, card hover effects, toast notifications, smooth animations

---

## 🔌 API Endpoints

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | /api/auth/doctor/login          | Doctor login             |
| POST   | /api/auth/admin/login           | Admin login              |
| POST   | /api/auth/doctor/register       | Doctor registration      |
| GET    | /api/specializations            | List specializations     |
| POST   | /api/specializations            | Add specialization       |
| GET    | /api/doctors                    | List doctors             |
| GET    | /api/doctors/:id                | Get doctor details       |
| PUT    | /api/doctors/:id                | Update doctor profile    |
| POST   | /api/appointments               | Book appointment         |
| GET    | /api/appointments               | List appointments        |
| GET    | /api/appointments/search?q=     | Search appointments      |
| PUT    | /api/appointments/:id/status    | Update status            |
| GET    | /api/admin/dashboard            | Admin stats              |

---

## 📱 Responsive Design

The UI is fully responsive and works on:
- 📱 Mobile (< 768px)
- 📲 Tablet (768px - 1024px)
- 💻 Desktop (> 1024px)
