import {
  Building2,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Search,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type OrganizationRow = {
  id: string;
  public_id: string;
  name: string;
  type: string;
  status: string;
  member_count: number;
  leader_name: string | null;
  leader_email: string | null;
  created_at: string;
  last_active_at: string | null;
};
type OrganizationsPayload = {
  organizations: OrganizationRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    total: number;
    active: number;
    inactive: number;
    members: number;
    with_leader: number;
  };
  error?: string;
};
type CreatedInvite = { code: string; link: string; expiresAt: string };

const typeLabels: Record<string, string> = {
  company: "企业",
  school: "学校",
  training: "培训机构",
  community: "社群",
  other: "其他",
};

export function AdminOrganizations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<OrganizationsPayload | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<CreatedInvite | null>(
    null,
  );
  const [form, setForm] = useState({
    name: "",
    type: "company",
    contactName: "",
    contactEmail: "",
    description: "",
    notes: "",
  });
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const sort = searchParams.get("sort") ?? "created";
  const direction = searchParams.get("direction") ?? "desc";

  const load = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      limit: "40",
      sort,
      direction,
    });
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    try {
      const response = await fetch(`/api/admin/organizations?${params}`);
      const payload = (await response
        .json()
        .catch(() => ({}))) as OrganizationsPayload;
      if (!response.ok) throw new Error(payload.error ?? "无法加载组织");
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法加载组织");
    }
  }, [direction, page, query, sort, status]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateQuery(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setCreatedInvite(null);
    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        invitation?: CreatedInvite;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "创建组织失败");
      setCreatedInvite(payload.invitation ?? null);
      setForm({
        name: "",
        type: "company",
        contactName: "",
        contactEmail: "",
        description: "",
        notes: "",
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建组织失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">组织管理</h1>
          <p className="mt-1 text-xs text-slate-500">
            组织、成员、Leader、邀请与运营消息
          </p>
        </div>
        <button
          className="admin-primary-action inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
          onClick={() => setCreating((value) => !value)}
        >
          <Plus className="h-4 w-4" />
          创建组织{" "}
          {creating ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {data ? (
        <section className="grid border-y border-slate-200 bg-white sm:grid-cols-5">
          {[
            ["组织", data.summary.total],
            ["活跃", data.summary.active],
            ["停用", data.summary.inactive],
            ["成员", data.summary.members],
            ["已设 Leader", data.summary.with_leader],
          ].map(([label, value], index) => (
            <div
              key={String(label)}
              className={`px-4 py-3 ${index ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`}
            >
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {Number(value).toLocaleString()}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {creating ? (
        <form onSubmit={create} className="border border-slate-200 bg-white">
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-medium">
              组织名称
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              类型
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value })
                }
                className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              联系人
              <input
                value={form.contactName}
                onChange={(event) =>
                  setForm({ ...form, contactName: event.target.value })
                }
                className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              联系邮箱
              <input
                type="email"
                value={form.contactEmail}
                onChange={(event) =>
                  setForm({ ...form, contactEmail: event.target.value })
                }
                className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium md:col-span-2">
              简介
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="mt-1 min-h-20 w-full border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium md:col-span-2">
              内部备注
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                className="mt-1 min-h-20 w-full border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
          </div>
          <div className="flex items-center justify-end border-t border-slate-200 px-4 py-3">
            <button
              disabled={saving}
              className="admin-primary-action px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "创建中…" : "确认创建"}
            </button>
          </div>
        </form>
      ) : null}

      {createdInvite ? (
        <div className="border-l-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-[#123f4b] dark:text-emerald-100">
          <p className="font-semibold">
            组织已创建。邀请码仅在本次显示，请立即保存。
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 break-all bg-white px-3 py-2 dark:bg-[#0c2949]">
              {createdInvite.link}
            </code>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText(createdInvite.link)
              }
              className="inline-flex items-center justify-center gap-2 border border-emerald-300 bg-white px-3 py-2 font-medium dark:bg-[#102f53]"
            >
              <Copy className="h-4 w-4" />
              复制链接
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">
          {error}
        </p>
      ) : null}

      <section className="border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 lg:max-w-lg">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              defaultValue={query}
              onKeyDown={(event) => {
                if (event.key === "Enter")
                  updateQuery("q", event.currentTarget.value.trim());
              }}
              placeholder="名称、组织 ID、Leader 或邮箱"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(event) => updateQuery("status", event.target.value)}
            className="border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="active">活跃</option>
            <option value="inactive">停用</option>
          </select>
          <select
            value={`${sort}:${direction}`}
            onChange={(event) => {
              const [nextSort, nextDirection] = event.target.value.split(":");
              const next = new URLSearchParams(searchParams);
              next.set("sort", nextSort);
              next.set("direction", nextDirection);
              next.delete("page");
              setSearchParams(next);
            }}
            className="border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="created:desc">最新创建</option>
            <option value="created:asc">最早创建</option>
            <option value="members:desc">成员最多</option>
            <option value="members:asc">成员最少</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">组织</th>
                <th className="px-4 py-2.5 font-medium">类型</th>
                <th className="px-4 py-2.5 font-medium">状态</th>
                <th className="px-4 py-2.5 text-right font-medium">成员</th>
                <th className="px-4 py-2.5 font-medium">Leader</th>
                <th className="px-4 py-2.5 font-medium">创建时间</th>
                <th className="px-4 py-2.5 font-medium">最近活跃</th>
                <th className="px-4 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.organizations.map((organization) => (
                <tr key={organization.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/organizations/${organization.id}`}
                      className="font-semibold text-blue-800 hover:underline dark:text-blue-100"
                    >
                      {organization.name}
                    </Link>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {organization.public_id}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {typeLabels[organization.type] ?? organization.type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium ${organization.status === "active" ? "bg-emerald-50 text-emerald-800 dark:bg-[#123f4b] dark:text-emerald-100" : "bg-slate-100 text-slate-600"}`}
                    >
                      {organization.status === "active" ? "活跃" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {organization.member_count}
                  </td>
                  <td className="px-4 py-3">
                    <p>{organization.leader_name ?? "未设置"}</p>
                    <p className="text-xs text-slate-500">
                      {organization.leader_email ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {organization.created_at}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {organization.last_active_at ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/organizations/${organization.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 dark:text-blue-100"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
              {!data?.organizations.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-14 text-center text-slate-500"
                  >
                    暂无组织
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          <span>共 {data?.total ?? 0} 个组织</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateQuery("page", String(page - 1))}
              className="border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
            >
              上一页
            </button>
            <span className="px-2 py-1.5">{page}</span>
            <button
              disabled={!data || page * data.limit >= data.total}
              onClick={() => updateQuery("page", String(page + 1))}
              className="border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
