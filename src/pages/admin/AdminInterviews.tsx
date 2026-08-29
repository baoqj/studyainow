import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminInterviewTrend } from "../../components/admin/AdminInterviewTrend";

type SetStats = {
  totalViews: number;
  uniqueUsers: number;
  views7d: number;
  views30d: number;
  setViews: number;
  levelViews: number;
  questionViews: number;
  lastViewedAt: string | null;
};

type InterviewSetRow = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  topic: string;
  levelCount: number;
  questionCount: number;
  publicRoute: string;
  stats: SetStats;
};

type HistoryRow = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  page_title: string;
  route: string;
  occurred_at: string;
};

type AdminInterviewsData = {
  readOnly?: boolean;
  summary: {
    totalViews: number;
    uniqueUsers: number;
    views30d: number;
    activeSets: number;
  };
  sets: InterviewSetRow[];
  selected: InterviewSetRow;
  trend: Array<{ day: string; views: number; visitors: number }>;
  topPages: Array<{
    route: string;
    page_title: string;
    views: number;
    unique_users: number;
    last_viewed_at: string;
  }>;
  history: { items: HistoryRow[]; total: number; page: number; limit: number };
};

function formatTime(value: string | null) {
  if (!value) return "—";
  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function AdminInterviews() {
  const [searchParams, setSearchParams] = useSearchParams();
  const setId = searchParams.get("setId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const [data, setData] = useState<AdminInterviewsData | null>(null);
  const [error, setError] = useState("");

  const apiParams = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "40" });
    if (setId) params.set("setId", setId);
    return params;
  }, [page, setId]);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch(`/api/admin/interviews?${apiParams}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => ({}))) as AdminInterviewsData & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "无法加载面试题集");
        return payload;
      })
      .then(setData)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setError(reason instanceof Error ? reason.message : "无法加载面试题集");
      });
    return () => controller.abort();
  }, [apiParams]);

  const selectSet = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("setId", id);
    next.delete("page");
    setSearchParams(next);
  };

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (data?.selected.id) next.set("setId", data.selected.id);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">面试题集</h1>
        <p className="mt-1 text-xs text-slate-500">
          题集访问、用户记录与页面趋势
        </p>
      </div>

      {data && !data.readOnly ? (
        <section className="grid border-y border-slate-200 bg-white sm:grid-cols-4">
          {[
            ["累计访问", data.summary.totalViews],
            ["近 30 日", data.summary.views30d],
            ["访问用户", data.summary.uniqueUsers],
            ["有访问题集", `${data.summary.activeSets}/${data.sets.length}`],
          ].map(([label, value], index) => (
            <div
              key={String(label)}
              className={`px-4 py-3 ${index ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`}
            >
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold">题集列表</h2>
        </div>
        {error ? (
          <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">
            {error}
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">题集</th>
                <th className="px-4 py-2.5 font-medium">分类</th>
                <th className="px-4 py-2.5 font-medium">内容</th>
                <th className="px-4 py-2.5 font-medium">访问</th>
                <th className="px-4 py-2.5 font-medium">用户</th>
                <th className="px-4 py-2.5 font-medium">近 30 日</th>
                <th className="px-4 py-2.5 font-medium">最后访问</th>
                <th className="px-4 py-2.5 text-right font-medium">前台</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.sets.map((set) => {
                const active = set.id === data.selected.id;
                return (
                  <tr
                    key={set.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    onClick={() => selectSet(set.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectSet(set.id);
                      }
                    }}
                    className={`cursor-pointer outline-none ${active ? "bg-blue-50 dark:bg-[#173f69]" : "hover:bg-slate-50/70"} focus-visible:bg-blue-50 dark:focus-visible:bg-[#173f69]`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{set.title}</p>
                      <p className="mt-0.5 max-w-xl text-xs text-slate-500">
                        {set.subtitle}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{set.category}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {set.topic}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {set.levelCount} 级 / {set.questionCount} 题
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {set.stats.totalViews.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {set.stats.uniqueUsers.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {set.stats.views30d.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatTime(set.stats.lastViewedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={set.publicRoute}
                        target="_blank"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-200 dark:hover:text-white"
                      >
                        查看 <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!data?.sets.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-14 text-center text-slate-500"
                  >
                    暂无面试题集
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {data?.selected && !data.readOnly ? (
        <>
          <section className="border border-slate-200 bg-white">
            <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold">{data.selected.title}</h2>
              <span className="text-xs text-slate-500">近 30 日访问趋势</span>
            </div>
            <div className="grid border-b border-slate-200 sm:grid-cols-4">
              {[
                ["题集页", data.selected.stats.setViews],
                ["级别页", data.selected.stats.levelViews],
                ["题目页", data.selected.stats.questionViews],
                ["近 7 日", data.selected.stats.views7d],
              ].map(([label, value], index) => (
                <div
                  key={String(label)}
                  className={`px-4 py-3 ${index ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`}
                >
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {Number(value).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-3 sm:p-4">
              <AdminInterviewTrend data={data.trend} />
            </div>
          </section>

          <section className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold">热门页面</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">页面</th>
                    <th className="px-4 py-2.5 font-medium">路由</th>
                    <th className="px-4 py-2.5 font-medium">访问</th>
                    <th className="px-4 py-2.5 font-medium">用户</th>
                    <th className="px-4 py-2.5 font-medium">最后访问</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topPages.map((row) => (
                    <tr key={row.route}>
                      <td className="px-4 py-3 font-medium">
                        {row.page_title}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={row.route}
                          target="_blank"
                          className="text-xs text-blue-700 hover:underline dark:text-blue-200"
                        >
                          {row.route}
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {Number(row.views).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {Number(row.unique_users).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatTime(row.last_viewed_at)}
                      </td>
                    </tr>
                  ))}
                  {!data.topPages.length ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        尚无页面访问数据
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold">用户访问历史</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">用户</th>
                    <th className="px-4 py-2.5 font-medium">页面标题</th>
                    <th className="px-4 py-2.5 font-medium">路由</th>
                    <th className="px-4 py-2.5 font-medium">访问时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.history.items.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/users/${encodeURIComponent(row.user_id)}`}
                          className="font-medium text-slate-900 hover:text-blue-700 dark:hover:text-blue-200"
                        >
                          {row.display_name}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {row.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">{row.page_title}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={row.route}
                          target="_blank"
                          className="text-xs text-blue-700 hover:underline dark:text-blue-200"
                        >
                          {row.route}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatTime(row.occurred_at)}
                      </td>
                    </tr>
                  ))}
                  {!data.history.items.length ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        该题集尚无用户访问记录
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              <span>共 {data.history.total.toLocaleString()} 条记录</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                  className="border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  上一页
                </button>
                <span className="px-2 py-1.5">{page}</span>
                <button
                  disabled={page * data.history.limit >= data.history.total}
                  onClick={() => changePage(page + 1)}
                  className="border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
