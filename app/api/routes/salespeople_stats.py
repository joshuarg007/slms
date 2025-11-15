# app/api/routes/salespeople_stats.py
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_db, get_current_user
from app.db import models
from app.schemas.salesperson import SalespersonStatsResponse

# Updated imports (each now supports soft-errors and per-org tokens)
from app.integrations import hubspot
from app.integrations import pipedrive
from app.integrations import salesforce
from app.integrations import nutshell

router = APIRouter(prefix="/salespeople", tags=["Salespeople"])


@router.get("/stats", response_model=SalespersonStatsResponse)
async def unified_salespeople_stats(
    days: int = Query(7, ge=1, le=365),
    owner_id: Optional[str] = Query(None),
    owner_email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> SalespersonStatsResponse:

    org = db.query(models.Organization).get(current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    provider = (org.active_crm or "hubspot").lower()
    today = date.today()

    # Ensure the org actually has credentials for the CRM they selected
    cred = (
        db.query(models.IntegrationCredential)
        .filter(
            models.IntegrationCredential.organization_id == org.id,
            models.IntegrationCredential.provider == provider,
            models.IntegrationCredential.is_active.is_(True),
        )
        .first()
    )

    if not cred:
        pretty = provider.capitalize()
        raise HTTPException(
            status_code=400,
            detail=f"No {pretty} credentials configured for this organization. Please add a token on the Integrations page.",
        )

    results = []

    # Cache only for the HubSpot/Pipedrive/Nutshell/SF unified 7-day view
    if days == 7:
        cached_rows = (
            db.query(models.SalespersonDailyStats)
            .filter(
                models.SalespersonDailyStats.organization_id == org.id,
                models.SalespersonDailyStats.provider == provider,
                models.SalespersonDailyStats.stats_date == today,
            )
            .all()
        )
        if cached_rows:
            results = [
                {
                    "owner_id": r.owner_id,
                    "owner_name": r.owner_name,
                    "owner_email": r.owner_email,
                    "emails_last_n_days": r.emails_count,
                    "calls_last_n_days": r.calls_count,
                    "meetings_last_n_days": r.meetings_count,
                    "new_deals_last_n_days": r.new_deals_count,
                }
                for r in cached_rows
            ]

    # If no cache, call integration module
    if not results:
        try:
            if provider == "hubspot":
                # now passes organization_id for proper token lookup
                results = await hubspot.get_salespeople_stats(
                    days=days,
                    owner_id=owner_id,
                    include_archived_owners=False,
                    organization_id=org.id,
                )

            elif provider == "pipedrive":
                results = await pipedrive.owners_stats(
                    days=days,
                    owner_id=owner_id,
                    organization_id=org.id,
                )

            elif provider == "salesforce":
                results = await salesforce.get_salespeople_stats(
                    db=db,
                    org_id=org.id,
                    days=days,
                )

            elif provider == "nutshell":
                results = await nutshell.owners_stats(
                    days=days,
                    owner_id=owner_id,
                    organization_id=org.id,
                )

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported CRM provider: {provider}",
                )

        except RuntimeError as e:
            return SalespersonStatsResponse(
                days=days,
                results=[],
                warning=str(e),
            )

        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"{provider} stats error: {e}",
            )

        # Write fresh cache
        if days == 7 and results:
            for row in results:
                oid = str(row.get("owner_id") or "").strip()
                if not oid:
                    continue

                stats_row = (
                    db.query(models.SalespersonDailyStats)
                    .filter(
                        models.SalespersonDailyStats.organization_id == org.id,
                        models.SalespersonDailyStats.provider == provider,
                        models.SalespersonDailyStats.owner_id == oid,
                        models.SalespersonDailyStats.stats_date == today,
                    )
                    .first()
                )

                if not stats_row:
                    stats_row = models.SalespersonDailyStats(
                        organization_id=org.id,
                        provider=provider,
                        owner_id=oid,
                    )

                stats_row.owner_email = row.get("owner_email")
                stats_row.owner_name = row.get("owner_name")
                stats_row.stats_date = today
                stats_row.emails_count = int(row.get("emails_last_n_days") or 0)
                stats_row.calls_count = int(row.get("calls_last_n_days") or 0)
                stats_row.meetings_count = int(row.get("meetings_last_n_days") or 0)
                stats_row.new_deals_count = int(row.get("new_deals_last_n_days") or 0)

                db.add(stats_row)

            db.commit()

    # Optional filters
    if owner_id:
        results = [r for r in results if str(r.get("owner_id")) == str(owner_id)]
    elif owner_email:
        eml = owner_email.strip().lower()
        results = [r for r in results if (r.get("owner_email") or "").lower() == eml]

    return SalespersonStatsResponse(days=days, results=results)
