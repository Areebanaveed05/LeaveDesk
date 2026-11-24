LeaveDesk --- Employee Leave, Attendance & Project Management System

LeaveDesk is an organization-focused web application for managing
employee leave requests, attendance, projects, and project tasks through
a shared Admin and Employee portal.
Overview
The application provides a centralized workspace where administrators
can manage employees and organizational structure, while employees can
submit and track requests and work with projects and tasks assigned to
them.
Main Features
Admin Portal
- Create and manage employee accounts.
- Edit employee information, department details, designations, and
  organizational team memberships.
- Activate or deactivate employee accounts and reset passwords.
- Review, approve, and reject leave requests.
- View employee leave request information and leave balances.
- Manage attendance information.
- Create and manage projects.
- Assign project team members and select a Project Lead.
- View project progress and task information.
Employee Portal
- Sign in using an organization-created employee account.
- Submit and track leave requests.
- View leave request status and available leave information.
- Check attendance information.
- View projects to which the employee is assigned.
- View tasks assigned to the employee and update task progress.
- Project Leads can manage phases and assign tasks to members of
  projects they lead, subject to project status and permissions.
Project and Task Management
- Organize work through projects, project teams, and project phases.
- Assign tasks to members of the relevant project.
- Track task priorities, deadlines, dependencies, and completion
  status.
- View project and employee task progress.
- Overdue projects are treated separately from active projects in the
  interface. Project Leads should not create phases or assign new
  tasks while a project is overdue.
Technology Stack
  Layer              Technology
  Frontend           React
Frontend tooling   Vite
Styling            Tailwind CSS
Backend            Node.js
API                Express
Database           MongoDB
ODM                Mongoose
Authentication     JSON Web Tokens (JWT)
Password hashing   bcryptjs
Repository Structure
The repository uses a frontend/backend structure:
LeaveDesk/
├── client/                 # React frontend
│   ├── src/
│   └── package.json
├── server/                 # Express backend
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── utils/
│   ├── index.js
│   └── package.json
└── README.md
The exact folders and files may evolve as the project is developed.
Prerequisites
Install the following before running the project locally:
- Node.js (LTS version recommended)
- npm
- MongoDB Atlas account or a reachable MongoDB instance
- Git
Local Setup
1. Clone the repository
git clone https://github.com/Areebanaveed05/LeaveDesk.git
cd LeaveDesk
2. Configure the backend
cd server
npm install
Create a server/.env file. Add the environment variables required by
the backend:
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

ADMIN_NAME=Organization Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_password
Important security notes: - Replace every example value with your
own private value. - Never commit .env files, database credentials,
JWT secrets, or real passwords to GitHub. - Keep .env in
.gitignore. - Use a strong, unique JWT_SECRET and a strong
administrator password. - The admin seed variables are only needed if
the project uses the admin creation script.

The backend package scripts currently include:
npm run dev
npm start
npm run seed:admin
Use npm run seed:admin only when you intentionally need to create the
initial administrator account, and follow the project's current seeding
logic. Do not repeatedly run seed scripts without checking whether they
create or update an account.

Start the backend for local development:
npm run dev
The backend is configured to use port 5000 by default when PORT is
not set.
3. Configure the frontend
Open a second terminal:
cd client
npm install
Configure the frontend API base URL using the environment variable
expected by the API configuration file (for example,
client/src/api.js). For a Vite environment, client-side environment
variables normally use the VITE_ prefix.

Example only:
VITE_API_URL=http://localhost:5000/api
Check the actual API configuration in the repository before using this
exact value. The variable name and whether /api belongs in the URL
must match the frontend's API client.

Start the frontend using the development script defined in
client/package.json, commonly:
npm run dev
Open the local URL printed by Vite in the terminal.
Environment Variables
  Variable                            Purpose
  PORT                              Port used by the Express server

  MONGO_URI                         MongoDB connection string

  JWT_SECRET                        Secret used to sign authentication
tokens

  JWT_EXPIRES_IN                    JWT token lifetime

  ADMIN_NAME                        Initial administrator name, if used
by the seed script

  ADMIN_EMAIL                       Initial administrator email, if
used by the seed script

  ADMIN_PASSWORD                    Initial administrator password, if
used by the seed script
VITE_API_URL                      Example frontend API URL variable;
confirm the exact name in
client/src/api.js
Do not publish real environment variable values in this README or in the
repository.
Deployment Notes
The intended deployment arrangement is:
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
Before deployment:
1. Push the latest tested code to the GitHub repository.
2. Confirm .env, node_modules, build output, and other
   private/local files are excluded from Git.
3. Create the production MongoDB connection string and configure Atlas
   network access.
4. Add backend environment variables in the Render service settings.
5. Deploy the backend and note its public URL.
6. Configure the frontend's production API URL in Vercel.
7. Configure backend CORS to allow the deployed frontend origin.
8. Test authentication and the main workflows on the deployed website.
Never put MongoDB credentials or JWT_SECRET in frontend environment
variables. Frontend variables are exposed to the browser.
Important Notes
- Admin and Employee accounts are managed through the application's
  authentication and role-based access flow.
- Project Lead permissions are limited to projects where that employee
  is assigned as Project Lead.
- Employees should only manage their own assigned tasks.
- Frontend restrictions should be backed by server-side authorization
  and validation.
- Confirm all environment variable names and scripts against the
  current server/package.json, client/package.json, and API
  configuration before deployment.
Repository
GitHub: https://github.com/Areebanaveed05/LeaveDesk
LeaveDesk --- A centralized workspace for employee leave,
attendance, projects, and task coordination.