// src/data/demoSalespeople.ts
// The Sales Champions - 9 demo salespeople inspired by the greats
// Punch-Out!! meets Brian Tracy, Jim Rohn, and Zig Ziglar

export interface SalesWisdom {
  quote: string;
  author: string;
  context: string; // When to show this wisdom
}

export interface DemoSalesperson {
  id: number;
  display_name: string;
  email: string;
  avatar_color: string;

  // Character Info
  archetype: string;
  title: string;
  specialty: "calls" | "emails" | "meetings" | "hybrid";
  signatureMove: string;

  // Philosophy
  philosophy: string;
  pareto_focus: string; // What 20% they focus on
  wisdom: SalesWisdom[];

  // Stats (representing their "fighting style")
  base_stats: {
    close_rate: number;      // 0-100
    activity_volume: number; // 0-100
    deal_size: number;       // 0-100
    speed: number;           // 0-100 (days to close)
    consistency: number;     // 0-100
  };

  // Performance data (will be randomized within ranges)
  performance_ranges: {
    monthly_revenue: [number, number];
    monthly_deals: [number, number];
    monthly_calls: [number, number];
    monthly_emails: [number, number];
    monthly_meetings: [number, number];
  };

  // Gamification
  difficulty: 1 | 2 | 3 | 4 | 5; // 1 = easiest to beat, 5 = final boss
  unlock_message: string; // Message when you beat them

  // For underdog celebration
  comeback_quote: string;
}

// 3 Professional Test Salespeople
export const DEMO_SALESPEOPLE: DemoSalesperson[] = [
  {
    id: -1,
    display_name: "Sarah Mitchell",
    email: "sarah.mitchell@demo.site2crm.com",
    avatar_color: "bg-blue-500",

    archetype: "The Strategist",
    title: "Senior Account Executive",
    specialty: "meetings",
    signatureMove: "The Discovery Deep-Dive",

    philosophy: "Understand first, sell second. The best deals come from genuine problem-solving.",
    pareto_focus: "High-value enterprise accounts with complex needs",
    wisdom: [
      {
        quote: "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
        author: "Stephen Covey",
        context: "planning"
      },
      {
        quote: "Efficiency is doing things right; effectiveness is doing the right things.",
        author: "Peter Drucker",
        context: "activity_review"
      }
    ],

    base_stats: {
      close_rate: 42,
      activity_volume: 55,
      deal_size: 75,
      speed: 50,
      consistency: 85
    },

    performance_ranges: {
      monthly_revenue: [45000, 70000],
      monthly_deals: [6, 10],
      monthly_calls: [80, 120],
      monthly_emails: [90, 140],
      monthly_meetings: [22, 35]
    },

    difficulty: 3,
    unlock_message: "Strategic selling wins! You've mastered the art of discovery.",
    comeback_quote: "Every conversation is an opportunity to learn something new."
  },

  {
    id: -2,
    display_name: "James Chen",
    email: "james.chen@demo.site2crm.com",
    avatar_color: "bg-emerald-500",

    archetype: "The Closer",
    title: "Sales Manager",
    specialty: "calls",
    signatureMove: "The Confident Ask",

    philosophy: "Fortune favors the prepared. Do the work, then ask for the business.",
    pareto_focus: "Pipeline velocity and deal acceleration",
    wisdom: [
      {
        quote: "Success is nothing more than a few simple disciplines, practiced every day.",
        author: "Jim Rohn",
        context: "daily_activity"
      },
      {
        quote: "The close is the natural conclusion of a well-run sales call.",
        author: "Brian Tracy",
        context: "closing"
      }
    ],

    base_stats: {
      close_rate: 48,
      activity_volume: 70,
      deal_size: 60,
      speed: 75,
      consistency: 80
    },

    performance_ranges: {
      monthly_revenue: [55000, 85000],
      monthly_deals: [10, 16],
      monthly_calls: [120, 180],
      monthly_emails: [80, 120],
      monthly_meetings: [18, 28]
    },

    difficulty: 4,
    unlock_message: "Closing is an art! You've learned that confidence comes from preparation.",
    comeback_quote: "Every 'no' brings you closer to the next 'yes'."
  },

  {
    id: -3,
    display_name: "Emily Rodriguez",
    email: "emily.rodriguez@demo.site2crm.com",
    avatar_color: "bg-purple-500",

    archetype: "The Relationship Builder",
    title: "VP of Sales",
    specialty: "hybrid",
    signatureMove: "The Trust Framework",

    philosophy: "Build relationships, not transactions. Long-term partnerships drive sustainable growth.",
    pareto_focus: "Key account expansion and referral networks",
    wisdom: [
      {
        quote: "People don't care how much you know until they know how much you care.",
        author: "Zig Ziglar",
        context: "new_lead"
      },
      {
        quote: "Success is not to be pursued; it is to be attracted by the person you become.",
        author: "Jim Rohn",
        context: "growth"
      }
    ],

    base_stats: {
      close_rate: 52,
      activity_volume: 60,
      deal_size: 85,
      speed: 55,
      consistency: 90
    },

    performance_ranges: {
      monthly_revenue: [80000, 120000],
      monthly_deals: [12, 18],
      monthly_calls: [90, 130],
      monthly_emails: [100, 150],
      monthly_meetings: [30, 45]
    },

    difficulty: 5,
    unlock_message: "Relationships are everything! You've built a network that drives results.",
    comeback_quote: "True success is lifting others as you climb."
  }
];

