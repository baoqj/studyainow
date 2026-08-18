import { ArrowLeft, Check, ChevronDown, Download, FileText, LoaderCircle, Pencil, Plus, Sparkles, Trash2, Upload, WandSparkles, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../../data/courseContent';
import { getResumeCopy, type ResumeCopy } from '../../data/resumeCopy';

type JsonRecord = Record<string, unknown>;
type CareerProfile = {
  personal: { fullName: string; email: string; phone: string; location: string; website: string; linkedin: string; github: string; targetRole: string };
  summary: string;
  skills: string[];
  experience: JsonRecord[];
  projects: JsonRecord[];
  education: JsonRecord[];
  certifications: JsonRecord[];
};
type ResumeTemplate = { id: string; name: string; targetRole: string; selectedSkills: string[]; updatedAt?: string };
type ResumeDocument = {
  contact?: CareerProfile['personal']; title?: string; summary?: string; skills?: string[]; experience?: JsonRecord[]; projects?: JsonRecord[];
  education?: JsonRecord[]; certifications?: JsonRecord[]; coverLetter?: string; generatedBy?: string; requiresTruthConfirmation?: boolean; templateName?: string; outputLocale?: AppLocale;
};
type ResumeVersion = { id: string; jobTitle: string; companyName: string; document: ResumeDocument; match: { score?: number; matchedSkills?: string[]; gaps?: string[] }; createdAt: string };
type ResumeSource = { id: string; filename: string; status: 'parsed' | 'needs_review' | 'failed'; provider: 'deepseek' | 'gpt' | 'fallback' | 'unavailable'; note: string; extractedTextLength: number; extracted: JsonRecord; retainedInR2: boolean; createdAt: string };
type ResumeResponse = { resume: { id: string; name: string; status: 'draft' | 'completed'; profile: CareerProfile; createdAt: string; updatedAt: string }; templates: ResumeTemplate[]; versions: ResumeVersion[]; sources: ResumeSource[] };
type BookmarkedJob = { id: string; slug: string; title: string; companyName: string; responsibilities: string[]; skills: string[] };

const RESUME_OUTPUT_LOCALES: AppLocale[] = ['zh-CN', 'zh-TW', 'en', 'fr', 'es'];

const jobSelectorCopy: Record<AppLocale, {
  outputLanguage: string; languageNames: Record<AppLocale, string>; savedJobs: string; savedJobsIntro: string;
  loading: string; empty: string; selectOne: string; fullNameRequired: string; selected: string; responsibilities: string; requiredSkills: string; expand: string; collapse: string;
}> = {
  'zh-CN': { outputLanguage: '简历生成语种', languageNames: { 'zh-CN': '简体中文', 'zh-TW': '繁體中文（港澳台表达）', en: 'English', fr: 'Français', es: 'Español' }, savedJobs: '已收藏的职位', savedJobsIntro: '选择最多 5 个职位作为职责与技能参考。仅使用你已保存的真实经历生成内容。', loading: '正在加载已收藏职位…', empty: '还没有已收藏的职位。请先在工作机会页面收藏职位。', selectOne: '请选择至少一个已收藏职位。', fullNameRequired: '请先填写姓名。', selected: '已选择', responsibilities: '工作职责', requiredSkills: '所需技能', expand: '展开职位参考', collapse: '收起职位参考' },
  'zh-TW': { outputLanguage: '履歷產生語言', languageNames: { 'zh-CN': '簡體中文', 'zh-TW': '繁體中文（香港、台灣用語）', en: 'English', fr: 'Français', es: 'Español' }, savedJobs: '已收藏職位', savedJobsIntro: '最多選擇 5 個職位作為職責與技能參考。系統僅會使用你已儲存的真實經歷產生內容。', loading: '正在載入已收藏職位…', empty: '尚未收藏職位。請先到工作機會頁面收藏職位。', selectOne: '請至少選擇一個已收藏職位。', fullNameRequired: '請先填寫姓名。', selected: '已選擇', responsibilities: '工作職責', requiredSkills: '所需技能', expand: '展開職位參考', collapse: '收合職位參考' },
  en: { outputLanguage: 'Resume output language', languageNames: { 'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese (Hong Kong/Taiwan usage)', en: 'English', fr: 'French', es: 'Spanish' }, savedJobs: 'Saved jobs', savedJobsIntro: 'Select up to five jobs as responsibility and skill references. Only your saved, real career facts are used in the resume.', loading: 'Loading saved jobs…', empty: 'No saved jobs yet. Bookmark a role from the Jobs page first.', selectOne: 'Select at least one saved job.', fullNameRequired: 'Enter your full name first.', selected: 'selected', responsibilities: 'Responsibilities', requiredSkills: 'Required skills', expand: 'Expand job reference', collapse: 'Collapse job reference' },
  fr: { outputLanguage: 'Langue du CV généré', languageNames: { 'zh-CN': 'Chinois simplifié', 'zh-TW': 'Chinois traditionnel (usage Hong Kong/Taïwan)', en: 'Anglais', fr: 'Français', es: 'Espagnol' }, savedJobs: 'Offres enregistrées', savedJobsIntro: 'Sélectionnez jusqu’à cinq offres comme références de responsabilités et de compétences. Le CV n’utilise que vos faits professionnels enregistrés et réels.', loading: 'Chargement des offres enregistrées…', empty: 'Aucune offre enregistrée. Ajoutez d’abord un signet depuis la page Emplois.', selectOne: 'Sélectionnez au moins une offre enregistrée.', fullNameRequired: 'Saisissez d’abord votre nom complet.', selected: 'sélectionnée(s)', responsibilities: 'Responsabilités', requiredSkills: 'Compétences requises', expand: 'Développer la référence de l’offre', collapse: 'Réduire la référence de l’offre' },
  es: { outputLanguage: 'Idioma del CV generado', languageNames: { 'zh-CN': 'Chino simplificado', 'zh-TW': 'Chino tradicional (uso de Hong Kong/Taiwán)', en: 'Inglés', fr: 'Francés', es: 'Español' }, savedJobs: 'Empleos guardados', savedJobsIntro: 'Selecciona hasta cinco empleos como referencia de responsabilidades y habilidades. El CV usa únicamente hechos profesionales reales que ya guardaste.', loading: 'Cargando empleos guardados…', empty: 'Aún no hay empleos guardados. Guarda un empleo desde la página de empleos.', selectOne: 'Selecciona al menos un empleo guardado.', fullNameRequired: 'Introduce primero tu nombre completo.', selected: 'seleccionado(s)', responsibilities: 'Responsabilidades', requiredSkills: 'Habilidades requeridas', expand: 'Expandir referencia del empleo', collapse: 'Contraer referencia del empleo' },
};

function resumeOutputLocale(value: unknown, fallback: AppLocale = 'zh-CN'): AppLocale {
  return typeof value === 'string' && RESUME_OUTPUT_LOCALES.includes(value as AppLocale) ? value as AppLocale : fallback;
}

const EMPTY_PROFILE: CareerProfile = {
  personal: { fullName: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', targetRole: '' },
  summary: '', skills: [], experience: [], projects: [], education: [], certifications: [],
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function recordList(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normaliseProfilePayload(value: unknown): CareerProfile {
  const raw = isRecord(value) ? value : {};
  const personal = isRecord(raw.personal) ? raw.personal : {};
  return {
    personal: {
      fullName: text(personal.fullName), email: text(personal.email), phone: text(personal.phone), location: text(personal.location),
      website: text(personal.website), linkedin: text(personal.linkedin), github: text(personal.github), targetRole: text(personal.targetRole),
    },
    summary: text(raw.summary),
    skills: Array.isArray(raw.skills) ? raw.skills.filter((skill): skill is string => typeof skill === 'string') : [],
    experience: recordList(raw.experience), projects: recordList(raw.projects), education: recordList(raw.education), certifications: recordList(raw.certifications),
  };
}

function sourceProviderLabel(provider: ResumeSource['provider'], copy: ResumeCopy) {
  if (provider === 'deepseek') return copy.sources.deepseek;
  if (provider === 'gpt') return copy.sources.gpt;
  return copy.sources.fallback;
}

function sourceExtractionNote(note: string, copy: ResumeCopy) {
  if (note === 'no_readable_text') return copy.sources.noReadableText;
  if (note === 'model_fallback') return copy.sources.modelFallback;
  if (note === 'gpt_second_pass') return copy.sources.gptSecondPass;
  if (note === 'gpt_second_pass_failed') return copy.sources.gptSecondPassFailed;
  if (note === 'gpt_second_pass_no_improvement') return copy.sources.gptSecondPassNoImprovement;
  return '';
}

function listText(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function field(value: JsonRecord, keys: string[]) {
  for (const key of keys) if (typeof value[key] === 'string' && value[key].trim()) return value[key] as string;
  return '';
}

function bullets(value: JsonRecord) {
  const candidate = value.bullets ?? value.achievements ?? value.responsibilities;
  const text = listText(candidate);
  if (text.length) return text;
  const description = field(value, ['description', 'details', 'summary']);
  return description ? [description] : [];
}

function profileToForm(profile: CareerProfile) {
  const toLine = (item: JsonRecord, keys: string[]) => keys.map((key) => field(item, key === 'description' ? ['description', 'details', 'summary'] : [key])).join(' | ').replace(/(\s*\|\s*)+$/, '');
  return {
    ...profile.personal,
    summary: profile.summary,
    skills: profile.skills.join(', '),
    experience: profile.experience.map((item) => toLine(item, ['company', 'title', 'startDate', 'endDate', 'description'])).join('\n'),
    projects: profile.projects.map((item) => toLine(item, ['name', 'role', 'description'])).join('\n'),
    education: profile.education.map((item) => toLine(item, ['institution', 'degree', 'field', 'endDate'])).join('\n'),
    certifications: profile.certifications.map((item) => toLine(item, ['name', 'issuer', 'date'])).join('\n'),
  };
}

type ProfileForm = ReturnType<typeof profileToForm>;

function splitLines(input: string, keys: string[]) {
  return input.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split('|').map((part) => part.trim());
    return Object.fromEntries(keys.map((key, index) => [key, parts[index] ?? ''])) as JsonRecord;
  });
}

function formToProfile(form: ProfileForm): CareerProfile {
  return {
    personal: {
      fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(), location: form.location.trim(), website: form.website.trim(),
      linkedin: form.linkedin.trim(), github: form.github.trim(), targetRole: form.targetRole.trim(),
    },
    summary: form.summary.trim(),
    skills: [...new Set(form.skills.split(/[,，、\n]/).map((item) => item.trim()).filter(Boolean))],
    experience: splitLines(form.experience, ['company', 'title', 'startDate', 'endDate', 'description']),
    projects: splitLines(form.projects, ['name', 'role', 'description']),
    education: splitLines(form.education, ['institution', 'degree', 'field', 'endDate']),
    certifications: splitLines(form.certifications, ['name', 'issuer', 'date']),
  };
}

function fileName(version: ResumeVersion, ext: string, copy: ResumeCopy) {
  const contact = version.document.contact;
  const raw = [contact?.fullName || copy.document.resume, version.jobTitle || version.document.title || copy.document.resume, version.companyName, new Date().toISOString().slice(0, 10)].filter(Boolean).join('_');
  return `${raw.replace(/[^\w\u4e00-\u9fff-]+/g, '_').replace(/_+/g, '_')}.${ext}`;
}

function markdown(version: ResumeVersion, copy: ResumeCopy) {
  const doc = version.document;
  const documentCopy = doc.outputLocale ? getResumeCopy(resumeOutputLocale(doc.outputLocale)) : copy;
  const contact = doc.contact ?? EMPTY_PROFILE.personal;
  const section = (title: string, children: string[]) => children.length ? `\n## ${title}\n\n${children.join('\n')}` : '';
  const experience = (doc.experience ?? []).flatMap((item) => {
    const heading = [field(item, ['title']), field(item, ['company'])].filter(Boolean).join(' · ');
    const dates = [field(item, ['startDate']), field(item, ['endDate'])].filter(Boolean).join(' — ');
    return [`### ${heading || documentCopy.document.experience}${dates ? `\n${dates}` : ''}`, ...bullets(item).map((bullet) => `- ${bullet}`)];
  });
  const projects = (doc.projects ?? []).flatMap((item) => [`### ${field(item, ['name']) || documentCopy.document.project}`, ...bullets(item).map((bullet) => `- ${bullet}`)]);
  const education = (doc.education ?? []).map((item) => `- ${[field(item, ['degree']), field(item, ['field']), field(item, ['institution']), field(item, ['endDate'])].filter(Boolean).join(' · ')}`);
  const certifications = (doc.certifications ?? []).map((item) => `- ${[field(item, ['name']), field(item, ['issuer']), field(item, ['date'])].filter(Boolean).join(' · ')}`);
  return `# ${contact.fullName || documentCopy.document.resume}\n\n${[contact.email, contact.phone, contact.location, contact.website || contact.linkedin || contact.github].filter(Boolean).join(' · ')}\n\n## ${doc.title || version.jobTitle}\n\n${doc.summary || ''}${section(documentCopy.document.skills, (doc.skills ?? []).map((skill) => `- ${skill}`))}${section(documentCopy.document.experience, experience)}${section(documentCopy.document.projects, projects)}${section(documentCopy.document.education, education)}${section(documentCopy.document.certifications, certifications)}`.trim() + '\n';
}

function download(blob: Blob, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob); anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1_000);
}

async function recordExport(version: ResumeVersion, format: 'docx' | 'pdf' | 'md', copy: ResumeCopy) {
  if (!version.id) return;
  await fetch('/api/resumes/export', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ versionId: version.id, format, filename: fileName(version, format, copy) }) }).catch(() => undefined);
}

