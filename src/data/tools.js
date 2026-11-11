/* Tool inspector readouts. Every sentence is quoted from copy that is
   already on the page (core expertise cards and career bullets), so the
   inspector connects a tool to existing evidence and never adds a claim. */

const SOURCES = {
  engineering: {
    from: 'Core expertise: Web product engineering',
    text: 'Frontend and backend development with React, Next.js, PHP, Node.js and Python. Maintainable applications and API-driven interfaces.',
  },
  performance: {
    from: 'Core expertise: Performance',
    text: 'Profiling, caching and cloud delivery with Redis, Varnish and CDNs. I investigate bottlenecks and improve Core Web Vitals.',
  },
  accessibility: {
    from: 'Core expertise: Accessibility',
    text: 'WCAG AA audits and remediation: semantic structure, correct ARIA, and keyboard paths that actually work.',
  },
  architecture: {
    from: 'Core expertise: Architecture & integrations',
    text: 'API design and integration with GraphQL and REST. Decoupled interfaces, migrations, payment systems, CRM and authentication.',
  },
  delivery: {
    from: 'Core expertise: CI/CD & release engineering',
    text: 'Repeatable builds and deployments, static analysis and browser verification. I support cloud releases and investigate regressions.',
  },
  ai: {
    from: 'Core expertise: AI-assisted delivery',
    text: 'I build automation for requirements analysis, environment setup, browser verification and release monitoring, with review and validation before delivery.',
  },
  security: {
    from: 'Core expertise: Security',
    text: 'Security audits and remediation, OAuth and SSO integrations, permission-controlled APIs and review of access boundaries.',
  },
  seo: {
    from: 'Core expertise: Technical SEO',
    text: 'Crawlable pages, search metadata, structured data and performance checks. I connect discoverability with web engineering.',
  },
  platforms: {
    from: 'Experience: Web Tech Lead Developer',
    text: 'Drupal platforms for financial content, streaming-service marketing sites and microsites, and hotel booking. WordPress modules, themes and integrations.',
  },
  decoupled: {
    from: 'Experience: Web Tech Lead Developer',
    text: 'Decoupled React and Next.js interfaces with GraphQL and REST APIs.',
  },
  republishing: {
    from: 'Experience: Web Tech Lead Developer',
    text: 'Bulk republishing, publishing job monitoring and Drush automation. Drupal upgrades, security remediation and S3/CDN media and sitemap delivery.',
  },
  remediation: {
    from: 'Experience: Web Tech Lead Developer',
    text: 'Performance profiling, technical SEO, security and accessibility remediation.',
  },
  pipelines: {
    from: 'Experience: Web Tech Lead Developer',
    text: 'CI/CD, static analysis, cloud hosting and workflow automation. DDEV PHPUnit commands and GitHub Actions checks for a Drupal demo.',
  },
  migrations: {
    from: 'Experience: Earlier experience',
    text: 'Built database-driven applications and led legacy platform migrations.',
  },
  cloud: {
    from: 'Experience: Earlier experience',
    text: 'Automated deployments and supported cloud infrastructure.',
  },
  mentoring: {
    from: 'Experience: Earlier experience',
    text: 'Mentored developers and guided technical planning and code reviews.',
  },
};

/* Tree default, then per-tool overrides where a sentence names the tool. */
const TREE_SOURCE = {
  engineering: 'engineering',
  delivery: 'delivery',
  performance: 'performance',
  security: 'security',
  architecture: 'architecture',
  platforms: 'platforms',
};

const TOOL_SOURCE = {
  'Next.js': 'decoupled',
  GraphQL: 'decoupled',
  'REST APIs': 'decoupled',
  GitHub: 'pipelines',
  'Browser extensions': 'ai',
  'Technical SEO': 'seo',
  'Semantic interfaces': 'accessibility',
  'Keyboard navigation': 'accessibility',
  WCAG: 'accessibility',
  Remediation: 'remediation',
  Migrations: 'migrations',
  'AWS EC2': 'cloud',
  S3: 'republishing',
  RDS: 'cloud',
  Lambda: 'cloud',
  CloudFront: 'republishing',
  SQS: 'cloud',
  'Technical planning': 'mentoring',
  'Code reviews': 'mentoring',
  Mentorship: 'mentoring',
  'Drupal 7-11': 'republishing',
  Drush: 'republishing',
  Pantheon: 'pipelines',
  Acquia: 'pipelines',
  'WP Engine': 'pipelines',
};

/** @returns {{from: string, text: string}} */
export function toolEvidence(treeId, tool) {
  return SOURCES[TOOL_SOURCE[tool] || TREE_SOURCE[treeId] || 'engineering'];
}
