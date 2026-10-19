# Portfolio click measurement

Tracking requires analytics consent. Unknown or denied consent produces no custom event. Revocation stops calls even if the tag is already loaded. Regrant counts new interactions without replaying earlier clicks.

## Events

| Event               | Interaction                                             | Parameters                                                     |
| ------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| `cv_download_click` | Activate a CV link                                      | `placement`: hero, profile, experience or boss                 |
| `project_click`     | Inspect a sector or activate a project source/demo link | `placement`, `project_slug`, `link_type`                       |
| `click_contact`     | Activate email, LinkedIn or GitHub contact link         | `placement`, reused `event_label`: email, linkedin or github   |
| `click_agent_cta`   | Activate featured repository/profile or reference blog  | `placement`, reused `event_label`, `project_slug`, `link_type` |

All values come from finite placements, channel/action labels and known public project slugs. No custom payload includes link text, names, email addresses, phone numbers, filenames, arbitrary URLs or query strings. Page location keeps only the approved generic UTM values below; referrers retain only an HTTP(S) origin, without paths, credentials, queries or fragments.

A CV click records intent to download, not completed delivery. Email activation does not prove a sent message. GitHub and LinkedIn clicks do not identify recruiters. This code cannot observe actions on third-party job boards, infer submitted applications or identify which employer visited.

One delegated listener handles nested targets. Reinitialization does not add listeners. Each distinct activation is counted; the same click event is not handled twice. The code never emits enhanced-measurement `click` or `file_download` events manually.

Existing personal source links in the profile and generated cards are recognized. Sector buttons record `details`. There are currently no project-demo links. A future demo link can use `data-track="project_click"`, `data-track-project="project-context-connector"` and `data-track-type="demo"`; the slug and action must remain allowlisted. Do not label a job-board URL or unrelated link as a project demo.

## Local acceptance

The production Google tag loads only on the exact portfolio origin after consent. Loopback previews emit `portfolio:analytics` DOM events instead; other preview hosts collect nothing. This keeps development out of the production property.

Run `npm run build`, start `npm run preview -- --host 127.0.0.1 --port 4338 --strictPort`, then run `npm run test:analytics:browser`. The browser test is restricted to loopback, blocks Google collection endpoints as a fail-safe, and checks payloads and network isolation. Its evidence is in the ignored `evidence/analytics` directory.

## Publication and account review

Implementation approval does not publish these changes or change Analytics settings. Before publishing, approve this coordinated plan for property 524965668, web stream 13620824928, measurement ID G-B0GQS2GS37:

1. Disable enhanced-measurement **outbound clicks**, **file downloads** and **site search**. The first two collect raw link URLs and download filenames and would overlap these semantic events. Automatic site search can collect arbitrary search-query values even though this portfolio has no site-search feature. Leave page views and scroll measurement in place. Do not deploy the custom tracking while retaining these options without reviewing the overlap and privacy risk.
2. Register event-scoped custom dimensions for `placement`, `project_slug`, `link_type` and the reused `event_label`. Event counts require no new dimension, but these fields need registration for standard reporting.
3. Optionally mark `cv_download_click` and `click_contact` as key events for intent. Keep contact channels separate in analysis; a LinkedIn or GitHub profile click is not a message or lead. No account-generated duplicate event is needed.
4. Publish the reviewed branch and verify consent-denied behavior and one deliberate test interaction separately from normal campaign traffic. Record its time so it is not treated as employer activity.

The current automatic options remain unchanged until that review. Custom-payload tests do not establish that Google's independently configured automatic collection has stopped. Existing event history remains available; do not sum old automatic and new semantic counts as if they were unique visitors.

## Campaign links

Build new shared portfolio and blog links with `src/links.js`. Do not write query strings by hand. The builders and `safePageLocation` use the same checks, so a link a builder accepts keeps its tags in analytics. A builder throws an error for any other medium or for a value that is not a slug.

| Link                             | `utm_source`  | `utm_medium`                                 | `utm_campaign` | `utm_content`                        |
| -------------------------------- | ------------- | -------------------------------------------- | -------------- | ------------------------------------ |
| Job application, from 2026-10-15 | employer slug | `job_application`                            | `remote_jobs`  | `<platform>_<public-job-id-or-role>` |
| Portfolio to blog                | `portfolio`   | `referral`                                   | `cross-site`   | placement, for example `writing`     |
| Blog to portfolio                | `agent-blog`  | `referral`                                   | `cross-site`   | placement, for example `navbar`      |
| LinkedIn blog comment            | `linkedin`    | `social`                                     | `agent-blog`   | post slug                            |
| Other shared links               | channel slug  | `social`, `referral`, `email` or `messaging` | campaign slug  | placement or post slug               |

Values are public lowercase ASCII slugs, at most 100 characters, with hyphens or underscores between parts. The checks refuse emails, spaces, dots and other characters. They check syntax only: they cannot detect a person's name inside an otherwise valid slug, so never put one there. The public job ID or role slug in an application link is allowed. Record recruiter names and application dates in the private ledger, not in the link.

Copy-ready usage:

```js
import {
  BLOG_URL,
  PORTFOLIO_URL,
  applicationUrl,
  blogReferralUrl,
  campaignUrl,
} from './src/links.js';

applicationUrl({ employer: 'acme', platform: 'linkedin', jobId: '4012345678' });
// https://victorjimenezdev.github.io/?utm_source=acme&utm_medium=job_application&utm_campaign=remote_jobs&utm_content=linkedin_4012345678

blogReferralUrl(`${BLOG_URL}harness-engineering`, 'writing');
// https://victorstack-ai.github.io/agent-blog/harness-engineering?utm_source=portfolio&utm_medium=referral&utm_campaign=cross-site&utm_content=writing

campaignUrl(PORTFOLIO_URL, {
  source: 'newsletter',
  medium: 'email',
  campaign: 'monthly-digest',
  content: 'portfolio-link',
});
// https://victorjimenezdev.github.io/?utm_source=newsletter&utm_medium=email&utm_campaign=monthly-digest&utm_content=portfolio-link
```

Use the existing readable path of the destination, such as `/agent-blog/harness-engineering`. Do not tag same-site navigation, assets, citations, or canonical, Open Graph, schema and feed URLs.

Earlier links stay valid. Applications sent before 2026-10-15 used `utm_source` linkedin, get_on_board or company_careers, `utm_medium=application`, `utm_campaign=remote_jobs_YYYY_MM` and `utm_content` portfolio or cv. Submitted applications in the current format keep their exact job ID, including mixed case. Do not rewrite submitted applications or published posts. Existing traffic cannot be attributed after the fact, and visitors who deny consent remain unmeasured. This section changes no Analytics account setting; the account review above still applies.

Sources: [Google enhanced measurement](https://support.google.com/analytics/answer/9216061), [custom event parameters](https://developers.google.com/analytics/devguides/collection/ga4/event-parameters) and [the existing Google tag queue format](https://developers.google.com/tag-platform/gtagjs).
