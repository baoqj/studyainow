import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { SupportPrompt } from './components/support/SupportPrompt';
import { RequireAuth } from './components/auth/RequireAuth';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { UserLayout } from './components/user/UserLayout';
import { RouteErrorBoundary } from './components/layout/RouteErrorBoundary';
import { UserActivityTracker } from './components/analytics/UserActivityTracker';
import { RouteMetadata } from './components/seo/RouteMetadata';
import { LocalizedPublicRoute } from './components/seo/LocalizedPublicRoute';
import { getAccountCopy } from './data/accountCopy';
import type { AppLocale } from './data/courseCatalog';
import { isLocalizablePublicPath, localeFromPathname, localizedPublicPath } from './lib/localeRoutes';
import { useTranslation } from 'react-i18next';

const Catalog = lazy(() => import('./pages/Catalog').then((module) => ({ default: module.Catalog })));
const CourseDetail = lazy(() => import('./pages/CourseDetail').then((module) => ({ default: module.CourseDetail })));
const CourseStart = lazy(() => import('./pages/CourseStart').then((module) => ({ default: module.CourseStart })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then((module) => ({ default: module.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((module) => ({ default: module.ResetPassword })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((module) => ({ default: module.LegalPage })));
const About = lazy(() => import('./pages/About').then((module) => ({ default: module.About })));
const Contact = lazy(() => import('./pages/Contact').then((module) => ({ default: module.Contact })));
const TopicHub = lazy(() => import('./pages/TopicHub').then((module) => ({ default: module.TopicHub })));
const EditorialPolicy = lazy(() => import('./pages/EditorialPolicy').then((module) => ({ default: module.EditorialPolicy })));
const Jobs = lazy(() => import('./pages/Jobs').then((module) => ({ default: module.Jobs })));
const JobDetail = lazy(() => import('./pages/JobDetail').then((module) => ({ default: module.JobDetail })));
const InterviewCatalog = lazy(() => import('./pages/InterviewCatalog').then((module) => ({ default: module.InterviewCatalog })));
const InterviewSetStart = lazy(() => import('./pages/InterviewSetStart').then((module) => ({ default: module.InterviewSetStart })));
const InterviewLevel = lazy(() => import('./pages/InterviewLevel').then((module) => ({ default: module.InterviewLevel })));
const InterviewQuestion = lazy(() => import('./pages/InterviewQuestion').then((module) => ({ default: module.InterviewQuestion })));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard').then((module) => ({ default: module.UserDashboard })));
const MyCourses = lazy(() => import('./pages/user/MyCourses').then((module) => ({ default: module.MyCourses })));
const CreatorStudio = lazy(() => import('./pages/user/CreatorStudio').then((module) => ({ default: module.CreatorStudio })));
const ResumeList = lazy(() => import('./pages/user/ResumeList').then((module) => ({ default: module.ResumeList })));
const ResumeStudio = lazy(() => import('./pages/user/ResumeStudio').then((module) => ({ default: module.ResumeStudio })));
const MyJobs = lazy(() => import('./pages/user/MyJobs').then((module) => ({ default: module.MyJobs })));
const UserReferral = lazy(() => import('./pages/user/UserReferral').then((module) => ({ default: module.UserReferral })));
const UserNotifications = lazy(() => import('./pages/user/UserNotifications').then((module) => ({ default: module.UserNotifications })));
const ProfileBilling = lazy(() => import('./pages/user/ProfileBilling').then((module) => ({ default: module.ProfileBilling })));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview').then((module) => ({ default: module.AdminOverview })));
const AdminEntry = lazy(() => import('./pages/admin/AdminEntry').then((module) => ({ default: module.AdminEntry })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then((module) => ({ default: module.AdminUsers })));
const AdminUserDetail = lazy(() => import('./pages/admin/AdminUserDetail').then((module) => ({ default: module.AdminUserDetail })));
const AdminOrganizations = lazy(() => import('./pages/admin/AdminOrganizations').then((module) => ({ default: module.AdminOrganizations })));
const AdminOrganizationDetail = lazy(() => import('./pages/admin/AdminOrganizationDetail').then((module) => ({ default: module.AdminOrganizationDetail })));
const AdminSystemCourses = lazy(() => import('./pages/admin/AdminSystemCourses').then((module) => ({ default: module.AdminSystemCourses })));
const AdminCommunityCourses = lazy(() => import('./pages/admin/AdminCommunityCourses').then((module) => ({ default: module.AdminCommunityCourses })));
const KnowledgeGraphPreview = lazy(() => import('./pages/admin/KnowledgeGraphPreview').then((module) => ({ default: module.KnowledgeGraphPreview })));
const AdminJobSources = lazy(() => import('./pages/admin/AdminJobSources').then((module) => ({ default: module.AdminJobSources })));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs').then((module) => ({ default: module.AdminJobs })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then((module) => ({ default: module.Settings })));
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })));

function RouteLoading() {
  const { i18n } = useTranslation();
  const copy = getAccountCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  return <div data-testid="route-loading" className="min-h-[38vh] px-5 py-16 text-center text-on-surface-variant">{copy.loadingAccount}</div>;
}

function AppRouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const copy = getAccountCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);

  return <RouteErrorBoundary
    key={`${location.pathname}${location.search}`}
    resetKey={`${location.pathname}${location.search}`}
    message={copy.memberPageLoadFailed}
    retryLabel={copy.retry}
    returnLabel={copy.returnToCourses}
    onRetry={() => window.location.reload()}
    onReturnToCourses={() => navigate('/')}
  >
    {children}
  </RouteErrorBoundary>;
}

