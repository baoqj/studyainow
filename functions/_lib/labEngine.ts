import { ApiError } from './http';

export interface LabStep {
  id: string;
  lab_id: string;
  step_order: number;
  instruction: string;
  expected_command: string;
  matcher_type: 'exact' | 'contains' | 'regex';
  mock_output: string;
  success_message: string;
  hint: string | null;
  aliases_json: string;
}

export interface Lab {
  id: string;
  title: string;
  mode: string;
  working_directory: string;
  instructions: string | null;
  blocked_patterns_json: string;
  success_criteria_json: string;
}

function normalizeCommand(command: string) {
  return command.trim().replace(/\s+/g, ' ');
}

function parseJsonArray(value: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function wildcardIncludes(command: string, pattern: string) {
  const lower = command.toLowerCase();
  const parts = pattern
    .toLowerCase()
    .split('*')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return lower.includes(pattern.toLowerCase());
  }

  let cursor = 0;
  for (const part of parts) {
    const next = lower.indexOf(part, cursor);
    if (next === -1) return false;
    cursor = next + part.length;
  }

  return true;
}

export function isBlocked(command: string, patterns: string[]) {
  return patterns.some((pattern) => wildcardIncludes(command, pattern));
}

export function isStepMatch(command: string, step: LabStep) {
  const normalized = normalizeCommand(command);
  const expected = normalizeCommand(step.expected_command);
  const aliases = parseJsonArray(step.aliases_json).map(normalizeCommand);

  if (step.matcher_type === 'exact') {
    return normalized === expected || aliases.includes(normalized);
  }

  if (step.matcher_type === 'contains') {
    return normalized.toLowerCase().includes(expected.toLowerCase()) || aliases.some((alias) => normalized.includes(alias));
  }

  try {
    return new RegExp(step.expected_command).test(command);
  } catch {
    return false;
  }
}

export async function getLabPayload(db: D1Database, labId: string) {
  const lab = await db
    .prepare(
      `SELECT id, title, mode, working_directory, instructions, blocked_patterns_json, success_criteria_json
       FROM cli_labs WHERE id = ?`,
    )
    .bind(labId)
    .first<Lab>();

  if (!lab) {
    throw new ApiError(404, 'Lab not found');
  }

  const steps = await db
    .prepare(
      `SELECT id, lab_id, step_order, instruction, expected_command, matcher_type, mock_output, success_message, hint, aliases_json
       FROM cli_lab_steps
       WHERE lab_id = ?
       ORDER BY step_order ASC`,
    )
    .bind(labId)
    .all<LabStep>();

  return {
    ...lab,
    blocked_patterns: parseJsonArray(lab.blocked_patterns_json),
    success_criteria: parseJsonArray(lab.success_criteria_json),
    steps: steps.results,
  };
}
