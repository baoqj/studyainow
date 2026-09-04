export function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_json_body');
  return value as Record<string, unknown>;
}

export function requiredString(value: unknown, field: string, maximum = 500): string {
  if (typeof value !== 'string') throw new Error(`invalid_${field}`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new Error(`invalid_${field}`);
  return normalized;
}

export function optionalString(value: unknown, field: string, maximum = 500): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requiredString(value, field, maximum);
}

export function optionalBoolean(value: unknown, field: string): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'boolean') throw new Error(`invalid_${field}`);
  return value;
}

export function stringArray(value: unknown, field: string, maximumItems = 20): string[] {
  if (!Array.isArray(value) || value.length > maximumItems) throw new Error(`invalid_${field}`);
  const result = value.map((item) => requiredString(item, field, 120));
  if (new Set(result).size !== result.length) throw new Error(`invalid_${field}`);
  return result;
}

export function positiveInteger(value: unknown, field: string, maximum = 1_000_000): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > maximum) {
    throw new Error(`invalid_${field}`);
  }
  return Number(value);
}

export function pageLimit(value: string | undefined, fallback = 50): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) throw new Error('invalid_limit');
  return parsed;
}
