import { requireUser } from '../../../../_lib/auth';
import { getLabPayload, isBlocked, isStepMatch, type LabStep } from '../../../../_lib/labEngine';
import { ApiError, errorResponse, json, readJson, requireString } from '../../../../_lib/http';

interface CommandBody {
  command?: unknown;
}

export const onRequestPost: PagesFunction<Env, 'sessionId'> = async ({ request, env, params }) => {
  try {
    const user = await requireUser(env.DB, request);
    const sessionId = String(params.sessionId);
    const body = await readJson<CommandBody>(request);
    const command = requireString(body.command, 'command');

    const session = await env.DB
      .prepare(
        `SELECT id, user_id, lab_id, status, current_step
         FROM cli_lab_sessions
         WHERE id = ? AND user_id = ?`,
      )
      .bind(sessionId, user.id)
      .first<{ id: string; user_id: string; lab_id: string; status: string; current_step: number }>();

    if (!session) {
      throw new ApiError(404, 'Lab session not found');
    }

    if (session.status === 'completed') {
      throw new ApiError(409, 'Lab session is already completed');
    }

    const lab = await getLabPayload(env.DB, session.lab_id);
    const steps = lab.steps as LabStep[];
    const step = steps.find((item) => item.step_order === session.current_step) ?? steps[0];

    if (!step) {
      throw new ApiError(400, 'Lab has no steps');
    }

    const commandId = crypto.randomUUID();

    if (isBlocked(command, lab.blocked_patterns)) {
      const output = 'BLOCKED: 这是高风险命令。CLI Lab v1 不执行真实命令，并已记录这次尝试。';
      await env.DB
        .prepare(
          `INSERT INTO cli_lab_commands (id, session_id, step_order, command, result_status, output)
           VALUES (?, ?, ?, ?, 'blocked', ?)`,
        )
        .bind(commandId, session.id, step.step_order, command, output)
        .run();

      return json({
        result: {
          status: 'blocked',
          output,
          current_step: session.current_step,
          completed: false,
        },
      });
    }

    const matched = isStepMatch(command, step);
    const nextStep = matched ? session.current_step + 1 : session.current_step;
    const completed = matched && nextStep >= steps.length;
    const output = matched ? `${step.mock_output}\n\n${step.success_message}` : step.hint ?? `命令未匹配。当前步骤期望：${step.instruction}`;

    await env.DB.batch([
      env.DB
        .prepare(
          `INSERT INTO cli_lab_commands (id, session_id, step_order, command, result_status, output)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(commandId, session.id, step.step_order, command, matched ? 'success' : 'error', output),
      env.DB
        .prepare(
          `UPDATE cli_lab_sessions
           SET current_step = ?, status = ?, completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE completed_at END, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .bind(nextStep, completed ? 'completed' : 'in_progress', completed ? 1 : 0, session.id),
    ]);

    return json({
      result: {
        status: matched ? 'success' : 'error',
        output,
        current_step: nextStep,
        completed,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