/** Replaces legacy public links with a language-owned URL once the SPA loads. */
function PublicLocaleCanonicalizer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language) as AppLocale;

  useEffect(() => {
    if (localeFromPathname(location.pathname) || !isLocalizablePublicPath(location.pathname)) return;
    navigate({
      pathname: localizedPublicPath(location.pathname, locale),
      search: location.search,
      hash: location.hash,
    }, { replace: true });
  }, [i18n.language, locale, location.hash, location.pathname, location.search, navigate]);

  return null;
}

function AppRoutes() {
  return <AppRouteBoundary>
    <PublicLocaleCanonicalizer />
    <RouteMetadata />
    <UserActivityTracker />
    <SupportPrompt />
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/courses" element={<Catalog />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:jobSlug" element={<JobDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminEntry />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:userId" element={<AdminUserDetail />} />
          <Route path="organizations" element={<AdminOrganizations />} />
          <Route path="organizations/:organizationId" element={<AdminOrganizationDetail />} />
          <Route path="my-organization" element={<AdminOrganizationDetail my />} />
          <Route path="courses" element={<AdminSystemCourses />} />
          <Route path="community-courses" element={<AdminCommunityCourses />} />
          <Route path="knowledge-graph" element={<KnowledgeGraphPreview />} />
          <Route path="job-sources" element={<AdminJobSources />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/topics/:topicSlug" element={<TopicHub />} />
        <Route path="/editorial-policy" element={<EditorialPolicy />} />
        <Route path="/courses/:courseId" element={<CourseStart />} />
        <Route path="/courses/:courseId/chapters/:chapterId" element={<CourseDetail />} />
        <Route path="/courses/:courseId/chapters/:chapterId/lessons/:lessonId" element={<CourseDetail />} />
        <Route path="/interviews" element={<InterviewCatalog />} />
        <Route path="/interviews/:setId" element={<InterviewSetStart />} />
        <Route path="/interviews/:setId/levels/:levelId" element={<InterviewLevel />} />
        <Route path="/interviews/:setId/levels/:levelId/questions/:questionId" element={<InterviewQuestion />} />

        <Route path="/me" element={<RequireAuth><UserLayout /></RequireAuth>}>
          <Route index element={<UserDashboard />} />
          <Route path="course" element={<MyCourses />} />
          <Route path="creator" element={<CreatorStudio />} />
          <Route path="creator/new" element={<CreatorStudio createMode />} />
          <Route path="resume" element={<ResumeList />} />
          <Route path="resume/:resumeId" element={<ResumeStudio />} />
          <Route path="job" element={<MyJobs />} />
          <Route path="referral" element={<UserReferral />} />
          <Route path="settings" element={<ProfileBilling />} />
          <Route path="notification" element={<UserNotifications />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/me" replace />} />
        <Route path="/dashboard/referrals" element={<Navigate to="/me/referral" replace />} />
        <Route path="/dashboard/settings" element={<Navigate to="/me/settings" replace />} />
        <Route path="/dashboard/billing" element={<Navigate to="/me/settings" replace />} />
        <Route path="/mycourse" element={<Navigate to="/me/course" replace />} />
        <Route path="/creator" element={<Navigate to="/me/creator" replace />} />
        <Route path="/creator/new" element={<Navigate to="/me/creator/new" replace />} />
        <Route path="/resume" element={<Navigate to="/me/resume" replace />} />
        <Route path="/myjob" element={<Navigate to="/me/job" replace />} />
        <Route path="/:locale" element={<LocalizedPublicRoute />}>
          <Route index element={<Catalog />} />
          <Route path="courses" element={<Catalog />} />
          <Route path="courses/:courseId" element={<CourseStart />} />
          <Route path="courses/:courseId/chapters/:chapterId" element={<CourseDetail />} />
          <Route path="courses/:courseId/chapters/:chapterId/lessons/:lessonId" element={<CourseDetail />} />
          <Route path="interviews" element={<InterviewCatalog />} />
          <Route path="interviews/:setId" element={<InterviewSetStart />} />
          <Route path="interviews/:setId/levels/:levelId" element={<InterviewLevel />} />
          <Route path="interviews/:setId/levels/:levelId/questions/:questionId" element={<InterviewQuestion />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:jobSlug" element={<JobDetail />} />
          <Route path="privacy" element={<LegalPage type="privacy" />} />
          <Route path="terms" element={<LegalPage type="terms" />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="topics/:topicSlug" element={<TopicHub />} />
          <Route path="editorial-policy" element={<EditorialPolicy />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </AppRouteBoundary>;
}

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
