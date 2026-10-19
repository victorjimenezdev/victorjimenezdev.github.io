import { personalProjects, workProjects } from './data/projects.js';
import { isPublicCampaign, isPublicContent } from './links.js';

export const GA_ID = 'G-B0GQS2GS37';
export const CONSENT_KEY = 'analytics-consent';
const ORIGIN = 'https://victorjimenezdev.github.io';
const instances = new WeakMap();
const projects = new Set([
  ...workProjects.map(({ id }) => id),
  ...personalProjects.map(({ id }) => id),
  'automation',
]);
const placements = new Set([
  'hero',
  'profile',
  'experience',
  'footer',
  'boss',
  'contact',
  'project_card',
  'galaxy',
  'featured_project',
]);
const linkTypes = new Set(['details', 'source', 'demo', 'reference']);
const channels = new Set(['email', 'linkedin', 'github']);
const cvPaths = new Set(['/Victor_Jimenez_CV.pdf', '/victorjimenezcv.pdf']);

/* Applications sent before 2026-10-15 used this format. Current share and
   application links pass the same checks as the builders in links.js.
   Anything else in the query or hash is dropped. */
const isLegacyApplication = (p) =>
  ['linkedin', 'get_on_board', 'company_careers'].includes(
    p.get('utm_source')
  ) &&
  p.get('utm_medium') === 'application' &&
  /^remote_jobs_20\d{2}_(0[1-9]|1[0-2])$/.test(p.get('utm_campaign') || '');

function keepsContent(params) {
  const content = params.get('utm_content');
  if (isLegacyApplication(params)) return ['portfolio', 'cv'].includes(content);
  return isPublicContent(params.get('utm_medium'), content);
}

export function safePageLocation(href) {
  const page = new URL(`${ORIGIN}/`);
  const params = new URL(href).searchParams;
  const approved =
    isLegacyApplication(params) ||
    isPublicCampaign({
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
    });
  if (approved) {
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
      page.searchParams.set(key, params.get(key));
    }
    if (keepsContent(params)) {
      page.searchParams.set('utm_content', params.get('utm_content'));
    }
  }
  return page.href;
}

export function safeReferrer(referrer) {
  try {
    const url = new URL(referrer);
    return ['https:', 'http:'].includes(url.protocol) ? url.origin : '';
  } catch {
    return '';
  }
}

export function clickPayload({
  event,
  placement,
  channel,
  projectSlug,
  linkType,
}) {
  if (!placements.has(placement)) return null;
  if (event === 'cv_download_click')
    return { name: event, parameters: { placement } };
  if (event === 'click_contact' && channels.has(channel)) {
    return {
      name: event,
      parameters: {
        placement,
        event_category: 'engagement',
        event_label: channel,
      },
    };
  }
  if (
    event === 'project_click' &&
    projects.has(projectSlug) &&
    linkTypes.has(linkType)
  ) {
    return {
      name: event,
      parameters: { placement, project_slug: projectSlug, link_type: linkType },
    };
  }
  if (event === 'click_agent_cta' && ['github', 'blog'].includes(channel)) {
    return {
      name: event,
      parameters: {
        placement,
        event_label: channel,
        event_category: 'engagement',
        project_slug: 'automation',
        link_type: channel === 'github' ? 'source' : 'reference',
      },
    };
  }
  return null;
}

function describeTarget(target, origin) {
  if (target.matches('.planet[data-sector]')) {
    return {
      event: 'project_click',
      placement: 'galaxy',
      projectSlug: target.dataset.sector,
      linkType: 'details',
    };
  }
  if (target.tagName !== 'A') return null;
  const url = new URL(target.getAttribute('href'), origin);
  if (url.origin === origin && cvPaths.has(url.pathname)) {
    const section = ['profile', 'experience'].find((id) =>
      target.closest(`#${id}`)
    );
    let placement = section;
    if (target.closest('.hero')) placement = 'hero';
    if (target.closest('.boss')) placement = 'boss';
    if (target.closest('footer')) placement = 'footer';
    return { event: 'cv_download_click', placement };
  }
  if (target.dataset.track === 'project_click') {
    return {
      event: 'project_click',
      placement: 'project_card',
      projectSlug: target.dataset.trackProject,
      linkType: target.dataset.trackType,
    };
  }
  const project = personalProjects.find(({ link }) => {
    const destination = new URL(link);
    return (
      destination.origin === url.origin && destination.pathname === url.pathname
    );
  });
  if (project) {
    return {
      event: 'project_click',
      placement: target.closest('#profile') ? 'profile' : 'project_card',
      projectSlug: project.id,
      linkType: 'source',
    };
  }
  return {
    event: target.dataset.track,
    placement: target.closest('#contact') ? 'contact' : 'featured_project',
    channel: target.dataset.trackLabel,
  };
}

export function createAnalytics({ win, doc }) {
  if (instances.has(doc)) return instances.get(doc);
  let consent = null;
  let started = false;
  const handledClicks = new WeakSet();
  const production = win.location.origin === ORIGIN;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(
    win.location.hostname
  );
  try {
    const stored = win.localStorage.getItem(CONSENT_KEY);
    if (['granted', 'denied'].includes(stored)) consent = stored;
  } catch {
    // The current page's explicit decision still works without storage.
  }

  const analytics = {
    get consent() {
      return consent;
    },
    setConsent(value) {
      consent = value === 'granted' ? 'granted' : 'denied';
      win[`ga-disable-${GA_ID}`] = consent !== 'granted';
      try {
        win.localStorage.setItem(CONSENT_KEY, consent);
      } catch {
        // Keep the current page's consent decision.
      }
    },
    load() {
      if (consent !== 'granted' || !production) return;
      win[`ga-disable-${GA_ID}`] = false;
      if (win.gtag) return;
      win.dataLayer = win.dataLayer || [];
      // Preserve Google's command-queue format from the existing tag adapter.
      win.gtag = function gtag() {
        win.dataLayer.push(arguments);
      };
      win.gtag('js', new Date());
      win.gtag('config', GA_ID, {
        anonymize_ip: true,
        page_location: safePageLocation(win.location.href),
        page_referrer: safeReferrer(doc.referrer),
      });
      const script = doc.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      doc.head.appendChild(script);
    },
    start() {
      if (started) return;
      started = true;
      doc.addEventListener('click', (click) => {
        if (
          consent !== 'granted' ||
          win[`ga-disable-${GA_ID}`] === true ||
          handledClicks.has(click)
        )
          return;
        const target = click.target?.closest?.('a, .planet[data-sector]');
        if (!target) return;
        try {
          const description = describeTarget(target, win.location.origin);
          const payload = description && clickPayload(description);
          if (!payload) return;
          if (production && typeof win.gtag !== 'function') return;
          if (!production && !local) return;
          handledClicks.add(click);
          if (production) {
            win.gtag('event', payload.name, payload.parameters);
          } else {
            doc.dispatchEvent(
              new win.CustomEvent('portfolio:analytics', { detail: payload })
            );
          }
        } catch {
          // Telemetry must not interrupt navigation or downloading.
        }
      });
    },
  };
  instances.set(doc, analytics);
  return analytics;
}
