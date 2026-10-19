/* Campaign links for portfolio and blog URLs shared outside their own site.
   Each part is a public lowercase ASCII slug with hyphens between words;
   underscores only join parts (for example `linkedin_4012345678`). Never put
   personal identifiers in these values. Same-site navigation and canonical,
   Open Graph, schema and feed URLs stay untagged. */
export const PORTFOLIO_URL = 'https://victorjimenezdev.github.io/';
export const BLOG_URL = 'https://victorstack-ai.github.io/agent-blog/';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALUE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
// Submitted application links keep their exact public job IDs, which can mix case.
const SUBMITTED_CONTENT = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;
const MAX_LENGTH = 100;
export const SHARE_MEDIUMS = ['social', 'referral', 'email', 'messaging'];
const APPLICATION = { medium: 'job_application', campaign: 'remote_jobs' };

export function isSlug(value) {
  return typeof value === 'string' && value.length <= 64 && SLUG.test(value);
}

const valid = (value, pattern = VALUE) =>
  typeof value === 'string' &&
  value.length <= MAX_LENGTH &&
  pattern.test(value);

/* True when source, medium and campaign form an approved public campaign:
   a share medium, or the exact job application format. This checks syntax
   only; it cannot tell whether a valid slug contains a name. */
export function isPublicCampaign({ source, medium, campaign }) {
  if (!valid(source) || !valid(campaign)) return false;
  if (medium === APPLICATION.medium) return campaign === APPLICATION.campaign;
  return SHARE_MEDIUMS.includes(medium);
}

/* Content the sanitizer keeps for an approved campaign. */
export function isPublicContent(medium, content) {
  return valid(
    content,
    medium === APPLICATION.medium ? SUBMITTED_CONTENT : VALUE
  );
}

export function campaignUrl(
  destination,
  { source, medium, campaign, content }
) {
  const url = new URL(destination);
  const values = {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
  };
  for (const [key, value] of Object.entries(values)) {
    if (!valid(value)) {
      throw new Error(`${key} must be a public lowercase slug`);
    }
  }
  if (!isPublicCampaign({ source, medium, campaign })) {
    throw new Error(
      `utm_medium must be one of ${SHARE_MEDIUMS.join(', ')}, or ${APPLICATION.medium} with utm_campaign ${APPLICATION.campaign}`
    );
  }
  for (const [key, value] of Object.entries(values)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

/* Portfolio URL for a future job application. `jobId` is the public job ID,
   or the role slug when the posting has no public ID. */
export function applicationUrl({ employer, platform, jobId }) {
  for (const value of [employer, platform, jobId]) {
    if (!isSlug(value)) throw new Error('application values must be slugs');
  }
  return campaignUrl(PORTFOLIO_URL, {
    source: employer,
    medium: 'job_application',
    campaign: 'remote_jobs',
    content: `${platform}_${jobId}`,
  });
}

/* Portfolio link to the blog. `placement` names where the link sits. */
export function blogReferralUrl(destination, placement) {
  return campaignUrl(destination, {
    source: 'portfolio',
    medium: 'referral',
    campaign: 'cross-site',
    content: placement,
  });
}
