import { onRequestGet as getAuthMe } from '../functions/api/auth/me';
import { onRequestPost as login } from '../functions/api/auth/login';
import { onRequestPost as logout } from '../functions/api/auth/logout';
import { onRequestPost as register } from '../functions/api/auth/register';
import { onRequestGet as verifyEmail } from '../functions/api/auth/verify';
import { onRequestPost as forgotPassword } from '../functions/api/auth/password/forgot';
import { onRequestPost as resetPassword } from '../functions/api/auth/password/reset';
import { onRequestGet as startGoogleAuth } from '../functions/api/auth/google/start';
import { onRequestGet as completeGoogleAuth } from '../functions/api/auth/google/callback';
import { onRequestPost as validateOrganizationInvite } from '../functions/api/auth/invites/validate';
import { onRequestGet as listCourses } from '../functions/api/courses/index';
import { onRequestGet as getCourseProgress } from '../functions/api/courses/[courseId]/progress';
import { onRequestGet as getCourseAccess } from '../functions/api/courses/[courseId]/access';
import { onRequestPut as saveProgress } from '../functions/api/progress';
import { onRequestGet as getLab } from '../functions/api/labs/[labId]';
import { onRequestPost as createLabSession } from '../functions/api/labs/[labId]/sessions';
import { onRequestPost as runLabCommand } from '../functions/api/labs/sessions/[sessionId]/commands';
import { onRequestPost as resetLabSession } from '../functions/api/labs/sessions/[sessionId]/reset';
import { onRequestPost as createDonationCheckout } from '../functions/api/donations/checkout';
import { onRequestGet as getDonationCheckout } from '../functions/api/donations/session';
import { onRequestPost as receiveDonationWebhook } from '../functions/api/donations/webhook';
import { onRequestPost as receiveResendWebhook } from '../functions/api/webhooks/resend';
import { onRequestPost as sendContactMessage } from '../functions/api/contact';
import { onRequestPost as recordCourseEngagement } from '../functions/api/analytics/course-engagement';
import { onRequestPost as recordPageView } from '../functions/api/activity/page-view';
import { onRequestGet as listJobs } from '../functions/api/jobs/index';
import { onRequestGet as getJob } from '../functions/api/jobs/[slug]';
import { onRequestGet as listJobBookmarks } from '../functions/api/jobs/bookmarks';
import { onRequestPut as saveJobBookmark, onRequestDelete as removeJobBookmark } from '../functions/api/jobs/[slug]/bookmark';
import { onRequestGet as listJobSources, onRequestPost as createJobSource } from '../functions/api/admin/job-sources/index';
import { onRequestPatch as updateJobSource } from '../functions/api/admin/job-sources/[sourceId]';
import { onRequestPost as syncJobSource } from '../functions/api/admin/job-sources/[sourceId]/sync';
import { onRequestPost as reviewJob } from '../functions/api/admin/jobs/[jobId]/review';
import { onRequestGet as listAdminJobs } from '../functions/api/admin/jobs/index';
import { onRequestGet as getAdminJob } from '../functions/api/admin/jobs/[jobId]';
import { onRequestGet as listKnowledgeGraphCandidates } from '../functions/api/admin/knowledge-graph/index';
import { onRequestGet as previewKnowledgeGraph } from '../functions/api/admin/knowledge-graph/preview';
import { onRequestPost as refreshKnowledgeGraph } from '../functions/api/admin/knowledge-graph/refresh';
import { onRequestPost as reviewKnowledgeGraphCandidate } from '../functions/api/admin/knowledge-graph/candidates/[candidateId]/review';
import { onRequestGet as getProfile, onRequestPut as updateProfile } from '../functions/api/profile/index';
import { onRequestPut as updateProfilePassword } from '../functions/api/profile/password';
import { onRequestPut as updateProfileAvatar } from '../functions/api/profile/avatar';
import { onRequestGet as getAccountOverview } from '../functions/api/account/overview';
import { onRequestGet as listCreatorCourses, onRequestPost as createCreatorCourse } from '../functions/api/creator/courses/index';
import { onRequestPut as updateCreatorCourse } from '../functions/api/creator/courses/[courseId]';
import { onRequestPost as submitCreatorCourse } from '../functions/api/creator/courses/[courseId]/submit';
import { onRequestPost as reviewCreatorCourse } from '../functions/api/admin/creator-courses/[courseId]/review';
import { onRequestGet as listResumes, onRequestPost as createResume } from '../functions/api/resumes/index';
import { onRequestGet as getResume, onRequestPut as saveResume, onRequestDelete as deleteResume, onRequestPost as generateResume } from '../functions/api/resumes/[resumeId]';
import { onRequestGet as listResumeBookmarkedJobs } from '../functions/api/resumes/[resumeId]/bookmarked-jobs';
import { onRequestPost as parseResume } from '../functions/api/resumes/[resumeId]/parse';
import { onRequestDelete as deleteResumeSource } from '../functions/api/resumes/[resumeId]/sources/[sourceId]';
import { onRequestPost as reparseResumeSource } from '../functions/api/resumes/[resumeId]/sources/[sourceId]/reparse';
import { onRequestPost as recordResumeExport } from '../functions/api/resumes/export';
import { onRequestGet as getAdminOverview } from '../functions/api/admin/overview';
import { onRequestGet as listAdminUsers } from '../functions/api/admin/users/index';
import { onRequestGet as getAdminUser, onRequestPatch as updateAdminUser } from '../functions/api/admin/users/[userId]';
import { onRequestGet as getAdminUserActivity } from '../functions/api/admin/users/[userId]/activity';
import { onRequestGet as getSystemCourseAnalytics } from '../functions/api/admin/courses/system';
import { onRequestGet as getCommunityCourseAnalytics } from '../functions/api/admin/courses/community';
import { onRequestPatch as updateCommunityCourse } from '../functions/api/admin/courses/community/[courseId]';
import { onRequestGet as listOrganizations, onRequestPost as createOrganization } from '../functions/api/admin/organizations/index';
import { onRequestGet as getOrganization, onRequestPatch as updateOrganization } from '../functions/api/admin/organizations/[organizationId]';
import { onRequestGet as getMyOrganization } from '../functions/api/admin/my-organization';
import { onRequestGet as listOrganizationMembers, onRequestPost as addOrganizationMember, onRequestDelete as removeOrganizationMember } from '../functions/api/admin/organizations/[organizationId]/members';
import { onRequestPut as setOrganizationLeader } from '../functions/api/admin/organizations/[organizationId]/leader';
import { onRequestGet as listOrganizationInvites, onRequestPost as createOrganizationInvite } from '../functions/api/admin/organizations/[organizationId]/invites';
import { onRequestPatch as updateOrganizationInvite } from '../functions/api/admin/organizations/[organizationId]/invites/[inviteId]';
import { onRequestGet as listOrganizationMessages, onRequestPost as sendOrganizationMessage } from '../functions/api/admin/organizations/[organizationId]/messages';
import { onRequestGet as listOrganizationAudit } from '../functions/api/admin/organizations/[organizationId]/audit';
import { onRequestGet as listOrganizationContent } from '../functions/api/admin/organizations/[organizationId]/content';
import { onRequestPost as sendAdminEmailTest } from '../functions/api/admin/email/test';
import { inspectDueJobUrls, reindexCurrentJobSkillEvidence, runDueSourceSync, runInitialSourceSync, runPendingJobPresentationRefresh } from '../functions/_lib/jobs';
import { enqueuePublishedCourseKnowledge, runKnowledgeGraphRefresh } from '../functions/_lib/knowledgeGraph';
import { runPendingJobVectorIndex } from '../functions/_lib/jobVectors';
import { runEmailLifecycleCampaigns } from '../functions/_lib/emailCampaigns';
import { resendWebhookPath } from '../functions/_lib/email';
import { getRouteBootstrapHtml, getRouteMetadata, type RouteMetadata } from './lib/routeMetadata';
import { canonicalPublicPathname } from './lib/localeRoutes';