async function exportMarkdown(version: ResumeVersion, copy: ResumeCopy) {
  download(new Blob([markdown(version, copy)], { type: 'text/markdown;charset=utf-8' }), fileName(version, 'md', copy));
  await recordExport(version, 'md', copy);
}

async function exportDocx(version: ResumeVersion, copy: ResumeCopy) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');
  const doc = version.document;
  const documentCopy = doc.outputLocale ? getResumeCopy(resumeOutputLocale(doc.outputLocale)) : copy;
  const paragraphs: any[] = [];
  const contact = doc.contact ?? EMPTY_PROFILE.personal;
  paragraphs.push(new Paragraph({ text: contact.fullName || documentCopy.document.resume, heading: HeadingLevel.TITLE }));
  paragraphs.push(new Paragraph({ text: [contact.email, contact.phone, contact.location, contact.website || contact.linkedin || contact.github].filter(Boolean).join(' · ') }));
  const addSection = (title: string, text: string[] | undefined) => {
    if (!text?.length) return;
    paragraphs.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }));
    text.forEach((line) => paragraphs.push(new Paragraph({ text: line, bullet: { level: 0 } })));
  };
  addSection(doc.title || version.jobTitle, doc.summary ? [doc.summary] : []);
  addSection(documentCopy.document.skills, doc.skills);
  for (const item of doc.experience ?? []) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: [field(item, ['title']), field(item, ['company'])].filter(Boolean).join(' · ') || documentCopy.document.experience, bold: true })] }));
    const dates = [field(item, ['startDate']), field(item, ['endDate'])].filter(Boolean).join(' — ');
    if (dates) paragraphs.push(new Paragraph({ text: dates }));
    bullets(item).forEach((bullet) => paragraphs.push(new Paragraph({ text: bullet, bullet: { level: 0 } })));
  }
  for (const item of doc.projects ?? []) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: field(item, ['name']) || documentCopy.document.project, bold: true })] }));
    bullets(item).forEach((bullet) => paragraphs.push(new Paragraph({ text: bullet, bullet: { level: 0 } })));
  }
  addSection(documentCopy.document.education, (doc.education ?? []).map((item) => [field(item, ['degree']), field(item, ['field']), field(item, ['institution']), field(item, ['endDate'])].filter(Boolean).join(' · ')));
  addSection(documentCopy.document.certifications, (doc.certifications ?? []).map((item) => [field(item, ['name']), field(item, ['issuer']), field(item, ['date'])].filter(Boolean).join(' · ')));
  const blob = await Packer.toBlob(new Document({ sections: [{ children: paragraphs }] }));
  download(blob, fileName(version, 'docx', copy));
  await recordExport(version, 'docx', copy);
}

