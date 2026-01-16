// Knowledge Base Articles for Site2CRM

export type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  content: string;
  timeToRead: string;
};

export type Category = {
  slug: string;
  title: string;
  description: string;
  icon: string;
};

export const KB_CATEGORIES: Category[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of Site2CRM",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    slug: "integrations",
    title: "CRM Integrations",
    description: "Connect your favorite CRM",
    icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    slug: "billing",
    title: "Billing",
    description: "Plans, pricing, and payments",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  },
  {
    slug: "account",
    title: "Account",
    description: "Manage your account and data",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
];

export const KB_ARTICLES: Article[] = [
  // Getting Started
  {
    slug: "creating-your-first-form",
    title: "Creating Your First Form",
    description: "Learn how to create a lead capture form in under 2 minutes",
    category: "Getting Started",
    categorySlug: "getting-started",
    timeToRead: "2 min",
    content: `
## Creating Your First Form

**Time needed:** 2 minutes

### Steps

1. Log in to your Site2CRM dashboard
2. Click **Forms** in the sidebar
3. Click **Create Form**
4. Choose a template or start blank
5. Add fields by clicking **+ Add Field**
6. Drag fields to reorder them
7. Click **Save**

### Available Field Types

- **Text** - Single line text input
- **Email** - Email address with validation
- **Phone** - Phone number input
- **Dropdown** - Select from predefined options
- **Checkbox** - Yes/no or multiple choice
- **Text Area** - Multi-line text input
- **File Upload** - Accept document uploads

### Tips for High-Converting Forms

- **Keep it short** - 3-5 fields convert best
- **Always include contact info** - Email or Phone for follow-up
- **Use clear labels** - Tell visitors exactly what you need
- **Preview before publishing** - Use the Preview button to see how it looks

### Next Steps

Once your form is created, you'll want to:
1. [Connect your CRM](/help/getting-started/connecting-your-crm)
2. [Embed it on your website](/help/getting-started/embedding-forms)
    `,
  },
  {
    slug: "connecting-your-crm",
    title: "Connecting Your CRM",
    description: "Set up your CRM integration in under a minute",
    category: "Getting Started",
    categorySlug: "getting-started",
    timeToRead: "1 min",
    content: `
## Connecting Your CRM

**Time needed:** 1 minute

### Steps

1. Go to **Integrations** in your dashboard
2. Click **Connect** next to your CRM
3. Log in to your CRM when prompted
4. Authorize Site2CRM to access your account
5. You'll see a green "Connected" status when done

### Supported CRMs

- **HubSpot** - Contacts, companies, and deals
- **Salesforce** - Leads, contacts, and accounts
- **Pipedrive** - People, organizations, and deals
- **Zoho CRM** - Leads, contacts, and accounts
- **Nutshell** - People, companies, and leads

### Multiple CRMs

You can connect multiple CRMs and choose which one each form syncs to. This is useful if:
- Different teams use different CRMs
- You're migrating from one CRM to another
- You want to sync leads to multiple destinations

### Troubleshooting

**Connection failed?**
- Make sure you're logged into the correct CRM account
- Check that you have admin permissions in your CRM
- Try disconnecting and reconnecting

**Leads not syncing?**
- Verify the connection shows "Connected" status
- Check that your form is set to sync to the correct CRM
- Submit a test lead to verify the connection
    `,
  },
  {
    slug: "embedding-forms",
    title: "Embedding Forms on Your Website",
    description: "Add your form to any website with one line of code",
    category: "Getting Started",
    categorySlug: "getting-started",
    timeToRead: "1 min",
    content: `
## Embedding Forms on Your Website

**Time needed:** 1 minute

### Steps

1. Go to **Forms** and select your form
2. Click the **Embed** tab
3. Copy the embed code
4. Paste it into your website's HTML

### Embed Code Example

\`\`\`html
<script src="https://site2crm.io/widget/YOUR_FORM_ID.js"></script>
\`\`\`

### Platform-Specific Instructions

**WordPress**
- Edit your page/post
- Add an HTML block
- Paste the embed code
- Save and preview

**Webflow**
- Add an Embed element to your page
- Paste the embed code
- Publish your site

**Squarespace**
- Add a Code Block
- Paste the embed code
- Save and preview

**Wix**
- Add an HTML iframe element
- Paste the embed code
- Publish your site

**Custom HTML Site**
- Paste the code where you want the form to appear
- The form will render automatically

### Testing Your Embed

After embedding:
1. Visit your website
2. Make sure the form displays correctly
3. Submit a test lead
4. Verify it appears in your CRM

### Styling

The form automatically inherits styles from your Site2CRM form settings. To customize:
1. Go to **Forms** > **Styles**
2. Adjust colors, fonts, and spacing
3. Save changes - your embedded form updates automatically
    `,
  },

  // Integrations
  {
    slug: "hubspot-setup",
    title: "HubSpot Setup Guide",
    description: "Connect Site2CRM to your HubSpot account",
    category: "CRM Integrations",
    categorySlug: "integrations",
    timeToRead: "2 min",
    content: `
## HubSpot Setup Guide

Connect Site2CRM to HubSpot and start syncing leads instantly.

### What Syncs

- **Contacts** - Name, email, phone, and custom properties
- **Companies** - Organization data linked to contacts
- **Deals** - Optional deal creation with pipeline assignment

### Setup Steps

1. Go to **Integrations** > **HubSpot**
2. Click **Connect**
3. Log in to your HubSpot account
4. Click **Grant Access**
5. Done - you'll see "Connected" status

### Field Mapping

Form fields automatically map to HubSpot contact properties:

| Form Field | HubSpot Property |
|------------|------------------|
| Name | firstname, lastname |
| Email | email |
| Phone | phone |
| Company | company |

**Custom fields** can be mapped in Form Settings > Field Mapping.

### HubSpot Plans

Site2CRM works with all HubSpot plans:
- HubSpot Free CRM
- Starter
- Professional
- Enterprise

### Sync Speed

Leads appear in HubSpot within **seconds** of form submission. No delays, no batching.

### Troubleshooting

**"Not authorized" error**
- Make sure you have admin access in HubSpot
- Try disconnecting and reconnecting

**Custom fields not syncing**
- Verify the field exists in HubSpot first
- Check field mapping in Form Settings

**Duplicate contacts**
- HubSpot automatically dedupes by email
- Existing contacts are updated, not duplicated
    `,
  },
  {
    slug: "salesforce-setup",
    title: "Salesforce Setup Guide",
    description: "Connect Site2CRM to your Salesforce org",
    category: "CRM Integrations",
    categorySlug: "integrations",
    timeToRead: "2 min",
    content: `
## Salesforce Setup Guide

Connect Site2CRM to Salesforce for instant lead sync.

### What Syncs

- **Leads** - Standard and custom lead fields
- **Contacts** - When converting from leads
- **Accounts** - Company/organization data

### Setup Steps

1. Go to **Integrations** > **Salesforce**
2. Click **Connect**
3. Log in to your Salesforce org
4. Click **Allow** to authorize
5. Done - you'll see "Connected" status

### Field Mapping

| Form Field | Salesforce Field |
|------------|------------------|
| Name | FirstName, LastName |
| Email | Email |
| Phone | Phone |
| Company | Company |

Custom Salesforce fields can be mapped in Form Settings.

### Requirements

- Salesforce Professional, Enterprise, or Unlimited edition
- API access enabled (included in most plans)
- System Administrator or appropriate permissions

### Lead Assignment

Leads can be assigned to:
- A specific user
- A lead assignment queue
- Round-robin distribution (via Salesforce rules)

Configure assignment in your Form Settings.

### Troubleshooting

**"Insufficient privileges" error**
- Verify you have API access in Salesforce
- Check your profile has "API Enabled" permission

**Leads not appearing**
- Check the lead was created (may be in a different view)
- Verify field mapping is correct

**Custom objects**
- Contact support for custom object mapping
    `,
  },
  {
    slug: "pipedrive-setup",
    title: "Pipedrive Setup Guide",
    description: "Connect Site2CRM to your Pipedrive account",
    category: "CRM Integrations",
    categorySlug: "integrations",
    timeToRead: "2 min",
    content: `
## Pipedrive Setup Guide

Connect Site2CRM to Pipedrive for seamless lead management.

### What Syncs

- **People** - Contact information
- **Organizations** - Company data
- **Deals** - Optional deal creation in your pipeline

### Setup Steps

1. Go to **Integrations** > **Pipedrive**
2. Click **Connect**
3. Log in to your Pipedrive account
4. Click **Allow and Install**
5. Done - you'll see "Connected" status

### Field Mapping

| Form Field | Pipedrive Field |
|------------|-----------------|
| Name | Person name |
| Email | Email |
| Phone | Phone |
| Company | Organization |

Custom fields are supported via Form Settings.

### Deal Creation

Optionally create deals automatically:
1. Go to Form Settings > CRM Options
2. Enable "Create Deal"
3. Select pipeline and stage
4. Deals are created linked to the person/org

### Pipedrive Plans

Works with all Pipedrive plans:
- Essential
- Advanced
- Professional
- Enterprise

### Troubleshooting

**Connection issues**
- Ensure you're a Pipedrive admin
- Try logging out of Pipedrive and reconnecting

**Missing custom fields**
- Create the field in Pipedrive first
- Then map it in Site2CRM Form Settings
    `,
  },
  {
    slug: "zoho-crm-setup",
    title: "Zoho CRM Setup Guide",
    description: "Connect Site2CRM to your Zoho CRM account",
    category: "CRM Integrations",
    categorySlug: "integrations",
    timeToRead: "2 min",
    content: `
## Zoho CRM Setup Guide

Connect Site2CRM to Zoho CRM for automatic lead sync.

### What Syncs

- **Leads** - New lead records
- **Contacts** - Contact information
- **Accounts** - Company/organization data

### Setup Steps

1. Go to **Integrations** > **Zoho CRM**
2. Click **Connect**
3. Log in to your Zoho account
4. Click **Accept** to authorize
5. Done - you'll see "Connected" status

### Field Mapping

| Form Field | Zoho CRM Field |
|------------|----------------|
| Name | First Name, Last Name |
| Email | Email |
| Phone | Phone |
| Company | Company |

Custom Zoho fields can be mapped in Form Settings.

### Multi-Org Support

If you have multiple Zoho organizations:
- You'll be prompted to select which org during connection
- You can connect multiple orgs if needed

### Zoho Plans

Works with all Zoho CRM editions:
- Free
- Standard
- Professional
- Enterprise

### Troubleshooting

**"Access denied" error**
- Verify you have admin access in Zoho CRM
- Check that API access is enabled for your edition

**Leads going to wrong org**
- Disconnect and reconnect, selecting the correct org
    `,
  },
  {
    slug: "nutshell-setup",
    title: "Nutshell Setup Guide",
    description: "Connect Site2CRM to your Nutshell account",
    category: "CRM Integrations",
    categorySlug: "integrations",
    timeToRead: "2 min",
    content: `
## Nutshell Setup Guide

Connect Site2CRM to Nutshell for automatic lead capture.

### What Syncs

- **People** - Contact records
- **Companies** - Organization data
- **Leads** - Sales opportunities

### Setup Steps

1. Go to **Integrations** > **Nutshell**
2. Click **Connect**
3. Enter your Nutshell email
4. Enter your API key (see below)
5. Click **Save**
6. Done - you'll see "Connected" status

### Finding Your API Key

1. Log in to Nutshell
2. Go to **Settings** > **API Keys**
3. Click **New API Key**
4. Give it a name like "Site2CRM"
5. Copy the key
6. Paste it in Site2CRM

### Field Mapping

| Form Field | Nutshell Field |
|------------|----------------|
| Name | Person name |
| Email | Email |
| Phone | Phone |
| Company | Company |

Custom fields are supported.

### Troubleshooting

**"Invalid API key" error**
- Double-check you copied the full key
- Generate a new key if needed

**Leads not appearing**
- Verify the connection shows "Connected"
- Check that the API key hasn't been revoked
    `,
  },

  // Billing
  {
    slug: "plans-and-pricing",
    title: "Plans and Pricing Explained",
    description: "Understand Site2CRM plans and choose the right one",
    category: "Billing",
    categorySlug: "billing",
    timeToRead: "3 min",
    content: `
## Plans and Pricing Explained

Choose the plan that fits your needs.

### Available Plans

| Feature | Starter | Pro |
|---------|---------|-----|
| **Price** | $29/mo | $79/mo |
| **Monthly leads** | Unlimited | Unlimited |
| **Forms** | 5 | Unlimited |
| **CRM integrations** | 2 | Unlimited |
| **Team members** | 3 | 10 |
| **Custom branding** | No | Yes |
| **Priority support** | No | Yes |

### Annual Billing

Pay annually and save:
- **Starter:** $290/year (2 months free)
- **Pro:** $790/year (2 months free)

That's a 17% discount on either plan.

### Free Trial

Every plan includes:
- 14-day free trial
- No credit card required
- Full access to all features
- Cancel anytime

### How to Upgrade

1. Go to **Settings** > **Billing**
2. Select your plan (Starter or Pro)
3. Choose monthly or annual billing
4. Enter payment details
5. You're upgraded instantly

### How to Downgrade

1. Go to **Settings** > **Billing**
2. Click **Change Plan**
3. Select the lower plan
4. Changes take effect at your next billing cycle

### How to Cancel

1. Go to **Settings** > **Billing**
2. Click **Cancel Subscription**
3. You'll retain access until the end of your billing period
4. Your data remains available if you resubscribe

### Payment Methods

We accept:
- All major credit cards (Visa, Mastercard, Amex)
- Debit cards
- Payments processed securely via Stripe

### Questions?

Contact us at support@site2crm.io for:
- Custom enterprise pricing
- Non-profit discounts
- Volume discounts
    `,
  },
  {
    slug: "appsumo-redemption",
    title: "Redeeming AppSumo Codes",
    description: "How to activate your AppSumo lifetime deal",
    category: "Billing",
    categorySlug: "billing",
    timeToRead: "1 min",
    content: `
## Redeeming AppSumo Codes

Activate your Site2CRM lifetime deal from AppSumo.

### Redemption Steps

1. **Create an account** at [site2crm.io/signup](/signup) (if you haven't already)
2. **Log in** to your dashboard
3. **Go to** [site2crm.io/app/appsumo](/app/appsumo)
4. **Enter** your AppSumo code
5. **Click** Redeem
6. Your lifetime deal is now active!

### AppSumo Plan Includes

- **1,000 leads per month**
- **2 active forms**
- **2 CRM integrations**
- **Lifetime access** - no recurring fees
- Email support

### Important Notes

- Codes can only be used once
- Codes are non-transferable
- The plan cannot be upgraded (it's already lifetime!)

### Troubleshooting

**"Invalid code" error**
- Make sure you're entering the code exactly as shown
- Check for extra spaces before/after the code

**"Code already used" error**
- Each code can only be redeemed once
- Check if you already redeemed it on another account

**Need help?**
- Email support@site2crm.io
- Include your AppSumo receipt for faster assistance
    `,
  },

  // Account
  {
    slug: "exporting-your-data",
    title: "Exporting Your Data",
    description: "Download all your data from Site2CRM",
    category: "Account",
    categorySlug: "account",
    timeToRead: "1 min",
    content: `
## Exporting Your Data

You own your data. Export it anytime.

### How to Export

1. Go to **Settings** > **Account**
2. Scroll to **Data Privacy**
3. Click **Export My Data**
4. A JSON file will download automatically

### What's Included

Your export contains:
- **Account information** - Your profile details
- **All leads** - Every lead captured through your forms
- **Form configurations** - Your form settings and fields
- **Integration settings** - CRM connection details (excluding sensitive tokens)

### File Format

Data is exported as JSON (JavaScript Object Notation):
- Machine-readable format
- Can be converted to CSV using free online tools
- Compatible with most data analysis software

### GDPR Compliance

This feature helps you comply with:
- **GDPR Article 20** - Right to data portability
- Your right to access your personal data
- Your right to transfer data to another service

### Tips

- Export your data regularly as a backup
- Export before canceling your subscription
- Export before deleting your account

### Need a Different Format?

Contact support@site2crm.io if you need:
- CSV export
- Specific data subsets
- Custom export format
    `,
  },
  {
    slug: "deleting-your-account",
    title: "Deleting Your Account",
    description: "Permanently remove your Site2CRM account and data",
    category: "Account",
    categorySlug: "account",
    timeToRead: "2 min",
    content: `
## Deleting Your Account

We're sorry to see you go. Here's how to delete your account.

### Before You Delete

Please consider:
1. **Export your data** first - [see how](/help/account/exporting-your-data)
2. **Cancel any active subscription** - to avoid final charges
3. **This is permanent** - deletion cannot be undone

### What Gets Deleted

When you delete your account, we permanently remove:
- Your user account and profile
- All leads and form submissions
- All forms and configurations
- Integration connections
- Team member access (if you're the owner)
- All associated data

### How to Delete

1. Go to **Settings** > **Account**
2. Scroll to **Data Privacy**
3. Click **Delete My Account**
4. Type "DELETE" to confirm
5. Click the final confirmation button

Your account and all data will be permanently deleted.

### GDPR Compliance

This feature helps you exercise your rights under:
- **GDPR Article 17** - Right to erasure ("right to be forgotten")
- Your right to have personal data deleted

### What If I Change My Mind?

- Once deleted, your account cannot be recovered
- You can create a new account anytime
- Your previous data will not be available

### Need Help Instead?

Before deleting, consider reaching out:
- Email support@site2crm.io
- We may be able to resolve your issue
- We'd love feedback on how we can improve
    `,
  },
];

// Helper functions
export function getArticleBySlug(categorySlug: string, articleSlug: string): Article | undefined {
  return KB_ARTICLES.find(
    (article) => article.categorySlug === categorySlug && article.slug === articleSlug
  );
}

export function getArticlesByCategory(categorySlug: string): Article[] {
  return KB_ARTICLES.filter((article) => article.categorySlug === categorySlug);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return KB_CATEGORIES.find((cat) => cat.slug === slug);
}

export function searchArticles(query: string): Article[] {
  const lowerQuery = query.toLowerCase();
  return KB_ARTICLES.filter(
    (article) =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.description.toLowerCase().includes(lowerQuery) ||
      article.content.toLowerCase().includes(lowerQuery)
  );
}
