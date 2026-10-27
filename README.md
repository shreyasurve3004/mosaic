# Mosaic

**A Full-Stack Academic Collaboration Platform**

Mosaic is a web-based academic collaboration platform designed to bring essential academic services into one unified workspace. It provides role-based access to academic resources and tools for students and faculty, with centralized services for assignments, events, notices, library resources, and academic reporting.

The project aims to simplify academic workflows through an organized interface, secure authentication, and a modular full-stack architecture.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Overview

Mosaic combines a modern frontend with a Django REST Framework backend to provide a centralized platform for academic activities.

The application is organized into separate modules for user management, academics, events, notices, library services, reports, and file handling.

The codebase is designed to support modular development, maintainability, and future feature expansion.

## Features

- **Role-based access:** Authentication and permissions for accessing protected resources.
- **Academic management:** Dedicated academic functionality for organizing academic activities.
- **Assignment management:** Faculty assignment functionality and related academic workflows.
- **Events:** Centralized access to academic events.
- **Notices and announcements:** A dedicated module for academic notices.
- **Library services:** Library-related functionality within the platform.
- **Academic reporting:** A reporting module for academic information.
- **File management:** Backend file-handling functionality.
- **Email integration:** SMTP configuration for supported email workflows.
- **REST API:** Backend endpoints built with Django REST Framework.
- **JWT authentication:** Token-based API authentication using Simple JWT.

*Note: The availability of individual features depends on the current implementation. See the source code for the latest functionality.*

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Programming language | TypeScript |
| Frontend tooling | Vite |
| Backend | Python, Django |
| API | Django REST Framework |
| Database | PostgreSQL |
| Authentication | JSON Web Tokens (JWT), Simple JWT |
| Cross-origin requests | Django CORS Headers |
| File storage integration | Cloudinary |
| Email | SMTP |

## Project Structure

```text
mosaic/
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── apps/
│   │   ├── users/
│   │   ├── academics/
│   │   ├── events/
│   │   ├── notices/
│   │   ├── library/
│   │   └── reports/
│   ├── file_service/
│   ├── .env.example
│   └── manage.py
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── .gitignore
└── README.md
```

The structure above highlights the main application components. Refer to the repository for the complete directory tree.

## Getting Started

### Prerequisites

Install the following before running the project:

- Git
- Python and pip
- Node.js and npm
- PostgreSQL
- A Cloudinary account if using the file-storage integration
- SMTP credentials if using email functionality

### 1. Clone the repository

```bash
git clone https://github.com/shreyasurve3004/mosaic.git
cd mosaic
```

### 2. Configure the backend

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a Python virtual environment.

**Windows PowerShell:**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install the backend dependencies using the dependency file included in the repository. If the project contains `requirements.txt`, run:

```powershell
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a local `.env` file inside `backend/` by copying `.env.example`.

```powershell
Copy-Item .env.example .env
```

Edit `backend/.env` and replace the placeholders with your own configuration values. See [Environment Configuration](#environment-configuration).

### 4. Prepare the database

Create a PostgreSQL database and configure its connection details in `backend/.env`.

Run Django migrations:

```powershell
python manage.py migrate
```

If required, create an administrator account:

```powershell
python manage.py createsuperuser
```

### 5. Start the backend server

From the `backend/` directory:

```powershell
python manage.py runserver
```

The default Django development server address is:

`http://127.0.0.1:8000/`

### 6. Start the frontend

Open a second terminal and navigate to the frontend directory from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Vite will display the local development URL in the terminal. Open that address in your browser.

Make sure the frontend API configuration points to the running backend and that the backend's CORS configuration permits the frontend origin.

## Environment Configuration

The backend uses environment variables for configuration and sensitive credentials.

The `backend/.env.example` file documents the expected variables:

| Variable
