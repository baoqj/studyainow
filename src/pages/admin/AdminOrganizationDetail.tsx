import {
  ArrowLeft,
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

type Organization = {
  id: string;
  public_id: string;
  name: string;
  type: string;
  description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  status: string;
  leader_user_id: string | null;
  leader_name: string | null;
  leader_email: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
  resolved_last_active_at: string | null;
};
type Permission = { administrator: boolean; leader: boolean };
type Member = {
  id: string;
  email: string;
  display_name: string;
  username: string | null;
  organization_role: string | null;
  organization_joined_at: string | null;
  last_login_at: string | null;
  is_administrator: number;
};
type Candidate = {
  id: string;
  email: string;
  display_name: string;
  organization_id: string | null;
  organization_name: string | null;
  is_administrator: number;
};
type Invite = {
  id: string;
  code_hint: string;
  resolved_status: string;
  expires_at: string;
  max_uses: number | null;
  used_count: number;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_by_name: string;
};
type Message = {
  id: string;
  message_type: string;
  title: string;
  body: string;
  content_refs_json: string;
  target_rule: string;
  recipient_count: number;
  sender_name: string;
  sent_at: string;
  delivered_count: number;
  failed_count: number;
};
type Audit = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  before_json: string | null;
  after_json: string | null;
  request_id: string | null;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
};
type ContentItem = {
  id: string;
  title: string;
  slug?: string;
  company_name?: string;
  publicRoute?: string;
  location_text?: string;
};

const tabs = [
  ["basic", "基本信息"],
  ["members", "成员与 Leader"],
  ["invites", "邀请注册链接"],
  ["messages", "组织消息记录"],
  ["audit", "操作日志"],
] as const;
type Tab = (typeof tabs)[number][0];
const typeLabels: Record<string, string> = {
  company: "企业",
  school: "学校",
  training: "培训机构",
  community: "社群",
  other: "其他",
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error ?? "请求失败");
  return payload;
}

