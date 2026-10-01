export const workProjects = [
  {
    id: 'media',
    title: 'Media and publishing',
    description: 'Streaming, entertainment, news and editorial platforms.',
    projectCount: 8,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'education',
    title: 'Education and learning',
    description:
      'University websites, education services and learning platforms.',
    projectCount: 10,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'healthcare',
    title: 'Healthcare and research',
    description: 'Healthcare, research and public-health websites.',
    projectCount: 5,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'business',
    title: 'Commerce and business',
    description:
      'Commerce, product catalogs, business services and corporate platforms.',
    projectCount: 9,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'hospitality',
    title: 'Hospitality and travel',
    description: 'Hospitality, booking and travel information platforms.',
    projectCount: 4,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'finance',
    title: 'Financial services',
    description: 'Banking, financial services and assistance platforms.',
    projectCount: 4,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'public-interest',
    title: 'Public-interest platforms',
    description: 'Government, cultural, environmental and nonprofit websites.',
    projectCount: 10,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'property',
    title: 'Property and housing',
    description: 'Property management and housing websites.',
    projectCount: 2,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'legal',
    title: 'Legal and professional services',
    description:
      'Legal resources, professional services and software websites.',
    projectCount: 3,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'telecom',
    title: 'Telecommunications',
    description:
      'Payment, business services and customer self-service portals.',
    projectCount: 3,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
  {
    id: 'services',
    title: 'Consumer applications',
    description: 'Community and consumer service applications.',
    projectCount: 2,
    tags: ['Web platforms', 'Full-stack'],
    type: 'professional',
  },
];

export const professionalProjectCount = workProjects.reduce(
  (total, sector) => total + sector.projectCount,
  0
);

export const personalProjects = [
  {
    id: 'project-context-connector',
    title: 'Project Context Connector',
    description:
      'A Drupal module providing permission-controlled, read-only site snapshots for automation and CI/CD tools.',
    tags: ['Drupal', 'Security', 'Automation'],
    type: 'personal',
    link: 'https://github.com/victorjimenezdev/project_context_connector',
  },
  {
    id: 'project-context-connector-wp',
    title: 'Project Context Connector for WordPress',
    description:
      'A WordPress integration providing read-only site context for external tools and automation workflows.',
    tags: ['WordPress', 'Security', 'Automation'],
    type: 'personal',
    link: 'https://github.com/victorjimenezdev/project-context-connector-wp',
  },
];
