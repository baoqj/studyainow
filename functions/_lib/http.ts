export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      'cache-control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return json({ error: 'Internal server error' }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, 'Invalid JSON body');
  }
}

export function requireString(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${name} is required`);
  }

  return value.trim();
}

export function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function clampInt(value: unknown, min: number, max: number, fallback: number) {
  // URLSearchParams.get() returns null for an omitted optional parameter. Do
  // not coerce it to 0: a paginated endpoint with min=1 would otherwise
  // silently return a single record instead of its documented default page.
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return fallback;
  }
  const number = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}