// Gamification tooltips organized by context
export const SALES_WISDOM_TOOLTIPS: Record<string, SalesWisdom[]> = {
  dashboard: [
    { quote: "The first hour is the rudder of the day.", author: "Henry Ward Beecher", context: "dashboard" },
    { quote: "Every morning brings new potential.", author: "Jim Rohn", context: "dashboard" },
  ],
  leads: [
    { quote: "Every lead is someone's solution waiting to happen.", author: "Sales Wisdom", context: "leads" },
    { quote: "Your pipeline is your lifeline.", author: "Sales Wisdom", context: "leads" },
  ],
  activities: [
    { quote: "Activity breeds results. Results breed confidence. Confidence breeds more activity.", author: "Sales Wisdom", context: "activities" },
    { quote: "Log it or lose it - your future self will thank you.", author: "Sales Wisdom", context: "activities" },
  ],
  analytics: [
    { quote: "Numbers don't lie, but they do reveal opportunities.", author: "Sales Wisdom", context: "analytics" },
    { quote: "What gets measured gets managed.", author: "Peter Drucker", context: "analytics" },
  ],
  leaderboard: [
    { quote: "Competition makes us faster. Collaboration makes us better.", author: "Fyrefly", context: "leaderboard" },
    { quote: "The goal isn't to beat others - it's to beat yesterday's you.", author: "Sales Wisdom", context: "leaderboard" },
  ],
  improvement: [
    { quote: "The comeback is always stronger than the setback.", author: "Sales Wisdom", context: "improvement" },
    { quote: "You're not behind - you're just getting started.", author: "Sales Wisdom", context: "improvement" },
  ],
  underdog: [
    { quote: "Everyone loves an underdog story. This is yours.", author: "Sales Wisdom", context: "underdog" },
    { quote: "They counted you out. Prove them wrong.", author: "Sales Wisdom", context: "underdog" },
    { quote: "From the bottom, the only way is up. Start climbing.", author: "Sales Wisdom", context: "underdog" },
  ],
  family: [
    { quote: "Sales is a team sport. We win together.", author: "Sales Wisdom", context: "family" },
    { quote: "Lift others up - success isn't a limited resource.", author: "Sales Wisdom", context: "family" },
    { quote: "The best salespeople make everyone around them better.", author: "Sales Wisdom", context: "family" },
  ]
};

// Generate random performance data for a demo salesperson
export function generateDemoPerformance(person: DemoSalesperson, seed?: number) {
  let seedValue = seed ?? 12345;
  const random = seed !== undefined
    ? () => {
        const x = Math.sin(seedValue++) * 10000;
        return x - Math.floor(x);
      }
    : Math.random;

  const randomInRange = (min: number, max: number) =>
    Math.floor(min + random() * (max - min));

  const ranges = person.performance_ranges;

  return {
    user_id: person.id,
    display_name: person.display_name,
    email: person.email,
    avatar_color: person.avatar_color,
    total_leads: randomInRange(50, 150),
    won_leads: randomInRange(ranges.monthly_deals[0], ranges.monthly_deals[1]),
    lost_leads: randomInRange(5, 20),
    in_pipeline: randomInRange(20, 60),
    close_rate: person.base_stats.close_rate + randomInRange(-5, 5),
    total_revenue: randomInRange(ranges.monthly_revenue[0], ranges.monthly_revenue[1]),
    avg_deal_size: randomInRange(3000, 8000),
    quota: randomInRange(40000, 80000),
    quota_attainment: randomInRange(80, 130),
    calls_count: randomInRange(ranges.monthly_calls[0], ranges.monthly_calls[1]),
    emails_count: randomInRange(ranges.monthly_emails[0], ranges.monthly_emails[1]),
    meetings_count: randomInRange(ranges.monthly_meetings[0], ranges.monthly_meetings[1]),
    total_activities: 0, // Will be calculated
    activities_per_lead: randomInRange(3, 8),
    avg_days_to_close: randomInRange(14, 45),
  };
}

// Get a random wisdom quote for a context
export function getWisdomForContext(context: string): SalesWisdom | null {
  const wisdoms = SALES_WISDOM_TOOLTIPS[context];
  if (!wisdoms || wisdoms.length === 0) return null;
  return wisdoms[Math.floor(Math.random() * wisdoms.length)];
}

// Get all wisdom from a specific salesperson
export function getSalespersonWisdom(personId: number): SalesWisdom[] {
  const person = DEMO_SALESPEOPLE.find(p => p.id === personId);
  return person?.wisdom || [];
}

// Check if user ID is a demo salesperson
export function isDemoSalesperson(userId: number): boolean {
  return userId < 0;
}

// Get demo salesperson by ID
export function getDemoSalesperson(userId: number): DemoSalesperson | undefined {
  return DEMO_SALESPEOPLE.find(p => p.id === userId);
}
