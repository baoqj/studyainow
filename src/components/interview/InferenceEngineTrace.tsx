import { ChevronLeft, ChevronRight, Cpu, Database, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AppLocale } from '../../data/courseContent';

type TraceStep = {
  admitted: string[];
  decode: string[];
  finished: string[];
  kvUsed: number;
  preempt: string[];
  prefill: string[];
  waiting: string[];
  workUsed: number;
};

type TraceDefinition = {
  capacity?: number;
  maxWork: number;
  steps: TraceStep[];
};

const traces: Record<string, TraceDefinition> = {
  '1-1': {
    maxWork: 10,
    steps: [
      { waiting: ['A · p6 · m3', 'B · p3 · m2', 'C · p5 · m2'], admitted: [], prefill: [], decode: [], preempt: [], finished: [], workUsed: 0, kvUsed: 0 },
      { waiting: ['C · p5 · m2'], admitted: ['A', 'B'], prefill: ['A:6', 'B:3'], decode: [], preempt: [], finished: [], workUsed: 9, kvUsed: 9 },
      { waiting: [], admitted: ['A', 'C'], prefill: ['C:5'], decode: ['A', 'B'], preempt: [], finished: ['B'], workUsed: 7, kvUsed: 12 },
      { waiting: [], admitted: [], prefill: [], decode: ['A', 'C'], preempt: [], finished: ['A', 'C'], workUsed: 2, kvUsed: 0 },
    ],
  },
  '2-1': {
    maxWork: 8,
    steps: [
      { waiting: ['W · p2 · m4', 'X · p13 · m2', 'Y · p3 · m2'], admitted: [], prefill: [], decode: [], preempt: [], finished: [], workUsed: 0, kvUsed: 0 },
      { waiting: ['X · remaining 7', 'Y · p3 · m2'], admitted: ['W'], prefill: ['W:2', 'X:6'], decode: [], preempt: [], finished: [], workUsed: 8, kvUsed: 8 },
      { waiting: ['Y · p3 · m2'], admitted: ['W', 'X'], prefill: ['X:7'], decode: ['W'], preempt: [], finished: [], workUsed: 8, kvUsed: 16 },
      { waiting: [], admitted: ['W', 'Y'], prefill: ['Y:3'], decode: ['W', 'X'], preempt: [], finished: ['X'], workUsed: 5, kvUsed: 7 },
      { waiting: [], admitted: [], prefill: [], decode: ['W', 'Y'], preempt: [], finished: ['W', 'Y'], workUsed: 2, kvUsed: 0 },
    ],
  },
  '3-1': {
    maxWork: 10,
    capacity: 6,
    steps: [
      { waiting: ['A · peak 3', 'B · peak 5', 'C · peak 3'], admitted: [], prefill: [], decode: [], preempt: [], finished: [], workUsed: 0, kvUsed: 0 },
      { waiting: ['B · peak 5', 'C · peak 3'], admitted: ['A'], prefill: ['A:2'], decode: [], preempt: [], finished: [], workUsed: 2, kvUsed: 2 },
      { waiting: ['B · peak 5', 'C · peak 3'], admitted: [], prefill: [], decode: ['A'], preempt: [], finished: ['A'], workUsed: 1, kvUsed: 0 },
      { waiting: ['C · peak 3'], admitted: ['B'], prefill: ['B:4'], decode: [], preempt: [], finished: [], workUsed: 4, kvUsed: 4 },
      { waiting: ['C · peak 3'], admitted: [], prefill: [], decode: ['B'], preempt: [], finished: ['B'], workUsed: 1, kvUsed: 0 },
      { waiting: [], admitted: ['C'], prefill: ['C:2'], decode: [], preempt: [], finished: [], workUsed: 2, kvUsed: 2 },
      { waiting: [], admitted: [], prefill: [], decode: ['C'], preempt: [], finished: ['C'], workUsed: 1, kvUsed: 0 },
    ],
  },
  '4-1': {
    maxWork: 10,
    capacity: 6,
    steps: [
      { waiting: ['A · p2 · m2', 'B · p4 · m2', 'C · p2 · m2'], admitted: [], prefill: [], decode: [], preempt: [], finished: [], workUsed: 0, kvUsed: 0 },
      { waiting: ['C'], admitted: ['A', 'B'], prefill: ['A:2', 'B:4'], decode: [], preempt: [], finished: [], workUsed: 6, kvUsed: 6 },
      { waiting: ['B · re-prefill 5'], admitted: ['C'], prefill: ['C:2'], decode: ['A'], preempt: ['B'], finished: ['A'], workUsed: 3, kvUsed: 2 },
      { waiting: ['B · re-prefill 5'], admitted: [], prefill: [], decode: ['C'], preempt: [], finished: ['C'], workUsed: 1, kvUsed: 0 },
      { waiting: [], admitted: [], prefill: ['B:5'], decode: [], preempt: [], finished: ['B'], workUsed: 5, kvUsed: 0 },
    ],
  },
  '5-1': {
    maxWork: 10,
    capacity: 8,
    steps: [
      { waiting: ['LOW · p0', 'MID · p1'], admitted: [], prefill: [], decode: [], preempt: [], finished: [], workUsed: 0, kvUsed: 0 },
      { waiting: [], admitted: ['MID', 'LOW'], prefill: ['MID:2', 'LOW:2'], decode: [], preempt: [], finished: [], workUsed: 4, kvUsed: 4 },
      { waiting: [], admitted: ['MID', 'LOW'], prefill: [], decode: ['MID', 'LOW'], preempt: [], finished: [], workUsed: 2, kvUsed: 6 },
      { waiting: ['LOW · re-prefill 4'], admitted: [], prefill: ['HI:4'], decode: ['MID'], preempt: ['LOW'], finished: ['MID', 'HI'], workUsed: 5, kvUsed: 0 },
      { waiting: [], admitted: [], prefill: ['LOW:4'], decode: [], preempt: [], finished: ['LOW'], workUsed: 4, kvUsed: 0 },
    ],
  },
};

