# Site2CRM + HubSpot Setup Guide

Capture leads from your website forms and sync them to HubSpot CRM in real-time.

---

## Overview

Site2CRM connects your website forms directly to HubSpot, automatically creating contacts, companies, and associations whenever someone submits a form. No manual data entry required.

**What gets synced:**
- Contacts (name, email, phone)
- Companies (with automatic deduplication)
- Contact-to-Company associations

**Sync time:** Immediate (under 1 second)

---

## Prerequisites

Before you begin, you'll need:

- A [HubSpot account](https://www.hubspot.com/) (Free CRM or any paid tier)
- A website where you can add JavaScript code
- A Site2CRM account (free to create)

---

## Step 1: Create Your Site2CRM Account

1. Go to [site2crm.io/signup](https://site2crm.io/app/signup)
2. Enter your email and create a password
3. Verify your email address by clicking the link sent to your inbox
4. Complete the brief onboarding questions

---

## Step 2: Connect HubSpot

1. In Site2CRM, navigate to **Settings → Integrations**
2. Find **HubSpot** in the CRM list
3. Click **Connect HubSpot**

![Connect HubSpot button](https://site2crm.io/docs/images/connect-hubspot.png)

4. You'll be redirected to HubSpot's authorization page
5. Log in to your HubSpot account (if not already logged in)
6. Review the permissions Site2CRM is requesting:
   - Read and write contacts
   - Read and write companies
   - Read and write deals
   - Read contact, company, and deal schemas
7. Click **Allow** to authorize the connection

You'll be redirected back to Site2CRM with a success message. HubSpot is now your active CRM.

---

## Step 3: Create a Lead Capture Form

1. Navigate to **Forms** in the sidebar
2. Click **Create Form**
3. Configure your form fields:
   - **Name** (maps to HubSpot contact name)
   - **Email** (maps to HubSpot contact email)
   - **Phone** (maps to HubSpot contact phone)
   - **Company** (creates/links HubSpot company)
   - Add any custom fields as needed
4. Click **Save**

---

## Step 4: Embed the Form on Your Website

1. After saving your form, click **Get Embed Code**
2. Copy the JavaScript snippet provided:

```html
<script src="https://site2crm.io/embed/form.js" data-form-id="YOUR_FORM_ID"></script>
<div id="site2crm-form"></div>
```

3. Paste this code into your website where you want the form to appear
4. The form will automatically render and match your site's styling

---

## Step 5: Test the Integration

1. Submit a test entry through your embedded form
2. In Site2CRM, go to **Integrations → Live Activity** to see the sync status
3. Open HubSpot and navigate to **Contacts** to verify the new contact was created
4. Check that the company association was created (if company name was provided)

---

## Managing Your Integration

### View Sync Activity

Navigate to **Integrations → Live Activity** to see:
- Recent lead submissions
- Sync status for each lead
- Any errors or failed syncs

### Test Connection

Click **Test Connection** on the Integrations page to verify your HubSpot connection is active and tokens are valid.

### Sync Now

Click **Sync Now** to manually trigger a sync of any pending leads.

### Disconnect HubSpot

If you need to disconnect:
1. Go to **Settings → Integrations**
2. Click the **Disconnect** button next to HubSpot
3. Confirm the disconnection

You can reconnect at any time by repeating Step 2.

---

## Data Mapping Reference

| Site2CRM Field | HubSpot Object | HubSpot Property |
|----------------|----------------|------------------|
| Name | Contact | `firstname`, `lastname` |
| Email | Contact | `email` |
| Phone | Contact | `phone` |
| Company | Company | `name` |
| Website | Company | `website` |
| Message | Contact | `message` (custom) |

---

## Troubleshooting

### "Connection expired" error

HubSpot OAuth tokens expire periodically. Site2CRM automatically refreshes them, but if you see this error:
1. Go to **Settings → Integrations**
2. Click **Reconnect HubSpot**
3. Complete the OAuth flow again

### Leads not appearing in HubSpot

1. Check the **Live Activity** tab for error messages
2. Verify your HubSpot account has available contacts (free tier has limits)
3. Use **Test Connection** to verify the integration is active

### Duplicate contacts

Site2CRM checks for existing contacts by email before creating new ones. If duplicates appear:
1. Verify the email addresses are actually different
2. Check HubSpot's duplicate management settings

---

## Permissions Explained

Site2CRM requests these HubSpot scopes:

| Scope | Purpose |
|-------|---------|
| `crm.objects.contacts.read` | Check for existing contacts |
| `crm.objects.contacts.write` | Create new contacts |
| `crm.objects.companies.read` | Check for existing companies |
| `crm.objects.companies.write` | Create new companies |
| `crm.objects.deals.read` | Read deal data for analytics |
| `crm.objects.deals.write` | Create deals from forms |
| `crm.schemas.*.read` | Read custom properties |

---

## Support

- **Email:** support@site2crm.io
- **Documentation:** [site2crm.io/docs](https://site2crm.io/docs)

---

## Frequently Asked Questions

**Q: Does Site2CRM store my HubSpot data?**
A: No. Site2CRM only passes form submissions to HubSpot. We don't store or read your existing HubSpot data.

**Q: Can I use Site2CRM with HubSpot Free CRM?**
A: Yes. Site2CRM works with all HubSpot tiers including the free CRM.

**Q: What happens if HubSpot is down?**
A: Submissions are queued and automatically retried when HubSpot becomes available.

**Q: Can I map custom fields?**
A: Yes. Navigate to **Integrations → Field Mapping** to configure custom field mappings.

---

*Last updated: January 2026*