async function exportPdf(version: ResumeVersion, copy: ResumeCopy) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const doc = version.document;
  const documentCopy = doc.outputLocale ? getResumeCopy(resumeOutputLocale(doc.outputLocale)) : copy;
  let y = 56;
  const write = (text: string, size = 10, gap = 6, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, 500) as string[];
    lines.forEach((line) => { if (y > 735) { pdf.addPage(); y = 56; } pdf.text(line, 54, y); y += size + gap; });
  };
  const contact = doc.contact ?? EMPTY_PROFILE.personal;
  write(contact.fullName || documentCopy.document.resume, 22, 10, true);
  write([contact.email, contact.phone, contact.location, contact.website || contact.linkedin || contact.github].filter(Boolean).join(' · '), 9, 14);
  if (doc.title) write(doc.title, 14, 8, true);
  if (doc.summary) write(doc.summary, 10, 12);
  const add = (title: string, lines: string[]) => { if (lines.length) { write(title, 13, 6, true); lines.forEach((line) => write(`• ${line}`, 10, 4)); y += 6; } };
  add(documentCopy.document.skills, doc.skills ?? []);
  add(documentCopy.document.experience, (doc.experience ?? []).flatMap((item) => [[field(item, ['title']), field(item, ['company'])].filter(Boolean).join(' · '), ...bullets(item)].filter(Boolean)));
  add(documentCopy.document.projects, (doc.projects ?? []).flatMap((item) => [field(item, ['name']), ...bullets(item)].filter(Boolean)));
  add(documentCopy.document.education, (doc.education ?? []).map((item) => [field(item, ['degree']), field(item, ['field']), field(item, ['institution']), field(item, ['endDate'])].filter(Boolean).join(' · ')));
  add(documentCopy.document.certifications, (doc.certifications ?? []).map((item) => [field(item, ['name']), field(item, ['issuer']), field(item, ['date'])].filter(Boolean).join(' · ')));
  pdf.save(fileName(version, 'pdf', copy));
  await recordExport(version, 'pdf', copy);
}