const traceCopy = {
  'zh-CN': {
    title: '交互式调度轨迹', intro: '逐步查看本阶段的计划如何改变等待队列、已准入请求、工作预算与 KV 占用。第 0 步是调用 plan(view) 前的初始状态。',
    step: '步骤', initial: '初始状态', waiting: '等待队列', admitted: '已准入', finished: '本步完成', plan: '本步计划', prefill: 'Prefill', decode: 'Decode', preempt: '抢占', empty: '无', work: '工作预算', kv: 'KV 占用', previous: '上一步', next: '下一步', reset: '回到起点',
  },
  'zh-TW': {
    title: '互動式排程軌跡', intro: '逐步查看本階段的計畫如何改變等待佇列、已准入請求、工作預算與 KV 使用量。第 0 步是呼叫 plan(view) 前的初始狀態。',
    step: '步驟', initial: '初始狀態', waiting: '等待佇列', admitted: '已准入', finished: '本步完成', plan: '本步計畫', prefill: 'Prefill', decode: 'Decode', preempt: '搶佔', empty: '無', work: '工作預算', kv: 'KV 使用量', previous: '上一步', next: '下一步', reset: '回到起點',
  },
  en: {
    title: 'Interactive scheduling trace', intro: 'Step through how this stage changes the waiting queue, admitted requests, work budget, and KV usage. Step 0 is the input state before plan(view) runs.',
    step: 'Step', initial: 'Initial state', waiting: 'Waiting', admitted: 'Admitted', finished: 'Finished this step', plan: 'Plan for this step', prefill: 'Prefill', decode: 'Decode', preempt: 'Preempt', empty: 'None', work: 'Work budget', kv: 'KV usage', previous: 'Previous', next: 'Next', reset: 'Reset trace',
  },
  fr: {
    title: 'Trace interactive de l’ordonnancement', intro: 'Parcourez les étapes pour voir évoluer la file d’attente, les requêtes admises, le budget de calcul et l’usage KV. L’étape 0 est l’état transmis à plan(view).',
    step: 'Étape', initial: 'État initial', waiting: 'En attente', admitted: 'Admises', finished: 'Terminées à cette étape', plan: 'Plan de cette étape', prefill: 'Prefill', decode: 'Decode', preempt: 'Préemption', empty: 'Aucun', work: 'Budget de calcul', kv: 'Usage KV', previous: 'Précédente', next: 'Suivante', reset: 'Revenir au début',
  },
  es: {
    title: 'Traza interactiva de planificación', intro: 'Avance paso a paso para observar la cola de espera, las solicitudes admitidas, el presupuesto de trabajo y el uso de KV. El paso 0 es el estado de entrada antes de ejecutar plan(view).',
    step: 'Paso', initial: 'Estado inicial', waiting: 'En espera', admitted: 'Admitidas', finished: 'Finalizadas en este paso', plan: 'Plan de este paso', prefill: 'Prefill', decode: 'Decode', preempt: 'Desalojar', empty: 'Ninguno', work: 'Presupuesto de trabajo', kv: 'Uso de KV', previous: 'Anterior', next: 'Siguiente', reset: 'Volver al inicio',
  },
} satisfies Record<AppLocale, Record<string, string>>;

