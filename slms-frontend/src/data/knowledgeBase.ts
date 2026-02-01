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
    slug: "chat-widget",
    title: "Site2CRM AI",
    description: "Your CRM AI Connection - set up and customize your AI chat agent",
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
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

  // Site2CRM AI
  {
    slug: "what-is-chat-widget-pro",
    title: "What is Site2CRM AI?",
    description: "Learn about our AI-powered chat widget that captures leads 24/7",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "3 min",
    content: `
## What is Site2CRM AI?

Site2CRM AI is an AI-powered chat assistant that lives on your website and captures leads around the clock.

### How It's Different

Unlike basic chatbots that give up after one "no thanks," our AI is **persistent and goal-driven**:

- **Handles objections** - Tries multiple approaches before accepting rejection
- **Goal-focused** - Configured to achieve specific outcomes (capture email, book demo, etc.)
- **Natural conversations** - Feels like chatting with a helpful sales rep, not a robot
- **24/7 availability** - Never misses a lead, even at 3am

### Key Features

| Feature | Description |
|---------|-------------|
| **Multiple Goals** | Capture email, book demo, start trial, get quote, or support-only |
| **Persistence Levels** | Soft, medium, or aggressive objection handling |
| **Rebuttal Count** | Configure 1-10 attempts before giving up |
| **Industry Templates** | Pre-built configs for SaaS, Agency, E-commerce |
| **Full Branding** | Custom colors, headers, button sizes |
| **Quick Replies** | Suggested responses for faster engagement |
| **CRM Sync** | Captured leads sync instantly to your CRM |

### How It Works

1. Visitor lands on your website
2. Chat widget appears (customizable position and timing)
3. AI greets visitor and starts conversation
4. AI asks qualifying questions and handles objections
5. AI captures contact info based on your goal
6. Lead syncs to your CRM automatically

### Plan Limits

| Plan | Chat Agents | Conversations/mo | Pro Features |
|------|-------------|------------------|--------------|
| Starter | 1 | 100 | Basic widget |
| PRO | 3 | 1,000 | Full customization |
| Enterprise | Unlimited | Unlimited | Everything |

### Getting Started

Ready to set up your first AI chat agent?
1. [Create your first chat agent](/help/chat-widget/creating-chat-agent)
2. [Configure your goal](/help/chat-widget/configuring-goals)
3. [Embed on your website](/help/chat-widget/embedding-widget)
    `,
  },
  {
    slug: "creating-chat-agent",
    title: "Creating Your First Chat Agent",
    description: "Step-by-step guide to setting up an AI chat agent",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "3 min",
    content: `
## Creating Your First Chat Agent

Set up an AI-powered chat widget in under 5 minutes.

### Steps

1. **Log in** to your Site2CRM dashboard
2. **Click** "Chat Widget" in the sidebar
3. **Click** "Create Chat Agent"
4. **Fill in** the required information:
   - Business name
   - Business description
   - Services you offer
5. **Configure** your goal (see below)
6. **Customize** appearance (optional)
7. **Click** "Save"
8. **Copy** the embed code

### Required Information

**Business Name**
The name shown in the chat header. Usually your company name.

**Business Description**
A brief description of what your company does. The AI uses this to answer questions accurately.

*Example: "We're a marketing agency specializing in paid advertising for e-commerce brands. We help businesses scale from $10k to $100k+ monthly revenue."*

**Services**
List your main services or products. Be specific so the AI can discuss them intelligently.

*Example:*
- *Facebook & Instagram Ads management*
- *Google Ads campaigns*
- *Landing page optimization*
- *Conversion rate optimization*

### Using Templates

Don't want to start from scratch? Use a template:

1. Click "Use Template" at the top
2. Choose your industry (SaaS, Agency, E-commerce)
3. Template auto-fills business description, services, and recommended settings
4. Customize as needed

### Next Steps

After creating your agent:
1. [Configure your primary goal](/help/chat-widget/configuring-goals)
2. [Set persistence level](/help/chat-widget/persistence-settings)
3. [Customize appearance](/help/chat-widget/customizing-appearance)
4. [Embed on your site](/help/chat-widget/embedding-widget)
    `,
  },
  {
    slug: "configuring-goals",
    title: "Configuring Chat Goals",
    description: "Set up what your AI chat agent should achieve",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "4 min",
    content: `
## Configuring Chat Goals

Your chat agent's goal determines how it steers conversations and what it tries to achieve.

### Available Goals

| Goal | Best For | What AI Does |
|------|----------|--------------|
| **Capture Email** | General lead gen | Asks for email to send more info |
| **Book Demo** | SaaS, services | Pushes to schedule a demo/meeting |
| **Start Trial** | SaaS products | Encourages free trial signup |
| **Get Quote** | Services, agencies | Collects requirements for custom quote |
| **Capture Phone** | High-touch sales | Asks for phone number for callback |
| **Support Only** | Existing customers | Answers questions, no sales push |

### Setting Your Goal

1. Go to **Chat Widget** > select your agent
2. Find **Goal Configuration** section
3. Select your **Primary Goal**
4. Configure goal-specific settings (see below)
5. **Save** changes

### Goal-Specific Settings

**Book Demo**
- **Goal URL**: Link to your Calendly, Cal.com, or booking page
- AI will direct visitors to this link after qualifying them

**Start Trial**
- **Goal URL**: Link to your signup page
- AI emphasizes "free trial, no credit card required"

**Get Quote**
- No URL needed
- AI collects requirements (needs, timeline, budget range)
- Then asks for email to send quote

**Capture Phone**
- AI prioritizes getting phone number over email
- Good for businesses that convert better over phone

**Support Only**
- AI does NOT push for contact info
- Purely helpful, answers questions
- Only offers contact info if visitor specifically asks

### Custom CTA

Set a custom call-to-action that the AI uses when closing:

*Default: "Would you like more information?"*

*Custom examples:*
- "Want me to send you our case studies?"
- "Ready to see how we can help?"
- "Can I book you a quick 15-minute call?"

### Tips for Each Goal

**Capture Email (Default)**
- Keep it simple
- Works for most businesses
- Low friction for visitors

**Book Demo**
- Best when your product needs explanation
- Higher intent leads
- Requires calendar tool integration

**Start Trial**
- Best for self-serve SaaS
- AI handles objections about commitment
- Emphasizes risk-free trial

**Get Quote**
- Best for custom/variable pricing
- AI qualifies before asking for contact
- Collects useful context for sales team
    `,
  },
  {
    slug: "persistence-settings",
    title: "Persistence and Rebuttal Settings",
    description: "Configure how your AI handles objections and rejections",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "4 min",
    content: `
## Persistence and Rebuttal Settings

The key difference between Site2CRM AI and basic chatbots: **our AI doesn't give up easily.**

### Why Persistence Matters

Most website visitors say "no thanks" reflexively. A basic chatbot accepts this immediately. But studies show:
- 80% of sales require 5+ follow-ups
- Most reps give up after 1-2 attempts
- Persistent (but respectful) follow-up converts more leads

### Persistence Levels

| Level | Description | Best For |
|-------|-------------|----------|
| **Soft** | 1-3 gentle attempts, backs off quickly | Support, low-pressure brands |
| **Medium** | Up to 5 attempts, balanced approach | Most businesses (recommended) |
| **Aggressive** | Full attempts, multiple angles | High-value sales, limited-time offers |

### Setting Persistence Level

1. Go to **Chat Widget** > select your agent
2. Find **Behavior Settings** section
3. Choose **Persistence Level**
4. Adjust **Rebuttal Count** (1-10)
5. **Save** changes

### Rebuttal Count

This is the maximum number of times the AI will try to re-engage after an objection:

- **1-2**: Very light touch, accepts "no" quickly
- **3-5**: Balanced, tries different angles (recommended)
- **6-10**: Very persistent, for high-value conversions

### How Rebuttals Work

When a visitor says "no thanks," "not interested," or similar:

**Attempt 1**: Add value
*"Totally understand! Quick thing though - [benefit]. Would that be helpful?"*

**Attempt 2**: Reduce risk
*"I hear you! It's completely free to try. What email should I send the link to?"*

**Attempt 3**: Understand objection
*"Fair enough! What's specifically holding you back? I might be able to help."*

**Attempt 4**: Offer alternative
*"No problem! Would a quick 2-minute call work better?"*

**Attempt 5**: Final soft push
*"Totally respect that! How about a one-page overview for later? What email?"*

**After max attempts**: Accept gracefully
*"No worries at all! We're here whenever you're ready."*

### Tips

**Don't set rebuttal count too high**
- More than 7-8 can feel annoying
- Quality over quantity

**Match persistence to your brand**
- Luxury brands: softer approach
- Discount/deal brands: more aggressive OK
- Support contexts: always soft

**Test and iterate**
- Start with medium/5 rebuttals
- Check conversation logs
- Adjust based on feedback
    `,
  },
  {
    slug: "customizing-appearance",
    title: "Customizing Widget Appearance",
    description: "Brand your chat widget with custom colors, headers, and more",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "3 min",
    content: `
## Customizing Widget Appearance

Make your chat widget match your brand perfectly.

### Available Customizations

| Setting | Description | PRO Only |
|---------|-------------|----------|
| Primary Color | Main brand color for header and buttons | No |
| Position | Bottom-right or bottom-left | No |
| Button Size | Small, medium, or large | Yes |
| Header Title | Custom title in chat header | Yes |
| Header Subtitle | Tagline under the title | Yes |
| Chat Background | Background color of message area | Yes |
| User Bubble Color | Color of visitor's messages | Yes |
| Bot Bubble Color | Color of AI's messages | Yes |
| Show Branding | Show/hide "Powered by Site2CRM" | Yes |

### Basic Customization (All Plans)

1. Go to **Chat Widget** > select your agent
2. Find **Appearance** section
3. Set **Primary Color** (use your brand color)
4. Choose **Widget Position** (bottom-right recommended)
5. **Save** changes

### PRO Customization

With PRO plan, you can fully brand the widget:

**Header**
- **Header Title**: "Chat with Sales" or your company name
- **Header Subtitle**: "We reply instantly" or your tagline

**Colors**
- **Chat Background**: Light gray (#f9fafb) works well
- **User Bubble**: Usually your primary color
- **Bot Bubble**: White (#ffffff) for readability

**Button**
- **Small**: 48px - subtle, less intrusive
- **Medium**: 60px - balanced (default)
- **Large**: 72px - high visibility

**Branding**
- Toggle off "Show Branding" to remove "Powered by Site2CRM"

### Color Tips

**Primary Color**
- Use your main brand color
- Should contrast with white text
- Avoid very light colors

**Chat Background**
- Light colors work best
- Ensures message bubbles are readable
- #f9fafb (light gray) or #ffffff (white)

**Bubble Colors**
- User bubble: Brand color or darker shade
- Bot bubble: White or very light gray
- Ensure text is readable on both

### Position

**Bottom-right** (recommended)
- Standard convention
- Most users expect chat here
- Works well on most layouts

**Bottom-left**
- Use if you have conflicting elements on right
- Less common but still works
    `,
  },
  {
    slug: "quick-replies",
    title: "Setting Up Quick Replies",
    description: "Add suggested response buttons for faster engagement",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "2 min",
    content: `
## Setting Up Quick Replies

Quick replies are suggested response buttons that help visitors engage faster.

### What Are Quick Replies?

Quick reply buttons appear below the AI's greeting message. When clicked, they automatically send that message, starting the conversation.

*Example quick replies:*
- "Tell me about pricing"
- "I need help with my account"
- "Book a demo"
- "What services do you offer?"

### Why Use Quick Replies?

- **Reduce friction** - One click vs. typing
- **Guide conversations** - Steer toward high-value topics
- **Faster engagement** - Visitors act immediately
- **Mobile-friendly** - Easier than typing on phone

### Setting Up Quick Replies

1. Go to **Chat Widget** > select your agent
2. Find **Quick Replies** section
3. Add up to 4 quick reply options
4. **Save** changes

### Best Practices

**Keep them short**
- 2-5 words each
- "Get pricing" not "I would like information about your pricing"

**Make them action-oriented**
- "Book a demo" ✓
- "Demo information" ✗

**Cover common intents**
- Pricing/cost questions
- Product/service info
- Support requests
- Scheduling/booking

**Match your goal**
- If goal is "Book Demo": Include "Book a demo" button
- If goal is "Get Quote": Include "Get a quote" button

### Example Configurations

**SaaS Product**
- "See pricing"
- "Start free trial"
- "Book a demo"
- "Talk to sales"

**Agency/Services**
- "See our work"
- "Get a quote"
- "Book a call"
- "Ask a question"

**E-commerce**
- "Track my order"
- "Shipping info"
- "Returns policy"
- "Talk to support"

### Notes

- Quick replies disappear after the first message
- They're optional - widget works fine without them
- Test on mobile to ensure they fit
    `,
  },
  {
    slug: "industry-templates",
    title: "Using Industry Templates",
    description: "Get started fast with pre-built configurations",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "2 min",
    content: `
## Using Industry Templates

Templates give you a pre-configured starting point based on your industry.

### Available Templates

**SaaS Template**
- Goal: Start trial
- Tone: Professional
- Focus: Product features, free trial, no commitment
- Quick replies: "See pricing", "Start trial", "Book demo"

**Agency Template**
- Goal: Book demo
- Tone: Friendly
- Focus: Portfolio, process, scheduling calls
- Quick replies: "See our work", "Get quote", "Book call"

**E-commerce Template**
- Goal: Capture email
- Tone: Casual
- Focus: Products, shipping, support
- Quick replies: "Track order", "Shipping info", "Returns"

### Using a Template

1. Go to **Chat Widget**
2. Click **Create Chat Agent**
3. Click **Use Template** at the top
4. Select your industry
5. Review pre-filled settings
6. Customize as needed
7. Add your specific business info
8. **Save**

### What Templates Include

Each template pre-configures:
- Business description (placeholder to customize)
- Services list (placeholder to customize)
- Primary goal
- Tone
- Persistence level
- Suggested quick replies
- Recommended colors

### Customizing After Template

Templates are just starting points. You should:

1. **Replace** placeholder business description with your own
2. **Update** services list with your actual offerings
3. **Adjust** goal if needed for your specific case
4. **Modify** quick replies to match your terminology
5. **Change** colors to match your brand

### When NOT to Use Templates

Skip templates if:
- Your business doesn't fit the categories
- You have very specific requirements
- You prefer full control from the start

You can always start blank and configure everything manually.
    `,
  },
  {
    slug: "embedding-widget",
    title: "Embedding the Chat Widget",
    description: "Add your AI chat agent to any website",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "3 min",
    content: `
## Embedding the Chat Widget

Add your AI chat agent to your website with one line of code.

### Getting Your Embed Code

1. Go to **Chat Widget** > select your agent
2. Click the **Embed** tab
3. Copy the embed code

### Basic Embed Code

\`\`\`html
<script
  src="https://api.site2crm.io/api/public/chat-widget/widget.js"
  data-widget-key="YOUR_WIDGET_KEY"
  async>
</script>
\`\`\`

### Where to Add It

Add the code just before the closing \`</body>\` tag on your website.

**WordPress**
- Go to Appearance > Theme Editor > footer.php
- Or use a plugin like "Insert Headers and Footers"

**Webflow**
- Go to Project Settings > Custom Code > Footer Code

**Squarespace**
- Go to Settings > Advanced > Code Injection > Footer

**Wix**
- Go to Settings > Custom Code > Add Code to Body (end)

**Shopify**
- Go to Online Store > Themes > Edit Code > theme.liquid (before </body>)

**HTML Site**
- Add before the closing \`</body>\` tag

### Excluding Pages

You may not want the chat widget on every page. Use the \`data-exclude-paths\` attribute:

\`\`\`html
<script
  src="https://api.site2crm.io/api/public/chat-widget/widget.js"
  data-widget-key="YOUR_WIDGET_KEY"
  data-exclude-paths="/login,/signup,/checkout,/admin/*"
  async>
</script>
\`\`\`

**Pattern examples:**
- \`/login\` - Exact match for /login page
- \`/admin/*\` - Wildcard matches /admin/anything
- \`/app/*,/dashboard/*\` - Multiple patterns (comma-separated)

### Hiding for Logged-In Users

If you want to hide the widget for authenticated users on your platform:

**Option 1: JavaScript**
\`\`\`javascript
// When user logs in
localStorage.setItem('site2crm_hide_chat', 'true');

// When user logs out
localStorage.removeItem('site2crm_hide_chat');
\`\`\`

**Option 2: Cookie**
\`\`\`javascript
// When user logs in
document.cookie = 'site2crm_hide_chat=true; path=/';

// When user logs out
document.cookie = 'site2crm_hide_chat=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
\`\`\`

The widget checks for both localStorage and cookies.

### Testing Your Embed

1. Add the code to your website
2. Clear your browser cache
3. Visit your website
4. Chat bubble should appear
5. Click to open and test a conversation
6. Check that leads appear in your dashboard

### Troubleshooting

**Widget not appearing?**
- Check browser console for errors
- Verify the widget key is correct
- Make sure the script isn't blocked by ad blockers
- Check you're not on an excluded path

**Widget appearing where it shouldn't?**
- Add the path to \`data-exclude-paths\`
- Set localStorage flag for authenticated users
    `,
  },
  {
    slug: "data-collection",
    title: "Data Collection Settings",
    description: "Configure what information your AI collects from visitors",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "2 min",
    content: `
## Data Collection Settings

Configure what information your AI chat agent collects from visitors.

### Available Fields

| Field | Default | Description |
|-------|---------|-------------|
| **Email** | Always | Always collected (except Support Only goal) |
| **Name** | On | Visitor's name |
| **Phone** | Off | Phone number |
| **Company** | Off | Company/organization name |

### Configuring Collection

1. Go to **Chat Widget** > select your agent
2. Find **Data Collection** section
3. Toggle fields on/off
4. **Save** changes

### How Collection Works

The AI asks for information naturally during conversation, not all at once:

*"That sounds like a great project! I'd love to send you some examples. What's your name?"*

*"Great to meet you, Sarah! What's the best email for the case studies?"*

*"And just so our team has context - what company are you with?"*

### Best Practices

**Only collect what you need**
- More fields = more friction
- Email alone converts best
- Add fields only if your sales process requires them

**When to collect phone**
- High-touch sales (real estate, financial services)
- Callback-based business model
- B2B with phone-heavy sales process

**When to collect company**
- B2B sales
- Enterprise products
- Account-based marketing

**When to skip name**
- High-volume, low-touch sales
- When email alone is sufficient
- Privacy-conscious audiences

### Data Storage

Collected data is:
- Stored securely in your Site2CRM account
- Synced to your connected CRM automatically
- Available in your Leads dashboard
- Included in conversation history

### Privacy Compliance

For GDPR/privacy compliance:
- Only collect necessary data
- Mention data usage in your privacy policy
- Enable cookie consent if required in your region
- Users can request data deletion via your account settings
    `,
  },
  {
    slug: "custom-messages",
    title: "Custom Welcome and Success Messages",
    description: "Personalize your AI's greeting and post-capture messages",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "2 min",
    content: `
## Custom Welcome and Success Messages

Personalize how your AI greets visitors and what it says after capturing their info.

### Welcome Message

The welcome message appears when a visitor first opens the chat widget.

**Default:** Based on your business name and description

**Custom example:**
*"Hey there! I'm the AI assistant for Acme Agency. Whether you're curious about our services or ready to get started, I'm here to help. What brings you by today?"*

### Setting Welcome Message

1. Go to **Chat Widget** > select your agent
2. Find **Custom Messages** section
3. Enter your **Welcome Message**
4. **Save** changes

### Welcome Message Tips

- Keep it conversational, not robotic
- 1-3 sentences max
- End with a question to encourage response
- Match your brand's tone
- Don't be too salesy upfront

**Good examples:**
- "Hi! I'm here to help you find the right solution. What are you working on?"
- "Welcome! Got questions about [product]? I'm happy to help."
- "Hey! Looking for [service]? Let's chat about what you need."

**Avoid:**
- "WELCOME TO OUR WEBSITE! BUY NOW!"
- Generic corporate speak
- Walls of text

### Success Message

The success message appears after the AI successfully captures contact information.

**Default:** "Perfect, you'll hear from us within 24 hours!"

**Custom example:**
*"Awesome, Sarah! I've got your info. Our team will send those case studies within the hour. In the meantime, feel free to check out our portfolio at acme.com/work. Anything else I can help with?"*

### Setting Success Message

1. Go to **Chat Widget** > select your agent
2. Find **Custom Messages** section
3. Enter your **Success Message**
4. **Save** changes

### Success Message Tips

- Confirm what happens next
- Set expectations (timeline)
- Optionally include a link (calendar, resource, etc.)
- Keep the door open for more questions
- Make them feel good about their decision

**Include in success message:**
- Confirmation they'll be contacted
- Expected timeline
- Optional: link to resource, calendar, or next step
- Optional: offer to help with anything else
    `,
  },
  {
    slug: "ai-behavior",
    title: "Understanding AI Behavior",
    description: "How your AI chat agent handles conversations",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "4 min",
    content: `
## Understanding AI Behavior

Learn how your AI chat agent thinks and responds.

### Conversation Flow

**Early conversation:**
- AI is curious about visitor's needs
- Asks simple follow-up questions
- Builds rapport before asking for contact info

**After buying signals:**
- AI moves to close (asks for contact info)
- Uses your configured CTA
- Handles objections based on persistence settings

**Buying signals the AI recognizes:**
- Asks about pricing/cost
- Asks about timeline
- Asks "can you do X?"
- Describes their project in detail
- Asks about next steps

### Objection Handling

When a visitor says "no thanks," "not interested," etc.:

The AI does NOT immediately give up. Based on your persistence settings, it:

1. **Acknowledges** their response respectfully
2. **Adds value** with a new angle or benefit
3. **Asks again** in a different way
4. **Repeats** until max rebuttal count reached
5. **Accepts gracefully** and offers contact email

**Example conversation:**

> **Visitor:** "No thanks, just browsing"
>
> **AI:** "Totally get it! Quick thing though - we actually have a free tool that analyzes your current setup. Takes 30 seconds. Want me to send the link?"
>
> **Visitor:** "Not right now"
>
> **AI:** "No problem! What specifically brought you to our site today? Maybe I can point you in the right direction."

### Tone Options

| Tone | Description | Best For |
|------|-------------|----------|
| **Friendly** | Warm, approachable, like a helpful colleague | Most businesses |
| **Professional** | Polished, courteous, businesslike | Enterprise, B2B, finance |
| **Casual** | Relaxed, conversational, like texting a friend | D2C, younger audiences |

### What AI Won't Do

The AI is trained to avoid:
- Quoting specific prices (unless configured)
- Making promises about timelines
- Discussing competitors negatively
- Sharing confidential information
- Being pushy after max rebuttals
- Anything in your "Restrictions" field

### Restrictions Field

Use this to tell the AI what NOT to do:

*Examples:*
- "Never discuss pricing. Always direct to sales team."
- "Don't mention competitor products."
- "Don't make guarantees about delivery times."
- "Don't discuss features that are coming soon."

### When AI Says "I Don't Know"

If asked something outside its knowledge:

*"That's a great question! I'd need to connect you with our team for specifics on that. What's the best email to have someone reach out?"*

This is intentional - better to escalate than give wrong information.

### Improving AI Responses

If the AI isn't performing as expected:

1. **Check business description** - Is it detailed enough?
2. **Check services list** - Does it cover what visitors ask about?
3. **Add extra context** - Use the Additional Context field
4. **Adjust tone** - Try a different tone setting
5. **Review conversations** - See what's working/not working
    `,
  },
  {
    slug: "viewing-conversations",
    title: "Viewing Chat Conversations",
    description: "Monitor and review your AI chat conversations",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "2 min",
    content: `
## Viewing Chat Conversations

Monitor your AI's performance by reviewing conversation history.

### Accessing Conversations

1. Go to **Chat Widget** in your dashboard
2. Click **Conversations** tab
3. Browse or search conversations

### Conversation List

Each conversation shows:
- **Date/time** started
- **Visitor info** (if captured)
- **Status** (lead captured, in progress, closed)
- **Message count**
- **Page URL** where conversation started

### Conversation Detail

Click a conversation to see:
- Full message history
- Captured contact information
- Lead data (email, name, phone, company)
- Timestamp for each message

### Filtering Conversations

Filter by:
- **Date range** - Last 7 days, 30 days, custom
- **Status** - Lead captured, no capture, in progress
- **Has email** - Only show captured leads

### What to Look For

**Successful patterns:**
- How did the AI close?
- What objections did visitors raise?
- How many messages before capture?

**Areas to improve:**
- Where do visitors drop off?
- What questions stump the AI?
- Are objection responses working?

### Using Insights

Based on conversation review:

1. **Update business description** if AI lacks knowledge
2. **Adjust persistence** if it's too soft/aggressive
3. **Add to restrictions** if AI says something wrong
4. **Modify CTA** if close rate is low
5. **Update quick replies** based on common questions

### Privacy Note

Conversation data is:
- Only visible to your organization
- Not shared with other Site2CRM customers
- Deletable upon request
- Subject to your data retention policies
    `,
  },
  {
    slug: "troubleshooting-chat-widget",
    title: "Chat Widget Troubleshooting",
    description: "Fix common issues with your AI chat widget",
    category: "Site2CRM AI",
    categorySlug: "chat-widget",
    timeToRead: "3 min",
    content: `
## Chat Widget Troubleshooting

Solutions for common chat widget issues.

### Widget Not Appearing

**Check the embed code**
- Verify widget key is correct
- Ensure script is before \`</body>\`
- Check for typos in the code

**Check excluded paths**
- Review \`data-exclude-paths\` attribute
- Make sure current page isn't excluded

**Check browser console**
- Open Developer Tools (F12)
- Look for errors in Console tab
- Common: 404 (wrong key), CORS errors

**Check ad blockers**
- Some ad blockers block chat widgets
- Test in incognito mode
- Whitelist your site

### Widget Not Responding

**Check your plan limits**
- Verify you haven't hit conversation limit
- Check dashboard for usage stats

**Check API status**
- Visit https://stats.uptimerobot.com/lXaVgFmahF
- If API is down, widget won't respond

**Try refreshing**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)

### AI Giving Wrong Answers

**Update business description**
- Add more detail about your offerings
- Be specific about what you do/don't do

**Add restrictions**
- Tell AI what NOT to say
- "Never mention X" or "Don't discuss Y"

**Check extra context**
- Add FAQs or common questions/answers
- Include product details AI should know

### AI Too Soft / Giving Up Too Easily

**Increase persistence level**
- Change from "soft" to "medium" or "aggressive"

**Increase rebuttal count**
- Try 5-7 instead of default

**Check conversation logs**
- See exactly where AI gives up
- Verify settings are applied

### AI Too Aggressive

**Decrease persistence level**
- Change from "aggressive" to "medium" or "soft"

**Decrease rebuttal count**
- Try 2-3 for gentler approach

**Adjust tone**
- "Professional" is less pushy than "Casual"

### Leads Not Syncing to CRM

**Check CRM connection**
- Go to Integrations
- Verify status shows "Connected"
- Try disconnecting and reconnecting

**Check field mapping**
- Ensure captured fields map to CRM fields
- Verify CRM fields exist

**Submit test lead**
- Have a test conversation
- Provide test email
- Check CRM for the record

### Styling Issues

**Widget overlapping content**
- Try changing position (bottom-left vs bottom-right)
- Check for CSS conflicts on your site

**Colors not applying**
- Save and refresh your site
- Clear browser cache
- Verify color codes are valid (#RRGGBB format)

### Still Having Issues?

Contact support@site2crm.io with:
- Your widget key
- Screenshot of the issue
- Browser console errors (if any)
- Steps to reproduce
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