function Preview({ version, copy }: { version: ResumeVersion; copy: ResumeCopy }) {
  const doc = version.document;
  const documentCopy = doc.outputLocale ? getResumeCopy(resumeOutputLocale(doc.outputLocale)) : copy;
  const contact = doc.contact ?? EMPTY_PROFILE.personal;
  return <article className="resume-preview mx-auto max-w-[760px] rounded-xl bg-white p-8 text-slate-900 shadow-sm sm:p-12">
    <h2 className="text-3xl font-bold tracking-tight">{contact.fullName || documentCopy.preview.yourName}</h2>
    <p className="mt-2 text-sm text-slate-600">{[contact.email, contact.phone, contact.location, contact.website || contact.linkedin || contact.github].filter(Boolean).join(' · ')}</p>
    <h3 className="mt-7 border-b border-slate-300 pb-2 text-lg font-bold uppercase tracking-wide">{doc.title || version.jobTitle}</h3>
    {doc.summary && <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{doc.summary}</p>}
    {!!doc.skills?.length && <section><h3 className="mt-7 border-b border-slate-300 pb-2 font-bold uppercase tracking-wide">{documentCopy.document.skills}</h3><p className="mt-3 text-sm leading-6">{doc.skills.join(' · ')}</p></section>}
    <ResumeSection title={documentCopy.document.experience} items={doc.experience} primary={['title', 'company']} />
    <ResumeSection title={documentCopy.document.projects} items={doc.projects} primary={['name']} />
    <ResumeSection title={documentCopy.document.education} items={doc.education} primary={['degree', 'field', 'institution', 'endDate']} />
    <ResumeSection title={documentCopy.document.certifications} items={doc.certifications} primary={['name', 'issuer', 'date']} />
  </article>;
}

function ResumeSection({ title, items, primary }: { title: string; items?: JsonRecord[]; primary: string[] }) {
  if (!items?.length) return null;
  return <section><h3 className="mt-7 border-b border-slate-300 pb-2 font-bold uppercase tracking-wide">{title}</h3>{items.map((item, index) => <div className="mt-3" key={`${title}-${index}`}><p className="text-sm font-bold">{primary.map((key) => field(item, [key])).filter(Boolean).join(' · ')}</p>{bullets(item).map((bullet, bulletIndex) => <p key={bulletIndex} className="mt-1 text-sm leading-6">• {bullet}</p>)}</div>)}</section>;
}

