# LeaveDesk – Office Leave & Remote Work Tracker

LeaveDesk is a full-stack MERN application designed to simplify employee leave and remote work management. It allows employees to submit leave requests and enables managers to approve, reject, delete, and track requests through an interactive dashboard.

## Features

- **Dashboard:** Overview of leave management activity.
- **Out Today:** Displays employees with approved leave or remote work active today.
- **Recent Leave Decisions:** Shows approved and rejected requests for yesterday, today, and tomorrow.
- **Submit Leave Requests:** Employees can submit requests with their name, department, request type, dates, and reason.
- **Request Management:** View and manage all submitted requests.
- **Status Management:** Approve or reject employee requests.
- **Filtering:** Filter requests by All, Pending, Approved, and Rejected status.
- **Delete Requests:** Remove requests when required.
- **Interactive UI:** Responsive interface with a sidebar and modern styling.
- **Validation & Error Handling:** Handles invalid date ranges, loading states, and API errors.

## Technologies Used

### Frontend
- React.js
- Vite
- Tailwind CSS v4
- Axios

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Nodemon

## Project Structure

```text
leave-tracker/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── .env
│   ├── index.js
│   └── package.json
│
├── .gitignore
└── README.md
```

## Installation & Setup

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd leave-tracker
```

### 2. Set Up the Backend

Navigate to the server folder:

```bash
cd server
npm install
```

Create a `.env` file inside the server folder:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
```

Replace the MongoDB URI with your own MongoDB Atlas connection string.

Start the backend development server:

```bash
npm run dev
```

The backend will run at:

`http://localhost:5000`

### 3. Set Up the Frontend

Open a second terminal and navigate to the client folder:

```bash
cd client
npm install
```

Create a `.env` file inside the client folder:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm run dev
```

Open the local URL displayed by Vite, usually:

`http://localhost:5173`

## API Endpoints

Base URL: `http://localhost:5000/api/requests`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/requests` | Create a new leave request |
| GET | `/api/requests` | Fetch all leave requests |
| PATCH | `/api/requests/:id/status` | Approve or reject a request |
| DELETE | `/api/requests/:id` | Delete a request |

### Supported Query Filters

- `?status=Pending` – Filter by request status.
- `?type=Work+From+Home` – Filter by request type.
- `?today=true` – Fetch requests active today.

Filters can also be combined where supported by the API.

## Request Statuses

- **Pending:** Newly submitted requests.
- **Approved:** Requests accepted by management.
- **Rejected:** Requests declined by management.

## Available Scripts

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production frontend |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint |

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start backend with Nodemon |
| `npm start` | Start backend using Node.js |

## Environment Variables

Keep the following files private:

- `server/.env`
- `client/.env`

Never commit MongoDB credentials or other secrets to GitHub.

## Project Goal

This project was developed as part of MERN Stack onboarding to practice full-stack development, REST API integration, MongoDB database operations, form validation, request status workflows, and interactive React interfaces.

---

**Project:** LeaveDesk – Office Leave & Remote Work Tracker  
**Stack:** MERN (MongoDB, Express.js, React.js, Node.js)
