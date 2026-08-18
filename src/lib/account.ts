export type AccountOverview = {
  profile: { id: string; email: string; display_name: string; username: string | null; avatar_url: string | null; email_verified_at: string | null } | null;
  points: number;
  badges: Array<{ slug: string; name: string; description: string; icon: string; awarded_at: string }>;
  courses: Array<{
    course_id: string;
    course_slug: string;
    course_title: string;
    completed_chapters: number;
    chapter_count: number;
    average_progress: number;
    last_read_at: string | null;
    lesson_progress: Array<{
      course_id: string;
      chapter_number: number;
      chapter_slug: string;
      lesson_route_id: string;
      lesson_number: number;
      status: 'reading' | 'completed';
      progress_percent: number;
      scroll_y: number;
      last_read_at: string;
      completed_at: string | null;
    }>;
  }>;
  history: Array<{ event_type: string; progress_percent: number; created_at: string; course_slug: string; course_title: string; chapter_number: number; chapter_title: string }>;
  notifications: Array<{ id: string; kind: string; title: string; body: string; action_url: string | null; read_at: string | null; created_at: string }>;
  creator: { total: number; recommended: number };
  resumes: { total: number };
};

export type CourseAccess = { authenticated: boolean; courseManaged: boolean; chapters: Array<{ chapterNumber: number; isFree: boolean; locked: boolean }> };

async function read<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error ?? 'Request failed');
  return payload;
}

export async function fetchAccountOverview(options: { signal?: AbortSignal } = {}) {
  return read<AccountOverview>(await fetch('/api/account/overview', { headers: { accept: 'application/json' }, signal: options.signal }));
}

export async function fetchCourseAccess(courseId: string) {
  return read<CourseAccess>(await fetch(`/api/courses/${encodeURIComponent(courseId)}/access`, { headers: { accept: 'application/json' } }));
}

export async function fetchProfile() {
  return read<{ profile: Record<string, unknown>; badges: AccountOverview['badges']; points: number }>(await fetch('/api/profile'));
}

export async function updateProfile(input: Record<string, unknown>) {
  return read<{ profile: Record<string, unknown> }>(await fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }));
}

export async function uploadAvatar(file: File) {
  return read<{ avatarUrl: string }>(await fetch('/api/profile/avatar', { method: 'PUT', headers: { 'content-type': file.type }, body: file }));
}