export function ResumeStudio() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId: string }>();
  const copy = getResumeCopy((i18n.resolvedLanguage ?? i18n.language) as AppLocale);
  const selectorCopy = jobSelectorCopy[resumeOutputLocale(i18n.resolvedLanguage ?? i18n.language)];
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(EMPTY_PROFILE));
  const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [sources, setSources] = useState<ResumeSource[]>([]);
  const [resume, setResume] = useState<ResumeResponse['resume'] | null>(null);
  const [resumeName, setResumeName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateRole, setTemplateRole] = useState('');
  const [templateSkills, setTemplateSkills] = useState<string[]>([]);
  const [generation, setGeneration] = useState({ templateId: '', jobSlugs: [] as string[], outputLocale: resumeOutputLocale(i18n.resolvedLanguage ?? i18n.language) });
  const [bookmarkedJobs, setBookmarkedJobs] = useState<BookmarkedJob[]>([]);
  const [bookmarkedJobsLoading, setBookmarkedJobsLoading] = useState(true);
  const [expandedJobSlugs, setExpandedJobSlugs] = useState<string[]>([]);
  const [selected, setSelected] = useState<ResumeVersion | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [truthConfirmed, setTruthConfirmed] = useState(false);

  const profile = useMemo(() => formToProfile(form), [form]);
  const previewVersion: ResumeVersion | null = selected ?? (resume ? {
    id: '', jobTitle: profile.personal.targetRole || copy.preview.baseVersion, companyName: '',
    document: { contact: profile.personal, title: profile.personal.targetRole, summary: profile.summary, skills: profile.skills, experience: profile.experience, projects: profile.projects, education: profile.education, certifications: profile.certifications, outputLocale: generation.outputLocale, requiresTruthConfirmation: true },
    match: {}, createdAt: resume.updatedAt,
  } : null);
  const selectedTemplate = templates.find((template) => template.id === generation.templateId);
  const profileFields: Array<[keyof ProfileForm, string]> = [
    ['fullName', copy.fields.fullName], ['email', copy.fields.email], ['phone', copy.fields.phone], ['location', copy.fields.location],
    ['website', copy.fields.website], ['linkedin', copy.fields.linkedin], ['github', copy.fields.github], ['targetRole', copy.fields.targetRole],
  ];

  function applyProfile(next: unknown) {
    const profile = normaliseProfilePayload(next);
    setForm(profileToForm(profile));
    setTemplateSkills((current) => current.length ? current : profile.skills);
  }

  async function load() {
    if (!resumeId) throw new Error(copy.messages.loadFailed);
    const [response, bookmarkedResponse] = await Promise.all([
      fetch(`/api/resumes/${encodeURIComponent(resumeId)}`),
      fetch(`/api/resumes/${encodeURIComponent(resumeId)}/bookmarked-jobs`),
    ]);
    const data = await response.json().catch(() => ({})) as ResumeResponse & { error?: string };
    if (!response.ok) throw new Error(data.error ?? copy.messages.loadFailed);
    const nextTemplates = Array.isArray(data.templates) ? data.templates.filter(isRecord) as ResumeTemplate[] : [];
    const nextVersions = Array.isArray(data.versions)
      ? data.versions.filter((version): version is ResumeVersion => isRecord(version) && isRecord(version.document) && isRecord(version.match))
      : [];
    const nextSources = Array.isArray(data.sources) ? data.sources.filter(isRecord) as ResumeSource[] : [];
    if (!data.resume || !isRecord(data.resume)) throw new Error(copy.messages.loadFailed);
    applyProfile(data.resume.profile ?? EMPTY_PROFILE);
    setResume(data.resume);
    setResumeName(text(data.resume.name));
    setTemplates(nextTemplates);
    setVersions(nextVersions);
    setSources(nextSources);
    setSelected((current) => current ? nextVersions.find((item) => item.id === current.id) ?? current : nextVersions[0] ?? null);
    const bookmarkedData = await bookmarkedResponse.json().catch(() => ({})) as { jobs?: unknown };
    setBookmarkedJobs(bookmarkedResponse.ok && Array.isArray(bookmarkedData.jobs)
      ? bookmarkedData.jobs.filter((job): job is BookmarkedJob => isRecord(job) && typeof job.slug === 'string' && typeof job.title === 'string' && typeof job.companyName === 'string').map((job) => ({
        id: text(job.id), slug: text(job.slug), title: text(job.title), companyName: text(job.companyName),
        responsibilities: listText(job.responsibilities), skills: listText(job.skills),
      }))
      : []);
    setBookmarkedJobsLoading(false);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : copy.messages.loadFailed));
    // The remote data is language-independent; reload only when the fallback copy changes.
  }, [resumeId, copy.messages.loadFailed]);

  function update(name: keyof ProfileForm, value: string) { setForm((current) => ({ ...current, [name]: value })); }

  async function persistCurrentProfile() {
    if (!resumeId) throw new Error(copy.messages.saveFailed);
    const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'profile', profile }) });
    const data = await response.json().catch(() => ({})) as { profile?: CareerProfile; error?: string };
    if (!response.ok) throw new Error(data.error ?? copy.messages.saveFailed);
    return data.profile ?? profile;
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setBusy('save'); setMessage('');
    try {
      applyProfile(await persistCurrentProfile()); setMessage(copy.messages.profileSaved);
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.messages.saveFailed); } finally { setBusy(null); }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy('upload'); setMessage('');
    try {
      const payload = new FormData(); payload.set('file', file);
      if (!resumeId) throw new Error(copy.messages.uploadFailed);
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}/parse`, { method: 'POST', body: payload });
      const data = await response.json().catch(() => ({})) as { profile?: CareerProfile; provider?: string; status?: string; note?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? copy.messages.uploadFailed);
      applyProfile(data.profile ?? EMPTY_PROFILE);
      if (data.status === 'failed' || data.note === 'no_readable_text') setMessage(copy.messages.uploadNoText.replace('{filename}', file.name));
      else setMessage(`${copy.messages.uploadSuccess.replace('{filename}', file.name)}${data.provider === 'fallback' ? copy.messages.uploadFallback : ''}`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.messages.uploadFailed); } finally { setBusy(null); event.target.value = ''; }
  }

  async function saveTemplate(event: FormEvent) {
    event.preventDefault(); setBusy('template'); setMessage('');
    try {
      if (!resumeId) throw new Error(copy.messages.templateFailed);
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'template', template: { name: templateName, targetRole: templateRole, selectedSkills: templateSkills } }) });
      const data = await response.json().catch(() => ({})) as { template?: ResumeTemplate; error?: string };
      if (!response.ok) throw new Error(data.error ?? copy.messages.templateFailed);
      setTemplates((current) => [data.template!, ...current]); setTemplateName(''); setTemplateRole(''); setMessage(copy.messages.templateSaved);
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.messages.templateFailed); } finally { setBusy(null); }
  }

  async function generate(event: FormEvent) {
    event.preventDefault(); setBusy('generate'); setMessage(''); setTruthConfirmed(false);
    try {
      if (!resumeId) throw new Error(copy.messages.generateFailed);
      if (!form.fullName.trim()) throw new Error(selectorCopy.fullNameRequired);
      if (!generation.jobSlugs.length) throw new Error(selectorCopy.selectOne);
      // Generation always starts from the form currently on screen, not an
      // earlier saved profile, so the LLM sees the user's latest verified facts.
      applyProfile(await persistCurrentProfile());
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}/generate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(generation) });
      const data = await response.json().catch(() => ({})) as { id?: string; jobTitle?: string; companyName?: string; document?: ResumeDocument; match?: ResumeVersion['match']; error?: string };
      if (!response.ok || !data.id || !data.document) throw new Error(data.error ?? copy.messages.generateFailed);
      const version: ResumeVersion = { id: data.id, jobTitle: data.jobTitle || selectedTemplate?.targetRole || form.targetRole, companyName: data.companyName || '', document: data.document, match: data.match ?? {}, createdAt: new Date().toISOString() };
      setVersions((current) => [version, ...current]); setSelected(version); setMessage(data.document.generatedBy === 'deepseek' ? copy.messages.deepSeekDraftGenerated : copy.messages.draftGenerated);
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.messages.generateFailed); } finally { setBusy(null); }
  }

  async function saveName(event: FormEvent) {
    event.preventDefault(); setBusy('name'); setMessage('');
    try {
      if (!resumeId) throw new Error(copy.messages.saveFailed);
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'name', name: resumeName }) });
      const data = await response.json().catch(() => ({})) as { name?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? copy.messages.saveFailed);
      setResume((current) => current ? { ...current, name: data.name ?? resumeName } : current);
      setEditingName(false);
      setMessage(copy.messages.profileSaved);
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.messages.saveFailed); } finally { setBusy(null); }
  }

  async function changeStatus() {
    setBusy('status'); setMessage('');
    try {
      if (!resumeId || !resume) throw new Error(copy.messages.saveFailed);
      const status = resume.status === 'completed' ? 'draft' : 'completed';
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'status', status }) });
      const data = await response.json().catch(() => ({})) as { status?: 'draft' | 'completed'; error?: string };
      if (!response.ok) throw new Error(data.error ?? copy.messages.saveFailed);
      setResume((current) => current ? { ...current, status: data.status ?? status } : current);
      setMessage(copy.editor.statusSaved);
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.messages.saveFailed); } finally { setBusy(null); }
  }

  function beginNameEditing() {
    setResumeName(resume?.name ?? '');
    setEditingName(true);
  }

  function cancelNameEditing() {
    setResumeName(resume?.name ?? '');
    setEditingName(false);
  }

  function toggleJobSelection(slug: string) {
    setGeneration((current) => ({
      ...current,
      jobSlugs: current.jobSlugs.includes(slug) ? current.jobSlugs.filter((item) => item !== slug) : [...current.jobSlugs, slug].slice(0, 5),
    }));
  }

  function toggleJobDetails(slug: string) {
    setExpandedJobSlugs((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  }

  async function removeSource(source: ResumeSource) {
    if (!resumeId || !window.confirm(copy.sources.confirmDelete)) return;
    setBusy(`source:${source.id}`); setMessage('');
    try {
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}/sources/${encodeURIComponent(source.id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? copy.sources.deleteFailed);
      setSources((current) => current.filter((item) => item.id !== source.id));
      setMessage(copy.sources.deleted);
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.sources.deleteFailed); } finally { setBusy(null); }
  }

  async function reparseSource(source: ResumeSource) {
    if (!resumeId) return;
    setBusy(`reparse:${source.id}`); setMessage('');
    try {
      const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}/sources/${encodeURIComponent(source.id)}/reparse`, { method: 'POST' });
      const data = await response.json().catch(() => ({})) as { profile?: CareerProfile; error?: string };
      if (!response.ok) throw new Error(data.error ?? copy.sources.retryFailed);
      applyProfile(data.profile ?? EMPTY_PROFILE);
      await load();
      setMessage(copy.sources.retried);
    } catch (error) { setMessage(error instanceof Error ? error.message : copy.sources.retryFailed); } finally { setBusy(null); }
  }

  const inputClass = 'mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary';
  return <div className="mx-auto max-w-7xl space-y-8 pb-12">
    <div className="flex flex-col justify-between gap-5 border-b border-outline-variant pb-6 xl:flex-row xl:items-end">
      <div className="min-w-0"><button type="button" onClick={() => navigate('/me/resume')} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" />{copy.editor.back}</button>{editingName ? <form onSubmit={saveName} className="mt-4 flex max-w-2xl items-center gap-2"><input autoFocus aria-label={copy.editor.resumeName} className="min-w-0 flex-1 rounded-lg border border-primary bg-surface-container-low px-3 py-2 text-[26px] font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary sm:text-[32px]" value={resumeName} onChange={(event) => setResumeName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') cancelNameEditing(); }} required maxLength={140} /><button type="submit" disabled={busy !== null} aria-label={copy.editor.saveName} title={copy.editor.saveName} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><Check className="h-5 w-5" /></button><button type="button" disabled={busy !== null} onClick={cancelNameEditing} aria-label={copy.editor.cancel} title={copy.editor.cancel} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"><X className="h-5 w-5" /></button></form> : <h1 className="mt-4 flex min-w-0 items-center gap-2 break-words font-h1 text-[32px] text-on-surface"><button type="button" onClick={beginNameEditing} className="min-w-0 truncate text-left hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary">{resume?.name || copy.title}</button><button type="button" onClick={beginNameEditing} aria-label={copy.editor.saveName} title={copy.editor.saveName} className="shrink-0 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary"><Pencil className="h-4 w-4" /></button></h1>}<p className="mt-2 max-w-3xl text-on-surface-variant">{copy.intro}</p></div>
      <div className="flex flex-wrap items-end gap-3">{resume && <button type="button" disabled={busy !== null} onClick={changeStatus} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${resume.status === 'completed' ? 'border border-emerald-600 bg-emerald-50 text-emerald-800' : 'border border-primary bg-primary-container/20 text-primary'}`}><Check className="h-4 w-4" />{resume.status === 'completed' ? copy.editor.markDraft : copy.editor.markCompleted}</button>}<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90"><Upload className="h-4 w-4" />{busy === 'upload' ? copy.recognizing : copy.uploadResume}<input className="sr-only" type="file" accept=".docx,.pdf,.txt,.jpg,.jpeg,.png,.md" onChange={upload} disabled={busy !== null} /></label></div>
    </div>
    {message && <p className="rounded-xl border border-primary/25 bg-primary-container/20 px-4 py-3 text-sm text-on-surface" role="status">{message}</p>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
      <div className="space-y-6">
        <form onSubmit={saveProfile} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-2"><FileText className="h-5 w-5 shrink-0 text-primary" /><h2 className="text-xl font-bold">{copy.profile.title}</h2></div><select aria-label={selectorCopy.outputLanguage} className="w-36 shrink-0 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary sm:w-44" value={generation.outputLocale} onChange={(event) => setGeneration((current) => ({ ...current, outputLocale: resumeOutputLocale(event.target.value, current.outputLocale) }))}>{RESUME_OUTPUT_LOCALES.map((locale) => <option key={locale} value={locale}>{selectorCopy.languageNames[locale]}</option>)}</select></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {profileFields.map(([name, label]) => <label key={name}><span className="text-sm font-medium">{label}</span><input className={inputClass} value={form[name]} onChange={(event) => update(name, event.target.value)} required={name === 'fullName'} /></label>)}
            <label className="sm:col-span-2"><span className="text-sm font-medium">{copy.fields.summary}</span><textarea className={inputClass} rows={4} value={form.summary} onChange={(event) => update('summary', event.target.value)} placeholder={copy.placeholders.summary} /></label>
            <label className="sm:col-span-2"><span className="text-sm font-medium">{copy.fields.skills}</span><input className={inputClass} value={form.skills} onChange={(event) => update('skills', event.target.value)} placeholder={copy.placeholders.skills} /></label>
            <label className="sm:col-span-2"><span className="text-sm font-medium">{copy.fields.experience}</span><textarea className={inputClass} rows={4} value={form.experience} onChange={(event) => update('experience', event.target.value)} placeholder={copy.placeholders.experience} /><span className="mt-1 block text-xs text-on-surface-variant">{copy.experienceHint}</span></label>
            <label className="sm:col-span-2"><span className="text-sm font-medium">{copy.fields.projects}</span><textarea className={inputClass} rows={3} value={form.projects} onChange={(event) => update('projects', event.target.value)} placeholder={copy.placeholders.projects} /></label>
            <label className="sm:col-span-2"><span className="text-sm font-medium">{copy.fields.education}</span><textarea className={inputClass} rows={2} value={form.education} onChange={(event) => update('education', event.target.value)} placeholder={copy.placeholders.education} /></label>
            <label className="sm:col-span-2"><span className="text-sm font-medium">{copy.fields.certifications}</span><textarea className={inputClass} rows={2} value={form.certifications} onChange={(event) => update('certifications', event.target.value)} placeholder={copy.placeholders.certifications} /></label>
          </div>
          <button disabled={busy !== null} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"><Sparkles className="h-4 w-4" />{busy === 'save' ? copy.profile.saving : copy.profile.save}</button>
        </form>
        <form onSubmit={saveTemplate} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{copy.templates.title}</h2><p className="mt-1 text-sm text-on-surface-variant">{copy.templates.intro}</p></div><Plus className="h-5 w-5 text-primary" /></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="text-sm font-medium">{copy.templates.name}</span><input required className={inputClass} value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder={copy.placeholders.templateName} /></label><label><span className="text-sm font-medium">{copy.templates.role}</span><input className={inputClass} value={templateRole} onChange={(event) => setTemplateRole(event.target.value)} placeholder={copy.placeholders.templateRole} /></label></div>
          <div className="mt-4"><p className="text-sm font-medium">{copy.templates.skills}</p><div className="mt-2 flex flex-wrap gap-2">{profile.skills.map((skill) => <label key={skill} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-outline-variant px-3 py-1.5 text-sm"><input type="checkbox" checked={templateSkills.includes(skill)} onChange={() => setTemplateSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill])} />{skill}</label>)}{!profile.skills.length && <p className="text-sm text-on-surface-variant">{copy.templates.noSkills}</p>}</div></div>
          <button disabled={busy !== null} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary px-5 py-2.5 text-sm font-semibold text-primary disabled:opacity-60"><Plus className="h-4 w-4" />{busy === 'template' ? copy.templates.saving : copy.templates.save}</button>
          <div className="mt-5 flex flex-wrap gap-2">{templates.map((template) => <button type="button" key={template.id} onClick={() => { setGeneration((current) => ({ ...current, templateId: template.id })); setTemplateName(template.name); setTemplateRole(template.targetRole); setTemplateSkills(template.selectedSkills); }} className="rounded-full bg-surface-container-low px-3 py-1.5 text-sm text-on-surface hover:bg-primary-container/20">{template.name} {template.targetRole && <span className="text-on-surface-variant">· {template.targetRole}</span>}</button>)}</div>
        </form>
      </div>
      <div className="space-y-6">
        <form onSubmit={generate} className="rounded-2xl border border-primary/25 bg-primary-container/10 p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-2"><WandSparkles className="h-5 w-5 text-primary" /><div><h2 className="text-xl font-bold">{copy.generate.title}</h2><p className="mt-1 text-sm text-on-surface-variant">{copy.generate.intro}</p></div></div>
          <label className="mt-5 block"><span className="text-sm font-medium">{copy.generate.useTemplate}</span><select className={inputClass} value={generation.templateId} onChange={(event) => setGeneration((current) => ({ ...current, templateId: event.target.value }))}><option value="">{copy.generate.allProfile}</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} {template.targetRole ? `· ${template.targetRole}` : ''}</option>)}</select></label>
          <section className="mt-5 border-t border-primary/15 pt-5" aria-label={selectorCopy.savedJobs}>
            <div className="flex items-baseline justify-between gap-3"><div><h3 className="font-semibold">{selectorCopy.savedJobs}</h3><p className="mt-1 text-xs leading-5 text-on-surface-variant">{selectorCopy.savedJobsIntro}</p></div><span className="shrink-0 text-xs font-semibold text-primary">{generation.jobSlugs.length}/5 {selectorCopy.selected}</span></div>
            <div className="mt-3 max-h-[440px] space-y-2 overflow-y-auto pr-1">
              {bookmarkedJobsLoading ? <p className="px-1 py-3 text-sm text-on-surface-variant">{selectorCopy.loading}</p> : bookmarkedJobs.map((job) => {
                const isSelected = generation.jobSlugs.includes(job.slug);
                const isExpanded = expandedJobSlugs.includes(job.slug);
                return <article className={`rounded-xl border ${isSelected ? 'border-primary/45 bg-primary-container/15' : 'border-outline-variant bg-surface-container-lowest'}`} key={job.slug}>
                  <div className="flex items-start gap-2 px-3 py-3"><label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"><input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={isSelected} disabled={!isSelected && generation.jobSlugs.length >= 5} onChange={() => toggleJobSelection(job.slug)} /><span className="min-w-0"><span className="block font-semibold leading-5 text-on-surface">{job.title}</span><span className="mt-1 block text-xs text-on-surface-variant">{job.companyName}</span></span></label><button type="button" aria-label={isExpanded ? selectorCopy.collapse : selectorCopy.expand} title={isExpanded ? selectorCopy.collapse : selectorCopy.expand} aria-expanded={isExpanded} onClick={() => toggleJobDetails(job.slug)} className="rounded-lg p-2 text-primary hover:bg-primary-container/30"><ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button></div>
                  {isExpanded && <div className="border-t border-outline-variant px-3 py-3 text-sm"><div><p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{selectorCopy.responsibilities}</p>{job.responsibilities.length ? <ul className="mt-2 space-y-1.5 text-on-surface-variant">{job.responsibilities.map((item) => <li key={item} className="leading-5">• {item}</li>)}</ul> : <p className="mt-2 text-xs text-on-surface-variant">—</p>}</div><div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{selectorCopy.requiredSkills}</p>{job.skills.length ? <div className="mt-2 flex flex-wrap gap-1.5">{job.skills.map((skill) => <span key={skill} className="rounded-full border border-primary/25 bg-primary-container/20 px-2 py-1 text-xs text-primary">{skill}</span>)}</div> : <p className="mt-2 text-xs text-on-surface-variant">—</p>}</div></div>}
                </article>;
              })}
              {!bookmarkedJobsLoading && !bookmarkedJobs.length && <p className="px-1 py-3 text-sm leading-6 text-on-surface-variant">{selectorCopy.empty}</p>}
            </div>
          </section>
          {!form.fullName.trim() && <p className="mt-4 text-sm text-amber-800">{selectorCopy.fullNameRequired}</p>}
          {!generation.jobSlugs.length && <p className="mt-2 text-sm text-amber-800">{selectorCopy.selectOne}</p>}
          <button disabled={busy !== null} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary disabled:opacity-60">{busy === 'generate' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy === 'generate' ? copy.generate.generating : copy.generate.button}</button>
        </form>
        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <h2 className="text-lg font-bold">{copy.sources.title}</h2>
          <div className="mt-3 space-y-3">
            {sources.map((source) => {
              const extracted = normaliseProfilePayload(source.extracted);
              const factCount = [extracted.personal.fullName, extracted.personal.email, extracted.personal.phone, extracted.summary, ...extracted.skills, ...extracted.experience, ...extracted.projects, ...extracted.education, ...extracted.certifications].filter(Boolean).length;
              const failed = source.status === 'failed';
              const note = sourceExtractionNote(source.note, copy);
              return <article className="rounded-lg bg-surface-container-low px-3 py-3 text-sm" key={source.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium break-all">{source.filename}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${failed ? 'bg-amber-100 text-amber-900' : 'bg-primary-container/30 text-primary'}`}>{failed ? copy.sources.failed : copy.sources.unreviewed}</span>
                      <span className="text-xs text-on-surface-variant">{sourceProviderLabel(source.provider, copy)} · {copy.sources.extracted}: {factCount}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {source.retainedInR2 && (failed || factCount < 10) && <button type="button" onClick={() => reparseSource(source)} disabled={busy !== null} aria-label={copy.sources.retry} title={copy.sources.retry} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary-container/20 disabled:opacity-50">{busy === `reparse:${source.id}` ? copy.sources.retrying : copy.sources.retry}</button>}
                    <button type="button" onClick={() => removeSource(source)} disabled={busy !== null} aria-label={copy.sources.delete} title={copy.sources.delete} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {note ? <p className={`mt-2 text-xs leading-5 ${source.note === 'no_readable_text' ? 'text-amber-900' : 'text-on-surface-variant'}`}>{note}</p>
                  : !factCount ? <p className="mt-2 text-xs leading-5 text-on-surface-variant">{copy.sources.noFacts}</p>
                    : <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-primary">{copy.sources.extracted}</summary><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-on-surface-variant">{JSON.stringify(source.extracted, null, 2)}</p></details>}
              </article>;
            })}
            {!sources.length && <p className="text-sm text-on-surface-variant">{copy.sources.empty}</p>}
          </div>
        </section>
      </div>
    </div>
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold">{copy.preview.title}</h2><p className="mt-1 text-sm text-on-surface-variant">{copy.preview.intro}</p></div>{previewVersion && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => exportMarkdown(previewVersion, copy)} disabled={!truthConfirmed} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm disabled:opacity-40"><Download className="h-4 w-4" />MD</button><button type="button" onClick={() => exportDocx(previewVersion, copy)} disabled={!truthConfirmed} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm disabled:opacity-40"><Download className="h-4 w-4" />DOCX</button><button type="button" onClick={() => exportPdf(previewVersion, copy)} disabled={!truthConfirmed} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-40"><Download className="h-4 w-4" />PDF</button></div>}</div>
      {versions.length > 0 && <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{versions.map((version) => <button type="button" onClick={() => { setSelected(version); setTruthConfirmed(false); }} key={version.id} className={`min-w-max rounded-lg border px-3 py-2 text-left text-sm ${selected?.id === version.id ? 'border-primary bg-primary-container/20 text-primary' : 'border-outline-variant hover:bg-surface-container-low'}`}><span className="block font-semibold">{version.jobTitle || copy.preview.blankDraft}</span><span className="text-xs text-on-surface-variant">{version.companyName || copy.preview.baseVersion} · {copy.preview.match} {version.match.score ?? 0}%</span></button>)}</div>}
      {previewVersion ? <><label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"><input className="mt-0.5" type="checkbox" checked={truthConfirmed} onChange={(event) => setTruthConfirmed(event.target.checked)} /><span>{copy.preview.confirmTruth}</span></label><div className="mt-6 overflow-auto rounded-xl bg-surface-container-low p-4 sm:p-6"><Preview version={previewVersion} copy={copy} /></div>{previewVersion.document.coverLetter && <details className="mt-5 rounded-xl border border-outline-variant p-4"><summary className="cursor-pointer font-semibold">{copy.preview.coverLetter}</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">{previewVersion.document.coverLetter}</p></details>}</> : <p className="mt-6 rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">{selectorCopy.savedJobsIntro}</p>}
    </section>
  </div>;
}
