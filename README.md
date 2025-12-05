# Civic Problem Reporter

**A full-stack application connecting citizens with local authorities to solve civic issues efficiently.**

![Project Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

## Overview

The **Civic Problem Reporter** is a digital platform designed to bridge the gap between citizens and local authorities. It empowers users to report civic issues (such as potholes, uncollected garbage, or broken streetlights) in real-time, ensuring that problems are brought to the attention of the correct departments for swift resolution.

---

##  Key Features

###  For Citizens (Users)
* **Easy Reporting:** Submit issues with a title, description, and photo.
* **Geo-Tagging:** Automatically captures the location (Latitude/Longitude) of the issue.
* **Real-time Tracking:** View the status of reported issues (e.g., *Pending, In Progress, Resolved*).
* **History:** Access a personal dashboard of past submissions.

###  For Authorities (Admins)
* **Admin Dashboard:** A centralized view of all incoming reports.
* **Status Management:** Update the status of issues as they are processed.
* **Filter & Sort:** Organize reports by urgency, date, or location.
* **Verification:** Review image evidence before assigning tasks.

---

##  Tech Stack

**Frontend:**
* [React.js / Next.js]
* [Tailwind CSS / CSS3]

**Backend:**
* [Node.js / Python FastAPI]
* [Express / Django]

**Database:**
* [MongoDB / PostgreSQL / MySQL]

**Services:**
* **Maps:** [Google Maps API / Mapbox]
* **Auth:** [JWT / Firebase Auth]

---

##  Workflow

The application follows a bidirectional workflow:

1.  **Citizen Workflow:**
    * **Login/Signup:** User authenticates.
    * **Capture:** User takes a photo of the civic issue.
    * **Upload:** User submits photo + description + location.
    * **Track:** User checks the dashboard for updates.

2.  **Admin Workflow:**
    * **Login:** Admin authenticates into the dashboard.
    * **Review:** Admin views the list of pending issues.
    * **Action:** Admin assigns the issue to the relevant department.
    * **Update:** Once fixed, Admin marks the status as **"Resolved"**.

---

##  Installation & Setup


### 1. Clone the Repository
```bash
git clone [https://github.com/Vin07h/Vin07h-Civic-Problem-Reporter.git](https://github.com/Vin07h/Vin07h-Civic-Problem-Reporter.git)
cd Vin07h-Civic-Problem-Reporter

2. Install Dependencies
Backend:

Bash

cd backend
npm install  # or pip install -r requirements.txt
Frontend:

Bash

cd frontend
npm install
3. Configure Environment
Create a .env file and add your credentials:

Code snippet

DB_URL=your_database_url
API_KEY=your_map_api_key
SECRET_KEY=your_jwt_secret
4. Run the App
Bash

# Terminal 1 (Backend)
cd backend && npm start

# Terminal 2 (Frontend)
cd frontend && npm start
