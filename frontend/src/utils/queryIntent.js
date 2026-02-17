// Intent types for query categorization
export const INTENT_TYPES = {
  PERFORMANCE_TOP: 'PERFORMANCE_TOP',
  PERFORMANCE_LOW: 'PERFORMANCE_LOW',
  REGIONAL: 'REGIONAL',
  CONVERSION: 'CONVERSION',
  BUCKET_ANALYSIS: 'BUCKET_ANALYSIS',
  AGENT_ANALYSIS: 'AGENT_ANALYSIS',
  TREND_ANALYSIS: 'TREND_ANALYSIS',
  COMPARISON: 'COMPARISON',
  AGGREGATE: 'AGGREGATE',
  SEARCH: 'SEARCH',
  GENERIC: 'GENERIC',
};

// Pattern definitions for intent detection
const PATTERNS = {
  [INTENT_TYPES.PERFORMANCE_TOP]: {
    phrases: [
      'top agents',
      'best performers',
      'highest collection',
      'star performers',
      'leading agents',
      'best agents',
      'top performers',
      'highest conversion',
    ],
    keywords: ['top', 'best', 'highest', 'leading', 'star', 'excellent', 'outstanding'],
    weight: 2,
  },

  [INTENT_TYPES.PERFORMANCE_LOW]: {
    phrases: [
      'lowest performing',
      'worst performing',
      'underperforming',
      'poor performance',
      'low collection',
      'bottom performers',
      'weakest agents',
    ],
    keywords: ['lowest', 'worst', 'poor', 'underperforming', 'weak', 'bottom', 'struggling'],
    weight: 2,
  },

  [INTENT_TYPES.REGIONAL]: {
    phrases: [
      'by region',
      'by state',
      'state wise',
      'regional performance',
      'state performance',
      'geographic',
      'location wise',
      'area wise',
    ],
    keywords: ['region', 'state', 'geography', 'location', 'area', 'north', 'south', 'east', 'west', 'ut'],
    weight: 2,
  },

  [INTENT_TYPES.CONVERSION]: {
    phrases: [
      'conversion rate',
      'success rate',
      'conversion performance',
      'conversion by',
    ],
    keywords: ['conversion', 'rate', 'success'],
    weight: 2,
  },

  [INTENT_TYPES.BUCKET_ANALYSIS]: {
    phrases: [
      'by bucket',
      'by band',
      'bucket wise',
      'band wise',
      'pos band',
      'dpd bucket',
      'bucket performance',
    ],
    keywords: ['bucket', 'band', 'pos', 'dpd', 'segment'],
    weight: 2,
  },

  [INTENT_TYPES.AGENT_ANALYSIS]: {
    phrases: [
      'agent performance',
      'agent wise',
      'by agent',
      'collector performance',
      'team performance',
    ],
    keywords: ['agent', 'collector', 'team', 'individual'],
    weight: 2,
  },

  [INTENT_TYPES.TREND_ANALYSIS]: {
    phrases: [
      'over time',
      'trend analysis',
      'historical data',
      'time series',
      'monthly trend',
      'daily trend',
    ],
    keywords: ['trend', 'timeline', 'history', 'historical', 'over', 'monthly', 'daily', 'weekly'],
    weight: 2,
  },

  [INTENT_TYPES.COMPARISON]: {
    phrases: [
      'compare',
      'comparison between',
      'versus',
      'vs',
      'difference between',
    ],
    keywords: ['compare', 'comparison', 'versus', 'vs', 'difference', 'against'],
    weight: 2,
  },

  [INTENT_TYPES.AGGREGATE]: {
    phrases: [
      'total collection',
      'total aum',
      'overall performance',
      'sum of',
      'average',
    ],
    keywords: ['total', 'sum', 'average', 'overall', 'aggregate', 'combined'],
    weight: 1,
  },

  [INTENT_TYPES.SEARCH]: {
    phrases: [
      'find',
      'show me',
      'get',
      'list',
      'display',
    ],
    keywords: ['find', 'show', 'get', 'list', 'display', 'search'],
    weight: 1,
  },
};