type Params = Record<string, string | undefined>;

// Pages Functions are invoked through a Worker adapter. The handler's own
// generic route params vary per endpoint, so the adapter accepts that context
// as `any` while constructing the complete runtime subset used by each handler.
type ApiHandler = (context: any) => Response | Promise<Response>;

function createCspNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function documentContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    "object-src 'none'",
    `script-src 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic' https: http:`,
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "font-src 'self' data: https:",
    "frame-src https:",
    "base-uri 'none'",
    "form-action 'self' https:",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function escapeHtmlAttribute(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character);
}

function routeSeoHead(metadata: RouteMetadata, nonce: string) {
  const alternates = metadata.alternates.map((alternate) => (
    `<link rel="alternate" hreflang="${escapeHtmlAttribute(alternate.hreflang)}" href="${escapeHtmlAttribute(alternate.href)}" data-studyainow-alternate="true">`
  )).join('');
  const structuredData = JSON.stringify(metadata.structuredData).replace(/</g, '\\u003c');
  return `${alternates}<script id="studyainow-route-structured-data" type="application/ld+json" nonce="${nonce}">${structuredData}</script>`;
}

async function assetResponse(request: Request, env: Env) {
  const requestUrl = new URL(request.url);
  const canonicalPathname = canonicalPublicPathname(requestUrl.pathname);
  if (canonicalPathname && (request.method === 'GET' || request.method === 'HEAD')) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = canonicalPathname;
    return new Response(null, {
      status: 301,
      headers: {
        location: redirectUrl.toString(),
        'cache-control': 'public, max-age=3600',
      },
    });
  }

  const response = await env.ASSETS.fetch(request);
  if (!response.headers.get('content-type')?.toLowerCase().includes('text/html')) return response;

  const pathname = requestUrl.pathname;
  const routeMetadata = getRouteMetadata(pathname);
  const bootstrapHtml = getRouteBootstrapHtml(pathname);
  const nonce = createCspNonce();
  const headers = new Headers(response.headers);
  headers.set('content-security-policy', documentContentSecurityPolicy(nonce));
  headers.set('cache-control', 'public, max-age=0, must-revalidate');
  headers.set('x-robots-tag', routeMetadata.robots);
  const htmlResponse = new Response(request.method === 'HEAD' ? null : response.body, {
    status: routeMetadata.isKnownRoute ? response.status : 404,
    statusText: routeMetadata.isKnownRoute ? response.statusText : 'Not Found',
    headers,
  });

  if (request.method === 'HEAD') return htmlResponse;

  return new HTMLRewriter()
    .on('html', {
      element(element) {
        element.setAttribute('lang', routeMetadata.language);
      },
    })
    .on('head', {
      element(element) {
        element.append(routeSeoHead(routeMetadata, nonce), { html: true });
      },
    })
    .on('title', {
      element(element) {
        element.setInnerContent(routeMetadata.title);
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute('content', routeMetadata.description);
      },
    })
    .on('meta[name="robots"]', {
      element(element) {
        element.setAttribute('content', routeMetadata.robots);
      },
    })
    .on('link[rel="canonical"]', {
      element(element) {
        element.setAttribute('href', routeMetadata.canonical);
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute('content', routeMetadata.title);
      },
    })
    .on('meta[property="og:description"]', {
      element(element) {
        element.setAttribute('content', routeMetadata.description);
      },
    })
    .on('meta[property="og:url"]', {
      element(element) {
        element.setAttribute('content', routeMetadata.canonical);
      },
    })
    .on('meta[property="og:locale"]', {
      element(element) {
        element.setAttribute('content', routeMetadata.openGraphLocale);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(element) {
        element.setAttribute('content', routeMetadata.title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(element) {
        element.setAttribute('content', routeMetadata.description);
      },
    })
    .on('div#root', {
      element(element) {
        if (bootstrapHtml) element.setInnerContent(bootstrapHtml, { html: true });
      },
    })
    .on('script', {
      element(element) {
        element.setAttribute('nonce', nonce);
      },
    })
    .transform(htmlResponse);
}

function apiContext(request: Request, env: Env, ctx: ExecutionContext, params: Params = {}) {
  return {
    request,
    env,
    params,
    data: {},
    functionPath: new URL(request.url).pathname,
    passThroughOnException: () => undefined,
    waitUntil: ctx.waitUntil.bind(ctx),
    next: () => env.ASSETS.fetch(request),
  };
}

function methodNotAllowed(allowed: string) {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { allow: allowed },
  });
}

