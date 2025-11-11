from datetime import datetime, timezone

from fastapi import APIRouter, Response
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get("/", include_in_schema=False)
def home():
    return HTMLResponse(
        """
        <!doctype html>
        <html>
          <head><meta charset="utf-8"><title>Site2CRM API</title></head>
          <body style="font: 14px system-ui; margin: 2rem;">
            <h1>Site2CRM API</h1>
            <p>Backend is running.</p>
            <ul>
              <li><a href="/docs">Open API Docs</a></li>
              <li><a href="http://127.0.0.1:5173/">Open Frontend (Vite)</a></li>
            </ul>
          </body>
        </html>
        """
    )

@router.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@router.get("/healthz", tags=["Core"])
def healthz():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}
