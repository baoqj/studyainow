export function trackCourseClick(courseId: string, chapterNumber?: number) {
  const payload = JSON.stringify({
    courseType: 'system',
    courseId,
    chapterNumber,
    pagePath: window.location.pathname,
  });
  const url = '/api/analytics/course-engagement';
  try {
    if (navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))) return;
  } catch {
    // Fall through to a keepalive request in browsers without Beacon support.
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}
