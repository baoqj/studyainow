import { ArrowUpRight, FilePenLine, Newspaper, Tags, UserCheck } from 'lucide-react';

const NEWSROOM_ORIGIN = 'https://news.studyai.now';

const newsroomLinks = [
  {
    href: `${NEWSROOM_ORIGIN}/admin/news/candidates`,
    label: '候选与人工复核',
    description: '核对来源、聚类结果、分类置信度与人工锁定字段。',
    icon: UserCheck,
  },
  {
    href: `${NEWSROOM_ORIGIN}/admin/news/articles`,
    label: '文章与发布流程',
    description: '编辑正文，提交审核，批准、上架、纠错或下架新闻。',
    icon: FilePenLine,
  },
  {
    href: `${NEWSROOM_ORIGIN}/admin/news/taxonomy`,
    label: '分类与标签',
    description: '维护分类名称、标签、别名及标签合并关系。',
    icon: Tags,
  },
] as const;

export function AdminNews() {
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">StudyAI Newsroom</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">新闻管理</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">从 StudyAINow 管理后台进入独立新闻编辑台。新闻内容、修订、审核与审计记录保存在专用 News 数据边界内。</p>
        </div>
        <a
          href={`${NEWSROOM_ORIGIN}/admin/news`}
          className="inline-flex items-center gap-2 rounded-md bg-[#123a5f] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0b2b49] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          打开新闻编辑台
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </header>

      <section className="border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-[#123a5f] sm:px-5">
        <div className="flex gap-3">
          <Newspaper className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-semibold">人工发布门禁保持独立</h2>
            <p className="mt-1 leading-6 text-blue-900/75">主站管理员身份负责保护此入口；进入 Newsroom 后仍需建立新闻管理员会话。任何自动分类或内容生成结果都不能绕过人工批准直接发布。</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="新闻管理功能">
        {newsroomLinks.map(({ href, label, description, icon: Icon }) => (
          <a key={href} href={href} className="group border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <div className="flex items-start justify-between gap-4">
              <Icon className="h-5 w-5 text-blue-700" />
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="mt-5 text-sm font-semibold text-slate-900">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          </a>
        ))}
      </section>
    </div>
  );
}
