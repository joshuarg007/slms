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

// The 9 Sales Champions
export const DEMO_SALESPEOPLE: DemoSalesperson[] = [
  {
    id: -1, // Negative IDs for demo users
    display_name: "Glass Jaw Gary",
    email: "gary@demo.site2crm.com",
    avatar_color: "bg-blue-500",

    archetype: "The Rookie",
    title: "Junior Sales Rep",
    specialty: "calls",
    signatureMove: "The Beginner's Enthusiasm",

    philosophy: "Everyone starts somewhere. The only failure is not trying.",
    pareto_focus: "Learning from every rejection - each 'no' gets you closer to 'yes'",
    wisdom: [
      {
        quote: "I have not failed. I've just found 10,000 ways that won't work.",
        author: "Thomas Edison",
        context: "after_rejection"
      },
      {
        quote: "The master has failed more times than the beginner has tried.",
        author: "Stephen McCranie",
        context: "new_user"
      },
      {
        quote: "Start where you are. Use what you have. Do what you can.",
        author: "Arthur Ashe",
        context: "first_activity"
      }
    ],

    base_stats: {
      close_rate: 15,
      activity_volume: 85,
      deal_size: 20,
      speed: 30,
      consistency: 60
    },

    performance_ranges: {
      monthly_revenue: [8000, 15000],
      monthly_deals: [2, 5],
      monthly_calls: [180, 250],
      monthly_emails: [120, 180],
      monthly_meetings: [8, 15]
    },

    difficulty: 1,
    unlock_message: "You've taken your first step! Gary taught you that volume creates opportunity.",
    comeback_quote: "Hey, I'm still learning too! Let's grow together."
  },

  {
    id: -2,
    display_name: "Von Closer",
    email: "von@demo.site2crm.com",
    avatar_color: "bg-emerald-500",

    archetype: "The Methodical",
    title: "Sales Strategist",
    specialty: "meetings",
    signatureMove: "The Pareto Punch",

    philosophy: "Work smarter, not harder. 80% of results come from 20% of efforts.",
    pareto_focus: "Identifying and nurturing the top 20% of high-value prospects",
    wisdom: [
      {
        quote: "Don't major in minor things.",
        author: "Jim Rohn",
        context: "low_value_activity"
      },
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
      close_rate: 35,
      activity_volume: 50,
      deal_size: 60,
      speed: 55,
      consistency: 80
    },

    performance_ranges: {
      monthly_revenue: [25000, 40000],
      monthly_deals: [5, 8],
      monthly_calls: [80, 120],
      monthly_emails: [60, 100],
      monthly_meetings: [20, 30]
    },

    difficulty: 2,
    unlock_message: "You've learned the Pareto Principle! Focus on your vital few.",
    comeback_quote: "Smart work beats hard work. But together? Unstoppable."
  },

  {
    id: -3,
    display_name: "Piston Pipeline",
    email: "piston@demo.site2crm.com",
    avatar_color: "bg-orange-500",

    archetype: "The System Builder",
    title: "Pipeline Architect",
    specialty: "hybrid",
    signatureMove: "The Consistent Combo",

    philosophy: "Success is the sum of small efforts, repeated day in and day out.",
    pareto_focus: "Building repeatable processes that compound over time",
    wisdom: [
      {
        quote: "Success is nothing more than a few simple disciplines, practiced every day.",
        author: "Jim Rohn",
        context: "daily_activity"
      },
      {
        quote: "We are what we repeatedly do. Excellence is not an act, but a habit.",
        author: "Aristotle",
        context: "streak_milestone"
      },
      {
        quote: "The secret of your future is hidden in your daily routine.",
        author: "Mike Murdock",
        context: "morning"
      }
    ],

    base_stats: {
      close_rate: 28,
      activity_volume: 75,
      deal_size: 45,
      speed: 50,
      consistency: 95
    },

    performance_ranges: {
      monthly_revenue: [30000, 45000],
      monthly_deals: [7, 11],
      monthly_calls: [150, 200],
      monthly_emails: [100, 150],
      monthly_meetings: [15, 25]
    },

    difficulty: 2,
    unlock_message: "Consistency is your superpower! Your pipeline will never run dry.",
    comeback_quote: "One good day doesn't make you. One bad day doesn't break you. Keep showing up."
  },

  {
    id: -4,
    display_name: "Don Dealmaker",
    email: "don@demo.site2crm.com",
    avatar_color: "bg-purple-500",

    archetype: "The Relationship Builder",
    title: "Client Success Champion",
    specialty: "meetings",
    signatureMove: "The Trust Uppercut",

    philosophy: "People buy from people they trust. Build relationships, not transactions.",
    pareto_focus: "Deep relationships with key accounts that generate referrals",
    wisdom: [
      {
        quote: "People don't care how much you know until they know how much you care.",
        author: "Zig Ziglar",
        context: "new_lead"
      },
      {
        quote: "You can have everything in life you want, if you will just help other people get what they want.",
        author: "Zig Ziglar",
        context: "deal_won"
      },
      {
        quote: "The quality of your life is determined by the quality of your relationships.",
        author: "Tony Robbins",
        context: "relationship_milestone"
      }
    ],

    base_stats: {
      close_rate: 45,
      activity_volume: 40,
      deal_size: 70,
      speed: 35,
      consistency: 75
    },

    performance_ranges: {
      monthly_revenue: [45000, 65000],
      monthly_deals: [6, 9],
      monthly_calls: [60, 100],
      monthly_emails: [80, 120],
      monthly_meetings: [25, 35]
    },

    difficulty: 3,
    unlock_message: "Trust is your currency! Your relationships are your true wealth.",
    comeback_quote: "In sales, we're all family. Your success is my success."
  },

  {
    id: -5,
    display_name: "King Quota",
    email: "king@demo.site2crm.com",
    avatar_color: "bg-amber-500",

    archetype: "The Goal Setter",
    title: "Quota Crusher",
    specialty: "calls",
    signatureMove: "The Written Goal Slam",

    philosophy: "A goal properly set is halfway reached. Write it down, make it happen.",
    pareto_focus: "Crystal clear targets with reverse-engineered daily actions",
    wisdom: [
      {
        quote: "People with goals succeed because they know where they're going.",
        author: "Earl Nightingale",
        context: "goal_setting"
      },
      {
        quote: "A goal is a dream with a deadline.",
        author: "Napoleon Hill",
        context: "new_month"
      },
      {
        quote: "What you get by achieving your goals is not as important as what you become.",
        author: "Zig Ziglar",
        context: "goal_achieved"
      }
    ],

    base_stats: {
      close_rate: 38,
      activity_volume: 70,
      deal_size: 55,
      speed: 60,
      consistency: 85
    },

    performance_ranges: {
      monthly_revenue: [50000, 70000],
      monthly_deals: [10, 14],
      monthly_calls: [140, 180],
      monthly_emails: [90, 130],
      monthly_meetings: [18, 28]
    },

    difficulty: 3,
    unlock_message: "Goals achieved! You've learned that written goals become reality.",
    comeback_quote: "Missed quota this month? Set it again. Winners never quit setting goals."
  },

  {
    id: -6,
    display_name: "Great Targeter",
    email: "great@demo.site2crm.com",
    avatar_color: "bg-cyan-500",

    archetype: "The Precision Hunter",
    title: "Account Executive",
    specialty: "emails",
    signatureMove: "The Ideal Client Profile Strike",

    philosophy: "Chase quality, not quantity. Know exactly who needs what you offer.",
    pareto_focus: "Laser focus on ideal customer profile - perfect fit clients only",
    wisdom: [
      {
        quote: "The aim of marketing is to know and understand the customer so well the product sells itself.",
        author: "Peter Drucker",
        context: "lead_qualification"
      },
      {
        quote: "Don't find customers for your products, find products for your customers.",
        author: "Seth Godin",
        context: "discovery_call"
      },
      {
        quote: "Where focus goes, energy flows.",
        author: "Tony Robbins",
        context: "targeting"
      }
    ],

    base_stats: {
      close_rate: 52,
      activity_volume: 35,
      deal_size: 75,
      speed: 45,
      consistency: 70
    },

    performance_ranges: {
      monthly_revenue: [55000, 80000],
      monthly_deals: [7, 10],
      monthly_calls: [50, 80],
      monthly_emails: [70, 110],
      monthly_meetings: [20, 30]
    },

    difficulty: 4,
    unlock_message: "Precision pays! You've mastered the art of targeting the right prospects.",
    comeback_quote: "Quality over quantity - but you showed you can do both!"
  },

  {
    id: -7,
    display_name: "Bold Bill",
    email: "bold@demo.site2crm.com",
    avatar_color: "bg-red-500",

    archetype: "The Fearless Closer",
    title: "Senior Sales Executive",
    specialty: "calls",
    signatureMove: "The Ask For The Order",

    philosophy: "Fortune favors the bold. Always ask for the business.",
    pareto_focus: "Asking for the close at the right moment - never leaving it unasked",
    wisdom: [
      {
        quote: "Timid salespeople have skinny kids.",
        author: "Zig Ziglar",
        context: "hesitation"
      },
      {
        quote: "Every sale has five basic obstacles: no need, no money, no hurry, no desire, no trust.",
        author: "Zig Ziglar",
        context: "objection"
      },
      {
        quote: "The close is the natural conclusion of a well-run sales call.",
        author: "Brian Tracy",
        context: "closing"
      }
    ],

    base_stats: {
      close_rate: 48,
      activity_volume: 60,
      deal_size: 65,
      speed: 75,
      consistency: 65
    },

    performance_ranges: {
      monthly_revenue: [60000, 90000],
      monthly_deals: [12, 16],
      monthly_calls: [120, 160],
      monthly_emails: [80, 120],
      monthly_meetings: [22, 32]
    },

    difficulty: 4,
    unlock_message: "Boldness wins! You've learned that asking is the hardest and most rewarding skill.",
    comeback_quote: "We all miss sometimes. The bold ones just ask again."
  },

  {
    id: -8,
    display_name: "Soda Salesman Sam",
    email: "sam@demo.site2crm.com",
    avatar_color: "bg-pink-500",

    archetype: "The Energizer",
    title: "Sales Development Lead",
    specialty: "hybrid",
    signatureMove: "The Positive Persistence Play",

    philosophy: "Your attitude determines your altitude. Energy is contagious.",
    pareto_focus: "Maintaining peak energy for the 20% of calls that matter most",
    wisdom: [
      {
        quote: "Your attitude, not your aptitude, will determine your altitude.",
        author: "Zig Ziglar",
        context: "morning"
      },
      {
        quote: "People are not lazy. They simply have impotent goals.",
        author: "Tony Robbins",
        context: "low_motivation"
      },
      {
        quote: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
        context: "general"
      }
    ],

    base_stats: {
      close_rate: 42,
      activity_volume: 90,
      deal_size: 50,
      speed: 70,
      consistency: 80
    },

    performance_ranges: {
      monthly_revenue: [55000, 85000],
      monthly_deals: [14, 20],
      monthly_calls: [200, 280],
      monthly_emails: [150, 220],
      monthly_meetings: [25, 40]
    },

    difficulty: 4,
    unlock_message: "Energy wins! You've proven that enthusiasm is the ultimate sales skill.",
    comeback_quote: "Bad day? Tomorrow's a new start. Let's bring that energy!"
  },

  {
    id: -9,
    display_name: "Mr. Handshake",
    email: "handshake@demo.site2crm.com",
    avatar_color: "bg-indigo-600",

    archetype: "The Master",
    title: "VP of Sales",
    specialty: "meetings",
    signatureMove: "The Complete Package",

    philosophy: "Sales mastery is serving others at the highest level. Give first, receive always.",
    pareto_focus: "Everything - the 20% of all skills that create 80% of all results",
    wisdom: [
      {
        quote: "Approach each customer with the idea of helping them solve a problem or achieve a goal, not selling a product or service.",
        author: "Brian Tracy",
        context: "general"
      },
      {
        quote: "The more you lose yourself in something bigger than yourself, the more energy you will have.",
        author: "Norman Vincent Peale",
        context: "purpose"
      },
      {
        quote: "Success is not to be pursued; it is to be attracted by the person you become.",
        author: "Jim Rohn",
        context: "growth"
      }
    ],

    base_stats: {
      close_rate: 55,
      activity_volume: 65,
      deal_size: 85,
      speed: 60,
      consistency: 90
    },

    performance_ranges: {
      monthly_revenue: [100000, 150000],
      monthly_deals: [15, 22],
      monthly_calls: [100, 140],
      monthly_emails: [90, 130],
      monthly_meetings: [35, 50]
    },

    difficulty: 5,
    unlock_message: "YOU ARE THE CHAMPION! You've mastered all aspects of sales. Now teach others.",
    comeback_quote: "True masters never stop learning. Welcome to the top - now help lift others."
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
