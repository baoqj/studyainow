import { AlertTriangle, CheckCircle2, Play, RotateCcw, Send, TerminalSquare } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LabStep {
  id: string;
  step_order: number;
  instruction: string;
  expected_command: string;
  mock_output: string;
  success_message: string;
  hint: string | null;
}

interface LabPayload {
  id: string;
  title: string;
  mode: string;
  working_directory: string;
  instructions: string | null;
  blocked_patterns: string[];
  success_criteria: string[];
  steps: LabStep[];
}

interface CommandEntry {
  command: string;
  output: string;
  status: 'success' | 'error' | 'blocked';
}

export function CliLab({ labId }: { labId: string }) {
  const { t, i18n } = useTranslation();
  const [lab, setLab] = useState<LabPayload | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [command, setCommand] = useState('');
  const [entries, setEntries] = useState<CommandEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch(`/api/labs/${encodeURIComponent(labId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(t('lab.unavailable'));
        return response.json() as Promise<{ lab: LabPayload }>;
      })
      .then((data) => {
        if (mounted) setLab(data.lab);
      })
      .catch((reason) => {
        if (mounted) setError(reason instanceof Error ? reason.message : t('lab.unavailable'));
      });

    return () => {
      mounted = false;
    };
  }, [labId, i18n.language, t]);

  const activeStep = useMemo(() => lab?.steps.find((step) => step.step_order === currentStep), [lab, currentStep]);

  async function startSession() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/labs/${encodeURIComponent(labId)}/sessions`, { method: 'POST' });

      if (response.status === 401) {
        throw new Error(t('lab.loginFirst'));
      }

      if (!response.ok) {
        throw new Error(t('lab.startFailed'));
      }

      const data = (await response.json()) as { session: { id: string; current_step?: number; status?: string } };
      setSessionId(data.session.id);
      setCurrentStep(data.session.current_step ?? 0);
      setCompleted(data.session.status === 'completed');
      setEntries([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('lab.startFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function submitCommand(event: FormEvent) {
    event.preventDefault();
    if (!sessionId || !command.trim()) return;

    const submitted = command.trim();
    setCommand('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/labs/sessions/${encodeURIComponent(sessionId)}/commands`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command: submitted }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t('lab.submitFailed'));
      }

      const data = (await response.json()) as {
        result: {
          status: 'success' | 'error' | 'blocked';
          output: string;
          current_step: number;
          completed: boolean;
        };
      };
      setEntries((items) => [
        ...items,
        {
          command: submitted,
          output: data.result.output,
          status: data.result.status,
        },
      ]);
      setCurrentStep(data.result.current_step);
      setCompleted(Boolean(data.result.completed));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('lab.submitFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function resetSession() {
    if (!sessionId) return;

    await fetch(`/api/labs/sessions/${encodeURIComponent(sessionId)}/reset`, { method: 'POST' }).catch(() => undefined);
    setSessionId(null);
    setCurrentStep(0);
    setCompleted(false);
    setCommand('');
    setEntries([]);
  }

  if (error && !lab) {
    return (
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <div className="flex items-center gap-3 text-on-surface">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          {error}
        </div>
      </section>
    );
  }

  if (!lab) {
    return (
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 text-on-surface-variant">
        {t('lab.loading')}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
      <div className="border-b border-outline-variant p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded bg-surface-container px-2 py-1 font-label-sm text-[12px] text-primary">
              <TerminalSquare className="h-4 w-4" />
              {t('lab.interactive')} · {lab.mode}
            </div>
            <h2 className="font-h3 text-2xl text-on-surface mb-2">{lab.title}</h2>
            <p className="text-sm text-on-surface-variant">{lab.instructions}</p>
          </div>
          <div className="flex gap-2">
            {sessionId && (
              <button
                onClick={resetSession}
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container-low"
              >
                <RotateCcw className="h-4 w-4" />
                {t('lab.reset')}
              </button>
            )}
            {!sessionId && (
              <button
                onClick={startSession}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-on-primary hover:opacity-90 disabled:opacity-60"
              >
                <Play className="h-4 w-4" />
                {t('lab.start')}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}{' '}
            {error === t('lab.loginFirst') && (
              <Link to="/login" className="font-medium underline underline-offset-4">
                {t('lab.login')}
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        <div className="border-b border-outline-variant bg-surface-container-low p-5 lg:border-b-0 lg:border-r">
          <div className="mb-3 text-[12px] font-label-sm uppercase tracking-wider text-outline">{t('lab.steps')}</div>
          <div className="space-y-3">
            {lab.steps.map((step) => (
              <div
                key={step.id}
                className={`rounded-lg border p-3 text-sm ${
                  step.step_order < currentStep || completed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : step.step_order === currentStep
                      ? 'border-primary bg-white text-on-surface'
                      : 'border-outline-variant bg-white/60 text-on-surface-variant'
                }`}
              >
                <div className="flex items-start gap-2">
                  {step.step_order < currentStep || completed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]">
                      {step.step_order + 1}
                    </span>
                  )}
                  <span>{step.instruction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 rounded-lg bg-[#101827] p-4 font-code-block text-sm text-slate-200 min-h-[260px]">
            <div className="mb-3 text-slate-500">{lab.working_directory}</div>
            {entries.length === 0 && (
              <div className="text-slate-400">
                {sessionId ? activeStep?.instruction : t('lab.startHint')}
              </div>
            )}
            {entries.map((entry, index) => (
              <div key={`${entry.command}-${index}`} className="mb-4">
                <div className="text-cyan-300">$ {entry.command}</div>
                <pre className={`mt-1 whitespace-pre-wrap ${entry.status === 'blocked' ? 'text-amber-300' : entry.status === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {entry.output}
                </pre>
              </div>
            ))}
            {completed && <div className="text-emerald-300">✓ {t('lab.completed')}</div>}
          </div>

          <form onSubmit={submitCommand} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              disabled={!sessionId || completed || loading}
              className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-code-block text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              placeholder={activeStep ? `${t('lab.command')}: ${activeStep.expected_command}` : t('lab.command')}
            />
            <button
              disabled={!sessionId || completed || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-label-sm text-sm text-on-primary hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {t('lab.submit')}
            </button>
          </form>

          <div className="mt-4 text-xs text-on-surface-variant">
            {t('lab.safety')}
          </div>
        </div>
      </div>
    </section>
  );
}