async function run(handler: ApiHandler, request: Request, env: Env, ctx: ExecutionContext, params?: Params) {
  return handler(apiContext(request, env, ctx, params));
}

async function contentResponse(request: Request, env: Env) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.slice('/content/'.length));

  if (!key || key.startsWith('/') || key.split('/').includes('..')) {
    return new Response('Invalid content path', { status: 400 });
  }
  // Job-source snapshots are retained for audit in private R2 storage. They must
  // never be served through the public course-content proxy.
  if (key.startsWith('jobs/raw/')) return new Response('Not found', { status: 404 });

  const object = await env.COURSE_STORAGE.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=300');
  return new Response(object.body, { headers });
}

async function apiResponse(request: Request, env: Env, ctx: ExecutionContext) {
  const { method } = request;
  const pathname = new URL(request.url).pathname;

  if (pathname === '/api/auth/me') return method === 'GET' ? run(getAuthMe, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/auth/login') return method === 'POST' ? run(login, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/auth/logout') return method === 'POST' ? run(logout, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/auth/register') return method === 'POST' ? run(register, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/auth/invites/validate') return method === 'POST' ? run(validateOrganizationInvite, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/auth/verify') return method === 'GET' ? run(verifyEmail, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/auth/password/forgot') return method === 'POST' ? run(forgotPassword, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/auth/password/reset') return method === 'POST' ? run(resetPassword, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/auth/google/start') return method === 'GET' ? run(startGoogleAuth, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/auth/google/callback') return method === 'GET' ? run(completeGoogleAuth, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/profile') {
    if (method === 'GET') return run(getProfile, request, env, ctx);
    if (method === 'PUT') return run(updateProfile, request, env, ctx);
    return methodNotAllowed('GET, PUT');
  }
  if (pathname === '/api/profile/password') return method === 'PUT' ? run(updateProfilePassword, request, env, ctx) : methodNotAllowed('PUT');
  if (pathname === '/api/profile/avatar') return method === 'PUT' ? run(updateProfileAvatar, request, env, ctx) : methodNotAllowed('PUT');
  if (pathname === '/api/account/overview') return method === 'GET' ? run(getAccountOverview, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/activity/page-view') return method === 'POST' ? run(recordPageView, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/courses') return method === 'GET' ? run(listCourses, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/progress') return method === 'PUT' ? run(saveProgress, request, env, ctx) : methodNotAllowed('PUT');
  if (pathname === '/api/resumes') {
    if (method === 'GET') return run(listResumes, request, env, ctx);
    if (method === 'POST') return run(createResume, request, env, ctx);
    return methodNotAllowed('GET, POST');
  }
  if (pathname === '/api/resumes/export') return method === 'POST' ? run(recordResumeExport, request, env, ctx) : methodNotAllowed('POST');
  const resumeBookmarkedJobsMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/bookmarked-jobs$/);
  if (resumeBookmarkedJobsMatch) {
    return method === 'GET'
      ? run(listResumeBookmarkedJobs, request, env, ctx, { resumeId: decodeURIComponent(resumeBookmarkedJobsMatch[1]) })
      : methodNotAllowed('GET');
  }
  const resumeParseMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/parse$/);
  if (resumeParseMatch) {
    return method === 'POST'
      ? run(parseResume, request, env, ctx, { resumeId: decodeURIComponent(resumeParseMatch[1]) })
      : methodNotAllowed('POST');
  }
  const resumeGenerateMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/generate$/);
  if (resumeGenerateMatch) {
    return method === 'POST'
      ? run(generateResume, request, env, ctx, { resumeId: decodeURIComponent(resumeGenerateMatch[1]) })
      : methodNotAllowed('POST');
  }
  const resumeSourceReparseMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/sources\/([^/]+)\/reparse$/);
  if (resumeSourceReparseMatch) {
    return method === 'POST'
      ? run(reparseResumeSource, request, env, ctx, { resumeId: decodeURIComponent(resumeSourceReparseMatch[1]), sourceId: decodeURIComponent(resumeSourceReparseMatch[2]) })
      : methodNotAllowed('POST');
  }
  const resumeSourceMatch = pathname.match(/^\/api\/resumes\/([^/]+)\/sources\/([^/]+)$/);
  if (resumeSourceMatch) {
    return method === 'DELETE'
      ? run(deleteResumeSource, request, env, ctx, { resumeId: decodeURIComponent(resumeSourceMatch[1]), sourceId: decodeURIComponent(resumeSourceMatch[2]) })
      : methodNotAllowed('DELETE');
  }
  const resumeMatch = pathname.match(/^\/api\/resumes\/([^/]+)$/);
  if (resumeMatch) {
    const params = { resumeId: decodeURIComponent(resumeMatch[1]) };
    if (method === 'GET') return run(getResume, request, env, ctx, params);
    if (method === 'PUT') return run(saveResume, request, env, ctx, params);
    if (method === 'DELETE') return run(deleteResume, request, env, ctx, params);
    return methodNotAllowed('GET, PUT, DELETE');
  }
  if (pathname === '/api/creator/courses') {
    if (method === 'GET') return run(listCreatorCourses, request, env, ctx);
    if (method === 'POST') return run(createCreatorCourse, request, env, ctx);
    return methodNotAllowed('GET, POST');
  }
  if (pathname === '/api/donations/checkout') return method === 'POST' ? run(createDonationCheckout, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/donations/session') return method === 'GET' ? run(getDonationCheckout, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/contact') return method === 'POST' ? run(sendContactMessage, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/analytics/course-engagement') return method === 'POST' ? run(recordCourseEngagement, request, env, ctx) : methodNotAllowed('POST');
  // Stripe Production Destination uses this canonical URL. Keep the original
  // donations URL as an internal/backwards-compatible alias for any existing
  // Checkout configuration.
  if (pathname === '/api/donations/webhook' || pathname === '/api/stripe/webhook') {
    return method === 'POST' ? run(receiveDonationWebhook, request, env, ctx) : methodNotAllowed('POST');
  }
  if (pathname === resendWebhookPath(env)) {
    return method === 'POST' ? run(receiveResendWebhook, request, env, ctx) : methodNotAllowed('POST');
  }
  if (pathname === '/api/jobs') return method === 'GET' ? run(listJobs, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/jobs/bookmarks') return method === 'GET' ? run(listJobBookmarks, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/admin/job-sources') {
    if (method === 'GET') return run(listJobSources, request, env, ctx);
    if (method === 'POST') return run(createJobSource, request, env, ctx);
    return methodNotAllowed('GET, POST');
  }
  if (pathname === '/api/admin/overview') return method === 'GET' ? run(getAdminOverview, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/admin/email/test') return method === 'POST' ? run(sendAdminEmailTest, request, env, ctx) : methodNotAllowed('POST');
  if (pathname === '/api/admin/users') return method === 'GET' ? run(listAdminUsers, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/admin/organizations') {
    if (method === 'GET') return run(listOrganizations, request, env, ctx);
    if (method === 'POST') return run(createOrganization, request, env, ctx);
    return methodNotAllowed('GET, POST');
  }
  if (pathname === '/api/admin/my-organization') return method === 'GET' ? run(getMyOrganization, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/admin/courses/system') return method === 'GET' ? run(getSystemCourseAnalytics, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/admin/courses/community') return method === 'GET' ? run(getCommunityCourseAnalytics, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/admin/jobs') return method === 'GET' ? run(listAdminJobs, request, env, ctx) : methodNotAllowed('GET');
  if (pathname === '/api/admin/knowledge-graph') {
    if (method === 'GET') return run(listKnowledgeGraphCandidates, request, env, ctx);
    return methodNotAllowed('GET');
  }
  if (pathname === '/api/admin/knowledge-graph/preview') {
    return method === 'GET' ? run(previewKnowledgeGraph, request, env, ctx) : methodNotAllowed('GET');
  }
  if (pathname === '/api/admin/knowledge-graph/refresh') {
    return method === 'POST' ? run(refreshKnowledgeGraph, request, env, ctx) : methodNotAllowed('POST');
  }

  const courseProgressMatch = pathname.match(/^\/api\/courses\/([^/]+)\/progress$/);
  if (courseProgressMatch) {
    return method === 'GET'
      ? run(getCourseProgress, request, env, ctx, { courseId: decodeURIComponent(courseProgressMatch[1]) })
      : methodNotAllowed('GET');
  }

  const courseAccessMatch = pathname.match(/^\/api\/courses\/([^/]+)\/access$/);
  if (courseAccessMatch) {
    return method === 'GET'
      ? run(getCourseAccess, request, env, ctx, { courseId: decodeURIComponent(courseAccessMatch[1]) })
      : methodNotAllowed('GET');
  }

  const creatorCourseSubmitMatch = pathname.match(/^\/api\/creator\/courses\/([^/]+)\/submit$/);
  if (creatorCourseSubmitMatch) {
    return method === 'POST'
      ? run(submitCreatorCourse, request, env, ctx, { courseId: decodeURIComponent(creatorCourseSubmitMatch[1]) })
      : methodNotAllowed('POST');
  }

  const creatorCourseMatch = pathname.match(/^\/api\/creator\/courses\/([^/]+)$/);
  if (creatorCourseMatch) {
    return method === 'PUT'
      ? run(updateCreatorCourse, request, env, ctx, { courseId: decodeURIComponent(creatorCourseMatch[1]) })
      : methodNotAllowed('PUT');
  }

  const creatorCourseReviewMatch = pathname.match(/^\/api\/admin\/creator-courses\/([^/]+)\/review$/);
  if (creatorCourseReviewMatch) {
    return method === 'POST'
      ? run(reviewCreatorCourse, request, env, ctx, { courseId: decodeURIComponent(creatorCourseReviewMatch[1]) })
      : methodNotAllowed('POST');
  }

  const labSessionMatch = pathname.match(/^\/api\/labs\/([^/]+)\/sessions$/);
  if (labSessionMatch) {
    return method === 'POST'
      ? run(createLabSession, request, env, ctx, { labId: decodeURIComponent(labSessionMatch[1]) })
      : methodNotAllowed('POST');
  }

  const labCommandMatch = pathname.match(/^\/api\/labs\/sessions\/([^/]+)\/commands$/);
  if (labCommandMatch) {
    return method === 'POST'
      ? run(runLabCommand, request, env, ctx, { sessionId: decodeURIComponent(labCommandMatch[1]) })
      : methodNotAllowed('POST');
  }

  const labResetMatch = pathname.match(/^\/api\/labs\/sessions\/([^/]+)\/reset$/);
  if (labResetMatch) {
    return method === 'POST'
      ? run(resetLabSession, request, env, ctx, { sessionId: decodeURIComponent(labResetMatch[1]) })
      : methodNotAllowed('POST');
  }

  const labMatch = pathname.match(/^\/api\/labs\/([^/]+)$/);
  if (labMatch) {
    return method === 'GET'
      ? run(getLab, request, env, ctx, { labId: decodeURIComponent(labMatch[1]) })
      : methodNotAllowed('GET');
  }

  const jobSourceSyncMatch = pathname.match(/^\/api\/admin\/job-sources\/([^/]+)\/sync$/);
  if (jobSourceSyncMatch) {
    return method === 'POST'
      ? run(syncJobSource, request, env, ctx, { sourceId: decodeURIComponent(jobSourceSyncMatch[1]) })
      : methodNotAllowed('POST');
  }

  const jobSourceMatch = pathname.match(/^\/api\/admin\/job-sources\/([^/]+)$/);
  if (jobSourceMatch) {
    return method === 'PATCH'
      ? run(updateJobSource, request, env, ctx, { sourceId: decodeURIComponent(jobSourceMatch[1]) })
      : methodNotAllowed('PATCH');
  }

  const adminUserActivityMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/activity$/);
  if (adminUserActivityMatch) {
    return method === 'GET'
      ? run(getAdminUserActivity, request, env, ctx, { userId: decodeURIComponent(adminUserActivityMatch[1]) })
      : methodNotAllowed('GET');
  }

  const organizationInviteMatch = pathname.match(/^\/api\/admin\/organizations\/([^/]+)\/invites\/([^/]+)$/);
  if (organizationInviteMatch) {
    return method === 'PATCH'
      ? run(updateOrganizationInvite, request, env, ctx, { organizationId: decodeURIComponent(organizationInviteMatch[1]), inviteId: decodeURIComponent(organizationInviteMatch[2]) })
      : methodNotAllowed('PATCH');
  }

  const organizationChildMatch = pathname.match(/^\/api\/admin\/organizations\/([^/]+)\/(members|leader|invites|messages|audit|content)$/);
  if (organizationChildMatch) {
    const params = { organizationId: decodeURIComponent(organizationChildMatch[1]) };
    switch (organizationChildMatch[2]) {
      case 'members':
        if (method === 'GET') return run(listOrganizationMembers, request, env, ctx, params);
        if (method === 'POST') return run(addOrganizationMember, request, env, ctx, params);
        if (method === 'DELETE') return run(removeOrganizationMember, request, env, ctx, params);
        return methodNotAllowed('GET, POST, DELETE');
      case 'leader':
        return method === 'PUT' ? run(setOrganizationLeader, request, env, ctx, params) : methodNotAllowed('PUT');
      case 'invites':
        if (method === 'GET') return run(listOrganizationInvites, request, env, ctx, params);
        if (method === 'POST') return run(createOrganizationInvite, request, env, ctx, params);
        return methodNotAllowed('GET, POST');
      case 'messages':
        if (method === 'GET') return run(listOrganizationMessages, request, env, ctx, params);
        if (method === 'POST') return run(sendOrganizationMessage, request, env, ctx, params);
        return methodNotAllowed('GET, POST');
      case 'audit': return method === 'GET' ? run(listOrganizationAudit, request, env, ctx, params) : methodNotAllowed('GET');
      case 'content': return method === 'GET' ? run(listOrganizationContent, request, env, ctx, params) : methodNotAllowed('GET');
    }
  }

  const organizationMatch = pathname.match(/^\/api\/admin\/organizations\/([^/]+)$/);
  if (organizationMatch) {
    const params = { organizationId: decodeURIComponent(organizationMatch[1]) };
    if (method === 'GET') return run(getOrganization, request, env, ctx, params);
    if (method === 'PATCH') return run(updateOrganization, request, env, ctx, params);
    return methodNotAllowed('GET, PATCH');
  }

  const adminUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (adminUserMatch) {
    const params = { userId: decodeURIComponent(adminUserMatch[1]) };
    if (method === 'GET') return run(getAdminUser, request, env, ctx, params);
    if (method === 'PATCH') return run(updateAdminUser, request, env, ctx, params);
    return methodNotAllowed('GET, PATCH');
  }

  const communityCourseMatch = pathname.match(/^\/api\/admin\/courses\/community\/([^/]+)$/);
  if (communityCourseMatch) {
    return method === 'PATCH'
      ? run(updateCommunityCourse, request, env, ctx, { courseId: decodeURIComponent(communityCourseMatch[1]) })
      : methodNotAllowed('PATCH');
  }

  const knowledgeCandidateReviewMatch = pathname.match(/^\/api\/admin\/knowledge-graph\/candidates\/([^/]+)\/review$/);
  if (knowledgeCandidateReviewMatch) {
    return method === 'POST'
      ? run(reviewKnowledgeGraphCandidate, request, env, ctx, { candidateId: decodeURIComponent(knowledgeCandidateReviewMatch[1]) })
      : methodNotAllowed('POST');
  }

  const jobReviewMatch = pathname.match(/^\/api\/admin\/jobs\/([^/]+)\/review$/);
  if (jobReviewMatch) {
    return method === 'POST'
      ? run(reviewJob, request, env, ctx, { jobId: decodeURIComponent(jobReviewMatch[1]) })
      : methodNotAllowed('POST');
  }

  const adminJobMatch = pathname.match(/^\/api\/admin\/jobs\/([^/]+)$/);
  if (adminJobMatch) {
    return method === 'GET'
      ? run(getAdminJob, request, env, ctx, { jobId: decodeURIComponent(adminJobMatch[1]) })
      : methodNotAllowed('GET');
  }

  const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);
  const jobBookmarkMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/bookmark$/);
  if (jobBookmarkMatch) {
    const params = { slug: decodeURIComponent(jobBookmarkMatch[1]) };
    if (method === 'PUT') return run(saveJobBookmark, request, env, ctx, params);
    if (method === 'DELETE') return run(removeJobBookmark, request, env, ctx, params);
    return methodNotAllowed('PUT, DELETE');
  }
  if (jobMatch) {
    return method === 'GET'
      ? run(getJob, request, env, ctx, { slug: decodeURIComponent(jobMatch[1]) })
      : methodNotAllowed('GET');
  }

  return new Response('Not found', { status: 404 });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith('/api/')) return apiResponse(request, env, ctx);
    if (pathname.startsWith('/content/')) return contentResponse(request, env);

    return assetResponse(request, env);
  },
  async scheduled(controller, env, _ctx): Promise<void> {
    try {
      if (controller.cron === '15 13 * * *') {
        const campaigns = await runEmailLifecycleCampaigns(env);
        console.log('Scheduled email lifecycle campaigns finished', {
          cron: controller.cron,
          scheduledTime: new Date(controller.scheduledTime).toISOString(),
          campaigns,
        });
        return;
      }
      if (controller.cron === '*/2 * * * *') {
        // Bootstrap one newly enabled official source per maintenance turn;
        // afterwards the unchanged twice-daily source cadence remains in
        // charge. This deliberately avoids a burst crawl on deployment.
        const initialSourceSync = await runInitialSourceSync(env);
        // The first URL-inspection pass is intentionally prioritized after a
        // lifecycle-policy migration. It validates every stored original URL
        // in bounded batches without using a changing source catalogue as
        // negative evidence.
        const urlInspection = await inspectDueJobUrls(env, 48, true);
        // Presentation has its own durable lock and must continue even while
        // the one-time URL-inspection backlog is draining. Otherwise a policy
        // correction could leave permitted excerpts empty for hours.
        const presentation = await runPendingJobPresentationRefresh(env, 32);
        if (urlInspection.initialPending > 0) {
          console.log('Scheduled original JD URL inspection advanced', {
            cron: controller.cron,
            scheduledTime: new Date(controller.scheduledTime).toISOString(),
            initialSourceSync,
            urlInspection,
            presentation,
          });
          return;
        }
        // Rebuild approved dictionary evidence first, then prioritize the
        // current JD queue so the DeepSeek pass can add reviewed candidates
        // and related concepts without waiting behind course discovery.
        const reindex = await reindexCurrentJobSkillEvidence(env, 24);
        const [jobBacklog, courseBacklog] = await Promise.all([
          env.DB.prepare(
            "SELECT COUNT(*) AS value FROM knowledge_refresh_queue WHERE source_type = 'job_version' AND status IN ('pending', 'error', 'running')",
          ).first<{ value: number }>(),
          env.DB.prepare(
            "SELECT COUNT(*) AS value FROM knowledge_refresh_queue WHERE source_type = 'course_chapter' AND status IN ('pending', 'error', 'running')",
          ).first<{ value: number }>(),
        ]);
        const sourceType = Number(jobBacklog?.value ?? 0) > 0 ? 'job_version'
          : Number(courseBacklog?.value ?? 0) > 0 ? 'course_chapter'
            : undefined;
        const knowledgeGraph = await runKnowledgeGraphRefresh(env, 16, sourceType);
        const jobVectors = await runPendingJobVectorIndex(env, 24);
        console.log('Scheduled knowledge-graph backfill finished', {
          cron: controller.cron,
          scheduledTime: new Date(controller.scheduledTime).toISOString(),
          initialSourceSync,
          urlInspection,
          presentation,
          reindex,
          sourceType,
          knowledgeGraph,
          jobVectors,
        });
        return;
      }
      // Source refresh and course discovery must not prevent the graph backlog
      // from advancing when a single upstream careers board or R2 object fails.
      const [sourceSync, courseDiscovery, reindex] = await Promise.allSettled([
        runDueSourceSync(env),
        enqueuePublishedCourseKnowledge(env, 400),
        reindexCurrentJobSkillEvidence(env, 24),
      ]);
      // A catalogue sync only discovers or refreshes roles. Direct inspection
      // of each original JD URL is the sole automated expiry authority.
      const urlInspection = await inspectDueJobUrls(env, 48);
      const jobBacklog = await env.DB.prepare(
        "SELECT COUNT(*) AS value FROM knowledge_refresh_queue WHERE source_type = 'job_version' AND status IN ('pending', 'error', 'running')",
      ).first<{ value: number }>();
      const knowledgeGraph = await runKnowledgeGraphRefresh(env, 16, Number(jobBacklog?.value ?? 0) > 0 ? 'job_version' : undefined);
      const jobVectors = await runPendingJobVectorIndex(env, 24);
      console.log('Scheduled AI job-source synchronization finished', {
        cron: controller.cron,
        scheduledTime: new Date(controller.scheduledTime).toISOString(),
        sourceSync: sourceSync.status === 'fulfilled' ? sourceSync.value : { error: sourceSync.reason instanceof Error ? sourceSync.reason.message : 'Unknown error' },
        urlInspection,
        courseQueue: courseDiscovery.status === 'fulfilled' ? courseDiscovery.value : { error: courseDiscovery.reason instanceof Error ? courseDiscovery.reason.message : 'Unknown error' },
        evidenceReindex: reindex.status === 'fulfilled' ? reindex.value : { error: reindex.reason instanceof Error ? reindex.reason.message : 'Unknown error' },
        knowledgeGraph,
        jobVectors,
      });
    } catch (error) {
      console.error('Scheduled AI job-source synchronization failed', {
        cron: controller.cron,
        scheduledTime: new Date(controller.scheduledTime).toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;