function Pills({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <span className="text-sm text-on-surface-variant">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span key={value} className="rounded-md border border-outline-variant bg-surface-container-low px-2 py-1 font-code-block text-[12px] text-on-surface">
          {value}
        </span>
      ))}
    </div>
  );
}

export function InferenceEngineTrace({ questionId, locale }: { questionId: string; locale: AppLocale }) {
  const definition = traces[questionId];
  const copy = traceCopy[locale] ?? traceCopy.en;
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [questionId]);
  const step = definition?.steps[index];
  const progress = useMemo(() => definition ? ((index + 1) / definition.steps.length) * 100 : 0, [definition, index]);

  if (!definition || !step) return null;

  return (
    <section data-testid="inference-engine-trace" data-trace-step={index} aria-labelledby="inference-trace-title" className="overflow-hidden rounded-xl border border-primary/25 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant bg-primary-container/20 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="inference-trace-title" className="flex items-center gap-2 font-h3 text-[20px] text-on-surface">
              <Cpu className="h-5 w-5 text-primary" aria-hidden="true" /> {copy.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">{copy.intro}</p>
          </div>
          <span aria-live="polite" className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            {copy.step} {index}/{definition.steps.length - 1}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-container">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-outline-variant p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{copy.waiting}</div>
            <Pills values={step.waiting} empty={copy.empty} />
          </div>
          <div className="rounded-lg border border-outline-variant p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{copy.admitted}</div>
            <Pills values={step.admitted} empty={copy.empty} />
          </div>
          <div className="rounded-lg border border-outline-variant p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{copy.finished}</div>
            <Pills values={step.finished} empty={copy.empty} />
          </div>
        </div>

        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
          <h3 className="mb-3 text-sm font-semibold text-on-surface">{index === 0 ? copy.initial : copy.plan}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              [copy.prefill, step.prefill],
              [copy.decode, step.decode],
              [copy.preempt, step.preempt],
            ] as const).map(([label, values]) => (
              <div key={label}>
                <div className="mb-1 text-xs font-semibold text-primary">{label}</div>
                <Pills values={[...values]} empty={copy.empty} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-on-surface">
            <Cpu className="h-4 w-4 text-primary" aria-hidden="true" />
            {copy.work}: <strong>{step.workUsed}/{definition.maxWork}</strong>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-on-surface">
            <Database className="h-4 w-4 text-primary" aria-hidden="true" />
            {copy.kv}: <strong>{definition.capacity ? `${step.kvUsed}/${definition.capacity}` : step.kvUsed}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant pt-4">
          <button data-testid="inference-trace-previous" type="button" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {copy.previous}
          </button>
          <button data-testid="inference-trace-reset" type="button" onClick={() => setIndex(0)} disabled={index === 0} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> {copy.reset}
          </button>
          <button data-testid="inference-trace-next" type="button" onClick={() => setIndex((current) => Math.min(definition.steps.length - 1, current + 1))} disabled={index === definition.steps.length - 1} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-40">
            {copy.next} <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
