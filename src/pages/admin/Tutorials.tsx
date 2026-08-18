import { Plus, Filter, Code2, Bot, FileLock2, TerminalSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const COURSES = [
  {
    id: 1,
    title: 'Claude Code 实战指南',
    subtitle: 'Claude Code / CLI Agent',
    visibility: 'Public',
    reads: '12,540',
    revenue: '$4,200.00',
    icon: Code2,
    iconBg: 'bg-secondary-container',
    iconColor: 'text-secondary'
  },
  {
    id: 2,
    title: 'Vibe Coding 工程化工作坊',
    subtitle: 'Prompt / Delivery Workflow',
    visibility: 'Public',
    reads: '8,230',
    revenue: '$2,150.50',
    icon: Bot,
    iconBg: 'bg-tertiary-container',
    iconColor: 'text-tertiary'
  },
  {
    id: 3,
    title: 'AI Agent 系统设计',
    subtitle: 'Subagents / MCP / Skills',
    visibility: 'Hidden',
    reads: '145',
    revenue: '$0.00',
    icon: FileLock2,
    iconBg: 'bg-surface-dim',
    iconColor: 'text-on-surface-variant'
  },
  {
    id: 4,
    title: 'RAG 与知识库基础',
    subtitle: 'Retrieval / Evaluation',
    visibility: 'Public',
    reads: '34,912',
    revenue: '$12,840.00',
    icon: TerminalSquare,
    iconBg: 'bg-primary-container/20',
    iconColor: 'text-primary'
  }
];

export function Tutorials() {
  const { t } = useTranslation();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-h1 text-[32px] text-on-surface mb-2">{t('Course Management')}</h1>
          <p className="text-on-surface-variant font-body-md">
            {t('Manage technical tutorials, track engagement, and update curriculum.')}
          </p>
        </div>
        <button className="bg-primary text-on-primary hover:bg-primary/90 flex items-center gap-2 px-6 py-3 rounded-lg font-label-sm text-sm transition-colors">
          <Plus className="w-4 h-4" />
          {t('Add New Course')}
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-outline-variant flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-label-sm text-sm hover:bg-surface-container-low transition-colors text-on-surface">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <div className="w-px h-6 bg-outline-variant"></div>
          <span className="text-sm text-on-surface-variant font-body-md">Showing {COURSES.length} courses</span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface w-[45%]">Course Title</th>
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface">Visibility</th>
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface text-right">Total Reads</th>
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface text-right">Revenue</th>
                <th className="py-4 px-6 font-label-sm text-sm font-medium text-on-surface text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {COURSES.map((course) => (
                <tr key={course.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${course.iconBg}`}>
                        <course.icon className={`w-5 h-5 ${course.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-on-surface font-label-sm text-[15px] truncate">{course.title}</div>
                        <div className="text-on-surface-variant text-sm truncate">{course.subtitle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-surface-dim font-label-sm text-[12px] text-on-surface">
                      <span className={`w-1.5 h-1.5 rounded-full ${course.visibility === 'Public' ? 'bg-emerald-500' : 'bg-outline'}`}></span>
                      {course.visibility}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right tabular-nums text-on-surface-variant">
                    {course.reads}
                  </td>
                  <td className="py-4 px-6 text-right tabular-nums text-on-surface-variant font-code-block text-[13px]">
                    {course.revenue}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {/* Placeholder for actions */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
