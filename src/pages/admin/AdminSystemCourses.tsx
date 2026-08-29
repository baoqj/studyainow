import { BookOpenCheck, MousePointerClick, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminCourseTrend } from "../../components/admin/AdminCourseTrend";

type SystemCourse = {
  id: string;
  slug: string;
  title: string;
  topic: string;
  level: string;
  status: string;
  visibility: string;
  creator_name: string;
  chapter_count: number;
  click_count: number;
  learner_count: number;
  completed_lessons: number;
};
type Chapter = {
  id: string;
  chapter_number: number;
  title: string;
  duration_minutes: number;
  click_count: number;
  learner_count: number;
  completion_count: number;
  learning_events: number;
};
type CourseData = {
  courses: SystemCourse[];
  selected: SystemCourse | null;
  chapters: Chapter[];
  trend: Array<{ day: string; clicks: number; learners: number }>;
  readOnly?: boolean;
};

export function AdminSystemCourses() {
  const [courseId, setCourseId] = useState("");
  const [data, setData] = useState<CourseData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setError("");
    const params = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
    fetch(`/api/admin/courses/system${params}`)
      .then(async (response) => {
        const payload = (await response.json()) as CourseData & {
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "无法加载课程统计");
        return payload;
      })
      .then((payload) => {
        setData(payload);
        if (!courseId && payload.selected) setCourseId(payload.selected.id);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "无法加载课程统计"),
      );
  }, [courseId]);

  const selected = data?.selected;
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">自有课程</h1>
          <p className="mt-1 text-xs text-slate-500">
            {data?.readOnly
              ? "已发布公开课程 · Leader 只读"
              : "创建者默认 StudyAINow · 点击与学习统计"}
          </p>
        </div>
        <select
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className="min-w-0 border border-slate-200 bg-white px-3 py-2.5 text-sm sm:w-[360px]"
        >
          {data?.courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {!data ? (
        <p className="py-20 text-center text-sm text-slate-500">
          正在载入课程数据…
        </p>
      ) : selected ? (
        <>
          <section className="grid border-y border-slate-200 bg-white sm:grid-cols-4">
            <div className="px-4 py-4">
              <p className="text-[11px] text-slate-500">课程</p>
              <p
                className="mt-1 truncate text-base font-semibold"
                title={selected.title}
              >
                {selected.title}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {selected.creator_name}
              </p>
            </div>
            {[
              ["章节", selected.chapter_count, BookOpenCheck],
              ["总点击量", selected.click_count, MousePointerClick],
              ["学习用户", selected.learner_count, UsersRound],
            ].map(([label, value, Icon]) => (
              <div
                key={String(label)}
                className="border-t border-slate-100 px-4 py-4 sm:border-l sm:border-t-0"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    {label as string}
                  </p>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {Number(value).toLocaleString()}
                </p>
              </div>
            ))}
          </section>

          <section className="border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold">近 30 天</h2>
              <span className="text-xs text-slate-500">
                点击 / 去重学习用户
              </span>
            </div>
            <div className="px-2 py-3 sm:px-4">
              <AdminCourseTrend data={data.trend} />
            </div>
          </section>

          <section className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold">章节表现</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">章节</th>
                    <th className="px-4 py-2.5 font-medium">预计时长</th>
                    <th className="px-4 py-2.5 text-right font-medium">点击</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      学习用户
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      学习事件
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">完成</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.chapters.map((chapter) => (
                    <tr key={chapter.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="mr-3 font-mono text-xs text-slate-400">
                          {String(chapter.chapter_number).padStart(2, "0")}
                        </span>
                        <span className="font-medium">
                          {chapter.title.replace(/^\d+\.\s*/, "")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {chapter.duration_minutes} 分钟
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {chapter.click_count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {chapter.learner_count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {chapter.learning_events}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {chapter.completion_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">
              全部自有课程
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">课程</th>
                    <th className="px-4 py-2.5 font-medium">创建者</th>
                    <th className="px-4 py-2.5 font-medium">状态</th>
                    <th className="px-4 py-2.5 font-medium">可见性</th>
                    <th className="px-4 py-2.5 text-right font-medium">章节</th>
                    <th className="px-4 py-2.5 text-right font-medium">点击</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      学习用户
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.courses.map((course) => (
                    <tr
                      key={course.id}
                      onClick={() => setCourseId(course.id)}
                      className={`cursor-pointer hover:bg-slate-50 ${course.id === selected.id ? "bg-lime-50/50 dark:bg-blue-900/35" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{course.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {course.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3">{course.creator_name}</td>
                      <td className="px-4 py-3">{course.status}</td>
                      <td className="px-4 py-3">{course.visibility}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {course.chapter_count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {course.click_count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {course.learner_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p className="border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500">
          暂无自有课程
        </p>
      )}
    </div>
  );
}
