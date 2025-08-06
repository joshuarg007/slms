# Smart Lead Management System (SLMS)

The **Smart Lead Management System (SLMS)** is a cloud-based SaaS platform designed to streamline the intake, distribution, and tracking of sales leads across organizations. It features a FastAPI backend and a React-based frontend with Tailwind CSS styling. SLMS supports CRM integration, embedded lead capture, and customizable dashboards.

---

## Features

- Centralized lead intake API with JSON support
- Public embeddable widget for lead capture from any website
- Automatic HubSpot CRM integration via Site2CRM (push-only)
- Support for additional CRM integrations (e.g., Pipedrive planned)
- Dashboard with authentication and user roles (Admin, Sales Rep)
- PostgreSQL database hosted on Amazon RDS
- Fully containerized and deployable via Docker

---

## Tech Stack

### Backend (API)
- **FastAPI** (Python)
- **PostgreSQL** (Amazon RDS)
- **Alembic** (for database migrations)
- **Pydantic** (schema validation)
- **pydantic-settings** (environment config)
- **httpx** (HubSpot API integration)
- **Uvicorn** (ASGI server)

### Frontend (Client)
- **React** with **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (utility-first styling)
- **React Router** (for page navigation)

### DevOps / Deployment
- Docker (multi-container support)
- GitHub Actions (CI/CD pipeline)
- AWS Free Tier for cloud resources

---

## Project Structure

```
SLMS/
├── app/                     # FastAPI application code
│   ├── api/                 # Routes and endpoints
│   ├── crud/                # Database interaction logic
│   ├── db/                  # Database models and connection
│   ├── integrations/        # External service integrations (e.g., HubSpot)
│   ├── schemas/             # Pydantic models
│   ├── static/              # Static files (optional)
├── alembic/                 # Alembic migrations
├── slms-frontend/           # React frontend application
│   ├── public/
│   ├── src/
│   └── package.json
├── scripts/                 # Custom automation scripts
├── main.py                  # Entry point for FastAPI
├── requirements.txt         # Python dependencies
├── alembic.ini              # Alembic config
├── .env                     # Environment variables
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 20+
- PostgreSQL (local or AWS RDS)
- Docker (optional but recommended)
- HubSpot account with a **Private App** and access token

### Backend Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables in `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/slms
   HUBSPOT_API_KEY=your-private-app-token
   ```

4. Set up the database:
   ```bash
   alembic upgrade head
   ```

5. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd slms-frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

Visit `http://localhost:5173` to view the frontend. The backend is typically available at `http://127.0.0.1:8000`.

---

## HubSpot Integration (Site2CRM)

- **Integration Type:** Push-only  
- **Authentication:** Private App Access Token  
- **Sync Behavior:** Automatically pushes each new lead to HubSpot on creation  
- **Endpoint for Manual Testing:**  
  ```
  POST /api/hubspot/test
  ```
- **Required Fields:** `email`, `first_name`, `last_name`, `phone` (others optional)

---

## Development Notes

- Use environment variables via `.env` for secrets and database credentials.
- Alembic is used for schema versioning. Always create migrations with:
  ```bash
  alembic revision --autogenerate -m "Your message"
  ```
- React components are styled using Tailwind classes.
- Authentication tokens are stored securely and passed via headers.

---

## License

This project is open source and available under the MIT License.

---

## Author

Joshua R. Gutierrez  
Bachelor's in Computer Science – Colorado State University Global  
Master's in Computer Science – Colorado State University Global (In Progress)  
GitHub: [github.com/joshuargutierrez](https://github.com/joshuargutierrez)