function formatJson(value: string | null) {
  if (!value) return "—";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function AdminOrganizationDetail({ my = false }: { my?: boolean }) {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [permissions, setPermissions] = useState<Permission>({
    administrator: false,
    leader: false,
  });
  const [error, setError] = useState("");
  const requestedTab = searchParams.get("tab") as Tab | null;
  const activeTab = tabs.some(([value]) => value === requestedTab)
    ? requestedTab!
    : "basic";
  const tabScroller = useRef<HTMLDivElement | null>(null);
  const tabButtons = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const requestedId = my ? null : params.organizationId;

  const load = useCallback(async () => {
    setError("");
    try {
      const payload = await api<{
        organization: Organization;
        permissions: Permission;
      }>(
        my
          ? "/api/admin/my-organization"
          : `/api/admin/organizations/${encodeURIComponent(requestedId ?? "")}`,
      );
      setOrganization(payload.organization);
      setPermissions(payload.permissions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法加载组织");
    }
  }, [my, requestedId]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const scroller = tabScroller.current;
    const button = tabButtons.current[activeTab];
    if (!scroller || !button) return;
    scroller.scrollLeft = Math.max(
      0,
      button.offsetLeft - (scroller.clientWidth - button.offsetWidth) / 2,
    );
  }, [activeTab, organization?.id]);

  function selectTab(tab: Tab) {
    const next = new URLSearchParams(searchParams);
    if (tab === "basic") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next);
  }

  if (!organization)
    return (
      <div className="space-y-4">
        {!my ? (
          <Link
            to="/admin/organizations"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-100"
          >
            <ArrowLeft className="h-4 w-4" />
            返回组织列表
          </Link>
        ) : null}
        {error ? (
          <p className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">
            {error}
          </p>
        ) : (
          <p className="py-20 text-center text-sm text-slate-500">
            正在加载组织…
          </p>
        )}
      </div>
    );
  const base = `/api/admin/organizations/${encodeURIComponent(organization.id)}`;

  return (
    <div className="space-y-5">
      {!my ? (
        <Link
          to="/admin/organizations"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-100"
        >
          <ArrowLeft className="h-4 w-4" />
          返回组织列表
        </Link>
      ) : null}
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {organization.name}
            </h1>
            <span
              className={`px-2 py-1 text-xs font-medium ${organization.status === "active" ? "bg-emerald-50 text-emerald-800 dark:bg-[#123f4b] dark:text-emerald-100" : "bg-slate-100 text-slate-600"}`}
            >
              {organization.status === "active" ? "活跃" : "停用"}
            </span>
            {permissions.leader ? (
              <span className="bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-[#173f69] dark:text-blue-100">
                Leader 范围
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {organization.public_id}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-7 gap-y-1 text-xs sm:grid-cols-3">
          <p>
            <span className="text-slate-500">成员</span>{" "}
            <b className="ml-1 tabular-nums">{organization.member_count}</b>
          </p>
          <p>
            <span className="text-slate-500">Leader</span>{" "}
            <b className="ml-1">{organization.leader_name ?? "未设置"}</b>
          </p>
          <p>
            <span className="text-slate-500">创建</span>{" "}
            <b className="ml-1">{organization.created_at.slice(0, 10)}</b>
          </p>
        </div>
      </div>
      {error ? (
        <p className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">
          {error}
        </p>
      ) : null}
      <div ref={tabScroller} className="overflow-x-auto border-b border-slate-200">
        <div role="tablist" className="flex min-w-max gap-1">
          {tabs.map(([value, label]) => (
            <button
              ref={(element) => {
                tabButtons.current[value] = element;
              }}
              key={value}
              role="tab"
              aria-selected={activeTab === value}
              onClick={() => selectTab(value)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium ${activeTab === value ? "border-blue-700 text-blue-800 dark:border-blue-200 dark:text-blue-100" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {activeTab === "basic" ? (
        <BasicTab
          organization={organization}
          administrator={permissions.administrator}
          base={base}
          onSaved={(next) => setOrganization(next)}
        />
      ) : null}
      {activeTab === "members" ? (
        <MembersTab
          organization={organization}
          administrator={permissions.administrator}
          base={base}
          onChanged={load}
        />
      ) : null}
      {activeTab === "invites" ? <InvitesTab base={base} /> : null}
      {activeTab === "messages" ? <MessagesTab base={base} /> : null}
      {activeTab === "audit" ? <AuditTab base={base} /> : null}
    </div>
  );
}

function BasicTab({
  organization,
  administrator,
  base,
  onSaved,
}: {
  organization: Organization;
  administrator: boolean;
  base: string;
  onSaved: (organization: Organization) => void;
}) {
  const [form, setForm] = useState({
    name: organization.name,
    type: organization.type,
    status: organization.status,
    description: organization.description ?? "",
    contactName: organization.contact_name ?? "",
    contactEmail: organization.contact_email ?? "",
    notes: organization.notes ?? "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!administrator) return;
    if (
      form.status !== organization.status &&
      !window.confirm(
        form.status === "inactive"
          ? "停用后邀请码立即失效，Leader 也会立即失去后台权限。确认停用？"
          : "确认重新启用该组织？",
      )
    )
      return;
    setSaving(true);
    setMessage("");
    try {
      const payload = await api<{ organization: Organization }>(base, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          expectedUpdatedAt: organization.updated_at,
        }),
      });
      onSaved(payload.organization);
      setMessage("已保存");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }
  const input =
    "mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-70";
  return (
    <form onSubmit={submit} className="border border-slate-200 bg-white">
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-xs font-medium">
          组织名称
          <input
            disabled={!administrator}
            required
            className={input}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className="text-xs font-medium">
          类型
          <select
            disabled={!administrator}
            className={input}
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          状态
          <select
            disabled={!administrator}
            className={input}
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value })
            }
          >
            <option value="active">活跃</option>
            <option value="inactive">停用</option>
          </select>
        </label>
        <label className="text-xs font-medium">
          联系人
          <input
            disabled={!administrator}
            className={input}
            value={form.contactName}
            onChange={(event) =>
              setForm({ ...form, contactName: event.target.value })
            }
          />
        </label>
        <label className="text-xs font-medium">
          联系邮箱
          <input
            disabled={!administrator}
            type="email"
            className={input}
            value={form.contactEmail}
            onChange={(event) =>
              setForm({ ...form, contactEmail: event.target.value })
            }
          />
        </label>
        <label className="text-xs font-medium">
          最近活跃
          <input
            disabled
            className={input}
            value={organization.resolved_last_active_at ?? "—"}
          />
        </label>
        <label className="text-xs font-medium md:col-span-2 xl:col-span-3">
          简介
          <textarea
            disabled={!administrator}
            className={`${input} min-h-24`}
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </label>
        {administrator ? (
          <label className="text-xs font-medium md:col-span-2 xl:col-span-3">
            内部备注
            <textarea
              className={`${input} min-h-24`}
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </label>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <span className="text-xs text-slate-500">
          {administrator
            ? "组织 ID 不可修改或复用。"
            : "Leader 只能查看组织基础信息。"}
        </span>
        {administrator ? (
          <button
            disabled={saving}
            className="admin-primary-action px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        ) : null}
        {message ? (
          <span className="text-xs text-blue-800 dark:text-blue-100">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function MembersTab({
  organization,
  administrator,
  base,
  onChanged,
}: {
  organization: Organization;
  administrator: boolean;
  base: string;
  onChanged: () => Promise<void>;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      const payload = await api<{ members: Member[] }>(
        `${base}/members?limit=100`,
      );
      setMembers(payload.members);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法加载成员");
    }
  }, [base]);
  useEffect(() => {
    void load();
  }, [load]);
  async function search() {
    setError("");
    try {
      const payload = await api<{ candidates: Candidate[] }>(
        `${base}/members?mode=candidates&q=${encodeURIComponent(query)}&limit=50`,
      );
      setCandidates(payload.candidates);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "搜索失败");
    }
  }
  async function mutate(
    method: "POST" | "DELETE",
    userId: string,
    confirmMigration = false,
  ) {
    setBusy(userId);
    setError("");
    try {
      await api(base + "/members", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, confirmMigration }),
      });
      await Promise.all([load(), onChanged()]);
      setCandidates((current) => current.filter((item) => item.id !== userId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
    } finally {
      setBusy("");
    }
  }
  function addCandidate(user: Candidate) {
    if (user.organization_id && administrator) {
      if (
        !window.confirm(
          `该用户属于「${user.organization_name}」。确认迁移到当前组织？`,
        )
      )
        return;
      void mutate("POST", user.id, true);
      return;
    }
    void mutate("POST", user.id);
  }
  async function leader(userId: string | null) {
    if (
      !window.confirm(
        userId
          ? `确认将该成员设为「${organization.name}」的 Leader？原 Leader 将立即降为普通成员。`
          : "确认撤销当前 Leader？该成员会保留为普通成员。",
      )
    )
      return;
    setBusy(userId ?? "revoke");
    try {
      await api(`${base}/leader`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          confirm: true,
          expectedUpdatedAt: organization.updated_at,
        }),
      });
      await Promise.all([load(), onChanged()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Leader 变更失败");
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-4">
      {error ? (
        <p className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">
          {error}
        </p>
      ) : null}
      <section className="border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void search();
              }}
              placeholder="邮箱、用户 ID 或昵称"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <button
            onClick={() => void search()}
            className="admin-primary-action inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            搜索可加入用户
          </button>
        </div>
        {candidates.length ? (
          <div className="overflow-x-auto border-b border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-blue-50 text-xs text-slate-500 dark:bg-[#173f69]">
                <tr>
                  <th className="px-4 py-2 font-medium">候选用户</th>
                  <th className="px-4 py-2 font-medium">当前组织</th>
                  <th className="px-4 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.display_name}</p>
                      <p className="text-xs text-slate-500">
                        {user.email} · {user.id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {user.organization_name ?? "未归属"}
                      {user.is_administrator ? " · Administrator" : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={busy === user.id}
                        onClick={() => addCandidate(user)}
                        className="text-xs font-semibold text-blue-800 disabled:opacity-40 dark:text-blue-100"
                      >
                        加入组织
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">成员</th>
                <th className="px-4 py-2.5 font-medium">组织身份</th>
                <th className="px-4 py-2.5 font-medium">加入时间</th>
                <th className="px-4 py-2.5 font-medium">最近登录</th>
                <th className="px-4 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {member.display_name}
                      {member.is_administrator ? (
                        <span className="ml-2 text-xs text-blue-700 dark:text-blue-200">
                          Administrator
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {member.email} · {member.id}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {member.organization_role === "leader" ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-800 dark:text-blue-100">
                        <ShieldCheck className="h-4 w-4" />
                        Leader
                      </span>
                    ) : (
                      "Member"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {member.organization_joined_at ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {member.last_login_at ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {administrator &&
                      member.organization_role !== "leader" ? (
                        <button
                          disabled={Boolean(busy)}
                          onClick={() => void leader(member.id)}
                          className="text-xs font-semibold text-blue-800 dark:text-blue-100"
                        >
                          设为 Leader
                        </button>
                      ) : null}
                      {administrator &&
                      member.organization_role === "leader" ? (
                        <button
                          disabled={Boolean(busy)}
                          onClick={() => void leader(null)}
                          className="text-xs font-semibold text-amber-700 dark:text-amber-200"
                        >
                          撤销 Leader
                        </button>
                      ) : null}
                      {administrator ||
                      member.organization_role !== "leader" ? (
                        <button
                          disabled={Boolean(busy)}
                          onClick={() => {
                            if (
                              window.confirm(
                                `确认移出 ${member.display_name}？账户与学习记录会保留。`,
                              )
                            )
                              void mutate("DELETE", member.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 disabled:opacity-40 dark:text-red-300"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          移出
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!members.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    暂无成员
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          Leader 只能加入未归属用户；跨组织迁移和 Leader 任免仅 Administrator
          可操作。
        </div>
      </section>
    </div>
  );
}

function InvitesTab({ base }: { base: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [validDays, setValidDays] = useState(30);
  const [maxUses, setMaxUses] = useState("");
  const [revealed, setRevealed] = useState<{
    link: string;
    code: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      const payload = await api<{ invites: Invite[] }>(`${base}/invites`);
      setInvites(payload.invites);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法加载邀请");
    }
  }, [base]);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(replaceInviteId?: string) {
    setBusy(replaceInviteId ?? "new");
    setRevealed(null);
    try {
      const payload = await api<{ invitation: { code: string; link: string } }>(
        `${base}/invites`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            validDays,
            maxUses: maxUses ? Number(maxUses) : null,
            replaceInviteId,
          }),
        },
      );
      setRevealed(payload.invitation);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建邀请失败");
    } finally {
      setBusy("");
    }
  }
  async function revoke(id: string) {
    if (!window.confirm("撤销后该邀请链接立即失效，确认继续？")) return;
    setBusy(id);
    try {
      await api(`${base}/invites/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "撤销失败");
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="space-y-4">
      {revealed ? (
        <div className="border-l-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-[#123f4b] dark:text-emerald-100">
          <p className="font-semibold">新邀请码仅在本次显示，请立即保存。</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 break-all bg-white px-3 py-2 dark:bg-[#0c2949]">
              {revealed.link}
            </code>
            <button
              onClick={() => void navigator.clipboard.writeText(revealed.link)}
              className="inline-flex items-center justify-center gap-2 border border-emerald-300 bg-white px-3 py-2 font-medium dark:bg-[#102f53]"
            >
              <Copy className="h-4 w-4" />
              复制
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
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-end">
          <label className="text-xs font-medium">
            有效天数
            <input
              type="number"
              min={1}
              max={365}
              value={validDays}
              onChange={(event) => setValidDays(Number(event.target.value))}
              className="mt-1 w-full border border-slate-200 px-3 py-2 text-sm sm:w-32"
            />
          </label>
          <label className="text-xs font-medium">
            最多使用次数（留空不限）
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              className="mt-1 w-full border border-slate-200 px-3 py-2 text-sm sm:w-48"
            />
          </label>
          <button
            disabled={Boolean(busy)}
            onClick={() => void create()}
            className="admin-primary-action px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            创建邀请
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">邀请码</th>
                <th className="px-4 py-2.5 font-medium">状态</th>
                <th className="px-4 py-2.5 font-medium">使用</th>
                <th className="px-4 py-2.5 font-medium">到期时间</th>
                <th className="px-4 py-2.5 font-medium">创建者 / 时间</th>
                <th className="px-4 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {invite.code_hint}
                  </td>
                  <td className="px-4 py-3">{invite.resolved_status}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {invite.used_count} / {invite.max_uses ?? "∞"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {invite.expires_at}
                  </td>
                  <td className="px-4 py-3">
                    <p>{invite.created_by_name}</p>
                    <p className="text-xs text-slate-500">
                      {invite.created_at}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {invite.resolved_status === "active" ? (
                        <>
                          <button
                            disabled={Boolean(busy)}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "刷新将创建新邀请并撤销当前邀请，确认继续？",
                                )
                              )
                                void create(invite.id);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 dark:text-blue-100"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            刷新
                          </button>
                          <button
                            disabled={Boolean(busy)}
                            onClick={() => void revoke(invite.id)}
                            className="text-xs font-semibold text-red-600 dark:text-red-300"
                          >
                            撤销
                          </button>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!invites.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    暂无邀请
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MessagesTab({ base }: { base: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [content, setContent] = useState<{
    courses: ContentItem[];
    jobs: ContentItem[];
    interviews: ContentItem[];
  }>({ courses: [], jobs: [], interviews: [] });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    type: "notice",
    title: "",
    body: "",
    actionUrl: "",
    target: "all",
    contentIds: [] as string[],
    recipientIds: [] as string[],
  });
  const load = useCallback(async () => {
    try {
      const [messagePayload, memberPayload, contentPayload] = await Promise.all(
        [
          api<{ messages: Message[] }>(`${base}/messages?limit=100`),
          api<{ members: Member[] }>(`${base}/members?limit=100`),
          api<typeof content>(`${base}/content`),
        ],
      );
      setMessages(messagePayload.messages);
      setMembers(memberPayload.members);
      setContent(contentPayload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法加载组织消息");
    }
  }, [base]);
  useEffect(() => {
    void load();
  }, [load]);
  const choices =
    form.type === "course"
      ? content.courses
      : form.type === "job"
        ? content.jobs
        : form.type === "interview"
          ? content.interviews
          : [];
  const recipientCount =
    form.target === "all" ? members.length : form.recipientIds.length;
  function toggle(key: "contentIds" | "recipientIds", id: string) {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id)
        ? current[key].filter((value) => value !== id)
        : [...current[key], id],
    }));
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (
      !window.confirm(
        `确认发送「${form.title}」给 ${recipientCount} 名成员？消息发送后不可编辑。`,
      )
    )
      return;
    setSending(true);
    setError("");
    try {
      await api(`${base}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, requestId: crypto.randomUUID() }),
      });
      setForm({
        type: "notice",
        title: "",
        body: "",
        actionUrl: "",
        target: "all",
        contentIds: [],
        recipientIds: [],
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "发送失败");
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="space-y-4">
      {error ? (
        <p className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">
          {error}
        </p>
      ) : null}
      <form onSubmit={send} className="border border-slate-200 bg-white">
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <label className="text-xs font-medium">
            消息类型
            <select
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value, contentIds: [] })
              }
              className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="notice">普通通知</option>
              <option value="course">推荐课程</option>
              <option value="job">推荐职位</option>
              <option value="interview">推荐面试题集</option>
            </select>
          </label>
          <label className="text-xs font-medium">
            标题
            <input
              required
              maxLength={120}
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium lg:col-span-2">
            正文
            <textarea
              required
              maxLength={2000}
              value={form.body}
              onChange={(event) =>
                setForm({ ...form, body: event.target.value })
              }
              className="mt-1 min-h-24 w-full border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          {form.type === "notice" ? (
            <label className="text-xs font-medium lg:col-span-2">
              站内跳转路径（选填）
              <input
                value={form.actionUrl}
                onChange={(event) =>
                  setForm({ ...form, actionUrl: event.target.value })
                }
                placeholder="/courses"
                className="mt-1 w-full border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
          ) : (
            <fieldset className="lg:col-span-2">
              <legend className="mb-2 text-xs font-medium">
                选择已发布内容
              </legend>
              <div className="max-h-56 overflow-y-auto border border-slate-200">
                {choices.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={form.contentIds.includes(item.id)}
                      onChange={() => toggle("contentIds", item.id)}
                    />
                    <span className="text-sm">
                      <b>{item.title}</b>
                      <span className="ml-2 text-xs text-slate-500">
                        {item.company_name ?? item.slug ?? item.publicRoute}
                      </span>
                    </span>
                  </label>
                ))}
                {!choices.length ? (
                  <p className="px-3 py-8 text-center text-sm text-slate-500">
                    没有可推荐的已发布内容
                  </p>
                ) : null}
              </div>
            </fieldset>
          )}
          <fieldset className="lg:col-span-2">
            <legend className="mb-2 text-xs font-medium">接收成员</legend>
            <div className="flex gap-4 border border-slate-200 bg-slate-50 px-3 py-2">
              <label className="text-sm">
                <input
                  type="radio"
                  checked={form.target === "all"}
                  onChange={() => setForm({ ...form, target: "all" })}
                />{" "}
                全部成员（{members.length}）
              </label>
              <label className="text-sm">
                <input
                  type="radio"
                  checked={form.target === "selected"}
                  onChange={() => setForm({ ...form, target: "selected" })}
                />{" "}
                手动选择
              </label>
            </div>
            {form.target === "selected" ? (
              <div className="mt-2 max-h-56 overflow-y-auto border border-slate-200">
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={form.recipientIds.includes(member.id)}
                      onChange={() => toggle("recipientIds", member.id)}
                    />
                    <span className="text-sm">
                      <b>{member.display_name}</b>
                      <span className="ml-2 text-xs text-slate-500">
                        {member.email}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-xs text-slate-500">
            发送后不可编辑 · 预计接收 {recipientCount} 人
          </span>
          <button
            disabled={sending || recipientCount < 1}
            className="admin-primary-action inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {sending ? "发送中…" : "预览并发送"}
          </button>
        </div>
      </form>
      <section className="border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">消息</th>
                <th className="px-4 py-2.5 font-medium">类型</th>
                <th className="px-4 py-2.5 font-medium">接收规则</th>
                <th className="px-4 py-2.5 text-right font-medium">投递</th>
                <th className="px-4 py-2.5 font-medium">发送人</th>
                <th className="px-4 py-2.5 font-medium">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((message) => (
                <tr key={message.id}>
                  <td className="max-w-xl px-4 py-3">
                    <p className="font-medium">{message.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {message.body}
                    </p>
                  </td>
                  <td className="px-4 py-3">{message.message_type}</td>
                  <td className="px-4 py-3">
                    {message.target_rule === "all" ? "全部成员" : "手动选择"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {message.delivered_count}/{message.recipient_count}
                    {message.failed_count ? (
                      <span className="ml-1 text-red-600">
                        失败 {message.failed_count}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{message.sender_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {message.sent_at}
                  </td>
                </tr>
              ))}
              {!messages.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    暂无发送记录
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AuditTab({ base }: { base: string }) {
  const [logs, setLogs] = useState<Audit[]>([]);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const search = useCallback(async () => {
    try {
      const payload = await api<{ logs: Audit[] }>(
        `${base}/audit?limit=100&search=${encodeURIComponent(query)}&action=${encodeURIComponent(action)}`,
      );
      setLogs(payload.logs);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法加载日志");
    }
  }, [action, base, query]);
  useEffect(() => {
    void search();
  }, [search]);
  const actions = useMemo(
    () => [...new Set(logs.map((log) => log.action))].sort(),
    [logs],
  );
  return (
    <section className="border border-slate-200 bg-white">
      {error ? (
        <p className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-[#4b2532] dark:text-red-100">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 border-b border-slate-200 p-3 sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="操作或目标 ID"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={action}
          onChange={(event) => setAction(event.target.value)}
          className="border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">全部操作</option>
          {actions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          onClick={() => void search()}
          className="admin-primary-action px-4 py-2 text-sm font-semibold"
        >
          查询
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1160px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">时间</th>
              <th className="px-4 py-2.5 font-medium">操作者</th>
              <th className="px-4 py-2.5 font-medium">操作</th>
              <th className="px-4 py-2.5 font-medium">目标</th>
              <th className="px-4 py-2.5 font-medium">变更前</th>
              <th className="px-4 py-2.5 font-medium">变更后</th>
              <th className="px-4 py-2.5 font-medium">请求 ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {log.created_at}
                </td>
                <td className="px-4 py-3">
                  <p>{log.actor_name ?? "系统"}</p>
                  <p className="text-xs text-slate-500">
                    {log.actor_email ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3 text-xs">
                  {log.target_type}
                  <p className="font-mono text-slate-500">
                    {log.target_id ?? "—"}
                  </p>
                </td>
                <td className="max-w-xs px-4 py-3">
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-[10px] text-slate-500">
                    {formatJson(log.before_json)}
                  </pre>
                </td>
                <td className="max-w-xs px-4 py-3">
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-[10px] text-slate-500">
                    {formatJson(log.after_json)}
                  </pre>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                  {log.request_id ?? "—"}
                </td>
              </tr>
            ))}
            {!logs.length ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  暂无操作日志
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