// Loading messages for each intent type
export const LOADING_MESSAGES = {
  [INTENT_TYPES.PERFORMANCE_TOP]: [
    '🏆 Finding your star performers...',
    '⭐ Identifying top achievers...',
    '🎯 Spotting excellence in action...',
  ],

  [INTENT_TYPES.PERFORMANCE_LOW]: [
    '🔍 Identifying areas for improvement...',
    '📉 Analyzing underperforming metrics...',
    '💡 Finding growth opportunities...',
  ],

  [INTENT_TYPES.REGIONAL]: [
    '🗺️ Mapping regional performance...',
    '🌍 Analyzing geographic patterns...',
    '📍 Breaking down location data...',
  ],

  [INTENT_TYPES.CONVERSION]: [
    '📊 Analyzing conversion patterns...',
    '💹 Calculating success metrics...',
    '🎯 Measuring conversion rates...',
  ],

  [INTENT_TYPES.BUCKET_ANALYSIS]: [
    '📦 Segmenting data by buckets...',
    '📊 Analyzing bucket performance...',
    '🎯 Breaking down by segments...',
  ],

  [INTENT_TYPES.AGENT_ANALYSIS]: [
    '👥 Analyzing agent performance...',
    '🔍 Evaluating team metrics...',
    '📈 Tracking individual results...',
  ],

  [INTENT_TYPES.TREND_ANALYSIS]: [
    '📈 Identifying trends over time...',
    '⏱️ Analyzing temporal patterns...',
    '📅 Tracking historical data...',
  ],

  [INTENT_TYPES.COMPARISON]: [
    '⚖️ Comparing metrics...',
    '🔄 Analyzing differences...',
    '📊 Running comparison analysis...',
  ],

  [INTENT_TYPES.AGGREGATE]: [
    '🧮 Calculating totals...',
    '📊 Aggregating portfolio data...',
    '💯 Computing overall metrics...',
  ],

  [INTENT_TYPES.SEARCH]: [
    '🔎 Searching through data...',
    '🔍 Finding matching records...',
    '📋 Retrieving results...',
  ],

  [INTENT_TYPES.GENERIC]: [
    '🤖 AI is analyzing your query...',
    '✨ Processing your request...',
    '💭 Thinking through your question...',
  ],
};

/**
 * Detects the intent of a user query based on pattern matching
 * @param {string} queryText - The user's query
 * @returns {string} - The detected intent type
 */
export function detectQueryIntent(queryText) {
  if (!queryText || typeof queryText !== 'string') {
    return INTENT_TYPES.GENERIC;
  }

  const normalized = queryText.toLowerCase().trim();

  if (normalized.length < 3) {
    return INTENT_TYPES.GENERIC;
  }

  const scores = {};

  // Initialize scores
  Object.keys(INTENT_TYPES).forEach(key => {
    scores[INTENT_TYPES[key]] = 0;
  });

  // Score each intent based on pattern matching
  Object.keys(PATTERNS).forEach(intent => {
    const pattern = PATTERNS[intent];

    // Check phrase patterns (higher weight)
    pattern.phrases.forEach(phrase => {
      if (normalized.includes(phrase)) {
        scores[intent] += pattern.weight * 2;
      }
    });

    // Check keyword patterns
    pattern.keywords.forEach(keyword => {
      if (normalized.includes(keyword)) {
        scores[intent] += pattern.weight;
      }
    });
  });

  // Find the intent with the highest score
  let maxScore = 0;
  let detectedIntent = INTENT_TYPES.GENERIC;

  Object.keys(scores).forEach(intent => {
    if (scores[intent] > maxScore) {
      maxScore = scores[intent];
      detectedIntent = intent;
    }
  });

  // If no strong match, return GENERIC
  if (maxScore === 0) {
    return INTENT_TYPES.GENERIC;
  }

  return detectedIntent;
}

/**
 * Gets loading messages for a specific intent
 * @param {string} intent - The intent type
 * @returns {Array<string>} - Array of loading messages
 */
export function getLoadingMessages(intent) {
  return LOADING_MESSAGES[intent] || LOADING_MESSAGES[INTENT_TYPES.GENERIC];
}
