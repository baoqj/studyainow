const SAFE_TRACE_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveTraceId(request: Request): string {
  const candidate = request.headers.get('x-request-id')?.trim();
  return candidate && SAFE_TRACE_ID.test(candidate) ? candidate : crypto.randomUUID();
}
