import type { AppLocale } from './courseCatalog';

export type LegalDocumentKind = 'privacy' | 'terms';

type Section = {
  heading: string;
  body: string;
};

type PublicInfoCopy = {
  footer: {
    about: string;
    contact: string;
  };
  legal: Record<LegalDocumentKind, {
    title: string;
    subtitle: string;
    updated: string;
    home: string;
    sections: Section[];
  }>;
  about: {
    eyebrow: string;
    title: string;
    intro: string;
    principles: Section[];
    coursesTitle: string;
    coursesBody: string;
    jobsTitle: string;
    jobsBody: string;
    resumeTitle: string;
    resumeBody: string;
    coursesAction: string;
    jobsAction: string;
    resumeAction: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    intro: string;
    emailLabel: string;
    emailBody: string;
    formTitle: string;
    nameLabel: string;
    emailFieldLabel: string;
    messageLabel: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    messagePlaceholder: string;
    send: string;
    sending: string;
    sent: string;
    failed: string;
    privacy: string;
    errorName: string;
    errorEmail: string;
    errorMessage: string;
  };
};

const updatedAt = '2026-08-21';

const copy: Record<AppLocale, PublicInfoCopy> = {
  'zh-CN': {
    footer: { about: '关于我们', contact: '联系我们' },
    legal: {
      privacy: {
        title: '隐私政策',
        subtitle: '说明 Study AI Now! 如何以最少必要的方式处理学习、账户与联系信息。',
        updated: `最后更新：${updatedAt}`,
        home: '返回课程首页',
        sections: [
          { heading: '我们处理的信息', body: '注册与登录时，我们会处理你的显示名称、邮箱地址、经加密处理的密码、验证状态和登录会话。使用学习服务时，还会处理课程进度、书签、创作课程、简历资料以及你主动提交的联系消息。' },
          { heading: '使用目的', body: '这些信息只用于认证账户、验证邮箱、找回密码、保存学习进度、生成或保存你的简历、提供你请求的功能、回应咨询，以及维护网站安全和稳定。我们不会要求银行卡号、身份证号、私钥、助记词或一次性验证码。' },
          { heading: '服务提供方', body: '网站由 Cloudflare 托管页面、接口、D1 数据库和 R2 存储；事务性邮件由 Resend 发送。你选择使用 Google 登录时，Google 还会按其自身政策处理相关登录信息。' },
          { heading: '广告与 Cookie', body: '在包含广告的公开课程或练习页面上，Google AdSense 等第三方供应商可能使用 Cookie、IP 地址、网络信标或类似标识符来提供、限制、衡量和改进广告。Google 及其合作伙伴可能根据你访问本站或其他网站的情况提供个性化广告；你可以通过 Google 广告设置管理或关闭个性化广告。我们不会在登录、注册、账户、简历、管理、联系、法律声明、错误或加载页面请求 Google 广告。对依法需要同意的地区，我们会通过 Google 认可的同意管理平台收集和传递选择。' },
          { heading: '联系表单与保存期限', body: '联系表单的姓名、邮箱和消息会通过邮件发送给客服，用于回复你的咨询；网站仅短暂保存经过哈希处理的网络标识来限制滥用，不保存表单消息正文。账户资料会在账户存续期间保存；你可以请求查询、更正或删除。' },
          { heading: '联系我们', body: '如需隐私、账户或数据删除协助，请联系 studyainow@mail.com。' },
        ],
      },
      terms: {
        title: '服务条款',
        subtitle: '使用 Study AI Now! 前，请了解课程、职位信息与工具的基本规则。',
        updated: `最后更新：${updatedAt}`,
        home: '返回课程首页',
        sections: [
          { heading: '服务内容', body: 'Study AI Now! 提供 AI 学习课程、学习进度记录、课程创作、公开职位信息、职位技能关联和简历制作工具。除明确标注的登录功能外，课程目录、课程介绍、职位页面和公开信息页可无需登录访问。' },
          { heading: '账户与安全', body: '请使用你拥有并可接收邮件的地址注册，并妥善保管密码。不得提交他人的隐私资料、违法内容、恶意链接、钓鱼页面或任何高敏感认证信息。' },
          { heading: '课程、职位与简历', body: '课程用于学习和实践。职位信息来自公开招聘来源，可能变更或失效；请始终以原始招聘页面为准。简历工具生成的是可审阅草稿，使用者须核对全部事实、日期、技能和联系方式后再导出或投递。' },
          { heading: '合理使用', body: '不得干扰网站运行、绕过访问控制、批量抓取受保护内容、滥用联系表单，或利用本站进行诈骗、侵权或违法活动。我们可为保障服务与用户安全限制或暂停违规访问。' },
          { heading: '更新与联系', body: '我们可能为改进服务更新本条款；重大变化会在本页更新日期。有关服务问题，请联系 studyainow@mail.com。' },
        ],
      },
    },
    about: {
      eyebrow: '关于 Study AI Now!',
      title: '把 AI 学习连接到真实的工作能力。',
      intro: 'Study AI Now! 是面向全球学习者的实践型 AI 学习平台。我们把可操作的课程、职位需求中的技能证据与可复用的求职材料连接起来，帮助学习者从“知道”走向“能做、能说明”。',
      principles: [
        { heading: '免费且可访问', body: '课程目录、课程介绍、职位页面和公开说明页无需登录即可查看；登录只用于保存你自己的学习、简历与收藏。' },
        { heading: '实践优先', body: '每门课程围绕具体情境、任务、练习和可验证的产出设计，而不是只堆砌术语。' },
        { heading: '保持可追溯', body: '职位内容保留原始来源链接和有效性检查；技能关联会随课程与知识图谱更新而持续改善。' },
      ],
      coursesTitle: '原创实战课程',
      coursesBody: '课程覆盖 AI 入门、LLM 原理、Prompt 与上下文工程、Agent 工程、可靠性、安全、视觉工作流和 AI 工程管理等主题，并持续扩充。',
      jobsTitle: '工作机会与技能',
      jobsBody: '职位页面保留 JD 原文，标注经审查的技能证据，并将可学习的知识点与课程章节连接起来。',
      resumeTitle: '简历制作',
      resumeBody: '登录后可管理多份简历、导入已有资料，并结合已收藏的职位生成供你审阅和修改的简历草稿。',
      coursesAction: '浏览 AI 课程',
      jobsAction: '查看工作机会',
      resumeAction: '打开简历制作',
    },
    contact: {
      eyebrow: '联系 Study AI Now!',
      title: '告诉我们你需要什么帮助。',
      intro: '无论是课程反馈、职位来源建议、账号问题还是合作咨询，都可以通过下方表单联系。',
      emailLabel: '客服邮箱',
      emailBody: '也可以直接写信给我们。',
      formTitle: '发送消息',
      nameLabel: '姓名',
      emailFieldLabel: '邮箱地址',
      messageLabel: '消息',
      namePlaceholder: '你的姓名',
      emailPlaceholder: 'you@example.com',
      messagePlaceholder: '请简要说明你的问题或建议。',
      send: '发送消息',
      sending: '正在发送…',
      sent: '消息已发送。我们会尽快通过邮箱回复你。',
      failed: '暂时无法发送消息，请稍后重试或直接发送邮件。',
      privacy: '提交即表示你同意我们仅为处理本次咨询而使用这些信息。请不要发送密码、验证码、身份证件或其他敏感信息。',
      errorName: '请输入 1–120 个字符的姓名。',
      errorEmail: '请输入有效的邮箱地址。',
      errorMessage: '请输入 2–5000 个字符的消息。',
    },
  },
  'zh-TW': {
    footer: { about: '關於我們', contact: '聯絡我們' },
    legal: {
      privacy: {
        title: '隱私權政策',
        subtitle: '說明 Study AI Now! 如何以最少必要的方式處理學習、帳戶與聯絡資料。',
        updated: `最後更新：${updatedAt}`,
        home: '返回課程首頁',
        sections: [
          { heading: '我們處理的資料', body: '註冊與登入時，我們會處理你的顯示名稱、電郵地址、經加密處理的密碼、驗證狀態和登入工作階段。使用學習服務時，還會處理課程進度、書籤、創作課程、履歷資料，以及你主動提交的聯絡訊息。' },
          { heading: '使用目的', body: '這些資料只用於驗證帳戶、驗證電郵、重設密碼、儲存學習進度、產生或儲存你的履歷、提供你要求的功能、回覆查詢，以及維護網站安全和穩定。我們不會要求信用卡號、身分證號、私鑰、助記詞或一次性驗證碼。' },
          { heading: '服務供應商', body: '網站由 Cloudflare 託管頁面、介面、D1 資料庫和 R2 儲存；交易性電郵由 Resend 傳送。若你選擇使用 Google 登入，Google 亦會按其自身政策處理相關登入資料。' },
          { heading: '廣告與 Cookie', body: '在包含廣告的公開課程或練習頁面上，Google AdSense 等第三方供應商可能使用 Cookie、IP 位址、網路信標或類似識別碼來提供、限制、衡量和改善廣告。Google 及其合作夥伴可能根據你瀏覽本站或其他網站的情況提供個人化廣告；你可以透過 Google 廣告設定管理或關閉個人化廣告。我們不會在登入、註冊、帳戶、履歷、管理、聯絡、法律聲明、錯誤或載入頁面請求 Google 廣告。對依法需要同意的地區，我們會透過 Google 認可的同意管理平台收集並傳遞選擇。' },
          { heading: '聯絡表單與保存期限', body: '聯絡表單的姓名、電郵和訊息會以電郵傳送給客服，用於回覆你的查詢；網站只會短暫保存經雜湊處理的網路識別資料來限制濫用，不會保存表單訊息正文。帳戶資料會在帳戶存續期間保存；你可要求查閱、更正或刪除。' },
          { heading: '聯絡我們', body: '如需隱私、帳戶或資料刪除協助，請聯絡 studyainow@mail.com。' },
        ],
      },
      terms: {
        title: '服務條款',
        subtitle: '使用 Study AI Now! 前，請了解課程、職位資訊與工具的基本規則。',
        updated: `最後更新：${updatedAt}`,
        home: '返回課程首頁',
        sections: [
          { heading: '服務內容', body: 'Study AI Now! 提供 AI 學習課程、學習進度記錄、課程製作、公開職位資訊、職位技能關聯和履歷製作工具。除明確標示的登入功能外，課程目錄、課程介紹、職位頁面和公開資訊頁均可免登入瀏覽。' },
          { heading: '帳戶與安全', body: '請使用你擁有且可收取電郵的地址註冊，並妥善保管密碼。不得提交他人私隱資料、違法內容、惡意連結、釣魚頁面或任何高敏感認證資訊。' },
          { heading: '課程、職位與履歷', body: '課程供學習與實作使用。職位資訊來自公開招聘來源，可能變更或失效；請一律以原始招聘頁面為準。履歷工具產生的是可審閱草稿，使用者必須核對所有事實、日期、技能和聯絡資料後再匯出或申請。' },
          { heading: '合理使用', body: '不得干擾網站運作、繞過存取控制、批量擷取受保護內容、濫用聯絡表單，或利用本站進行詐騙、侵權或違法活動。我們可為保障服務與使用者安全限制或暫停違規存取。' },
          { heading: '更新與聯絡', body: '我們可能為改善服務而更新本條款；重大變更會在本頁更新日期。有關服務問題，請聯絡 studyainow@mail.com。' },
        ],
      },
    },
    about: {
      eyebrow: '關於 Study AI Now!',
      title: '把 AI 學習連結到真實的工作能力。',
      intro: 'Study AI Now! 是面向全球學習者的實作型 AI 學習平台。我們把可操作的課程、職位需求中的技能證據與可重用的求職材料連結起來，幫助學習者從「知道」走向「能做、能說明」。',
      principles: [
        { heading: '免費且易於使用', body: '課程目錄、課程介紹、職位頁面和公開說明頁可免登入閱讀；登入只用來儲存你自己的學習、履歷與收藏。' },
        { heading: '實作優先', body: '每門課程圍繞具體情境、任務、練習和可驗證的成果設計，而非只堆砌術語。' },
        { heading: '保持可追溯', body: '職位內容保留原始來源連結和有效性檢查；技能關聯會隨課程與知識圖譜更新而持續改善。' },
      ],
      coursesTitle: '原創實作課程',
      coursesBody: '課程涵蓋 AI 入門、LLM 原理、Prompt 與上下文工程、Agent 工程、可靠性、安全、視覺工作流程和 AI 工程管理等主題，並持續擴充。',
      jobsTitle: '工作機會與技能',
      jobsBody: '職位頁面保留 JD 原文，標示經審查的技能證據，並將可學習的知識點與課程章節連結起來。',
      resumeTitle: '履歷製作',
      resumeBody: '登入後可管理多份履歷、匯入既有資料，並結合已收藏的職位產生供你審閱和修改的履歷草稿。',
      coursesAction: '瀏覽 AI 課程',
      jobsAction: '查看工作機會',
      resumeAction: '開啟履歷製作',
    },
    contact: {
      eyebrow: '聯絡 Study AI Now!',
      title: '告訴我們你需要甚麼協助。',
      intro: '無論是課程意見、職位來源建議、帳戶問題還是合作查詢，都可透過下列表單聯絡。',
      emailLabel: '客服電郵',
      emailBody: '你亦可直接寫電郵給我們。',
      formTitle: '傳送訊息',
      nameLabel: '姓名',
      emailFieldLabel: '電郵地址',
      messageLabel: '訊息',
      namePlaceholder: '你的姓名',
      emailPlaceholder: 'you@example.com',
      messagePlaceholder: '請簡要說明你的問題或建議。',
      send: '傳送訊息',
      sending: '正在傳送…',
      sent: '訊息已傳送。我們會盡快以電郵回覆你。',
      failed: '暫時無法傳送訊息，請稍後再試或直接發送電郵。',
      privacy: '提交即表示你同意我們只為處理本次查詢而使用這些資料。請勿傳送密碼、驗證碼、身分證件或其他敏感資料。',
      errorName: '請輸入 1–120 個字元的姓名。',
      errorEmail: '請輸入有效的電郵地址。',
      errorMessage: '請輸入 2–5000 個字元的訊息。',
    },
  },
  en: {
    footer: { about: 'About', contact: 'Contact' },
    legal: {
      privacy: {
        title: 'Privacy Policy',
        subtitle: 'How Study AI Now! handles learning, account, and contact information using only what is necessary.',
        updated: `Last updated: ${updatedAt}`,
        home: 'Back to courses',
        sections: [
          { heading: 'Information we handle', body: 'When you register or sign in, we handle your display name, email address, encrypted password, verification status, and session. When you use the learning services, we also handle course progress, bookmarks, courses you create, resume information, and contact messages you choose to send.' },
          { heading: 'Why we use it', body: 'We use this information only to authenticate accounts, verify email, reset passwords, save learning progress, generate or save your resume, provide requested features, respond to enquiries, and keep the service secure and reliable. We never ask for card numbers, government ID numbers, private keys, seed phrases, or one-time codes.' },
          { heading: 'Service providers', body: 'Cloudflare hosts our pages, APIs, D1 database, and R2 storage. Resend delivers transactional email. If you choose Google sign-in, Google also handles the relevant sign-in information under its own policy.' },
          { heading: 'Advertising and cookies', body: 'On public course or practice pages that contain advertising, third-party vendors including Google AdSense may use cookies, IP addresses, web beacons, or similar identifiers to serve, limit, measure, and improve ads. Google and its partners may use advertising cookies to personalize ads based on visits to this or other sites; you can manage or opt out of personalized advertising in Google Ads Settings. We do not request Google ads on login, registration, account, resume, administration, contact, legal, error, or loading pages. Where consent is legally required, choices are collected and transmitted through a Google-certified consent management platform.' },
          { heading: 'Contact form and retention', body: 'Your name, email, and message are sent to support by email so we can reply. To prevent abuse, we retain only a hashed network identifier briefly; we do not store the contact-message body in our database. Account data is retained while your account is active, and you may request access, correction, or deletion.' },
          { heading: 'Contact us', body: 'For privacy, account, or data-deletion assistance, contact studyainow@mail.com.' },
        ],
      },
      terms: {
        title: 'Terms of Service',
        subtitle: 'The basic rules for using Study AI Now! courses, job information, and tools.',
        updated: `Last updated: ${updatedAt}`,
        home: 'Back to courses',
        sections: [
          { heading: 'What we provide', body: 'Study AI Now! provides AI learning courses, learning-progress records, course creation, public job information, job-to-skill connections, and CV-making tools. Except for features explicitly marked as sign-in features, the course catalogue, course introductions, job pages, and public information pages are available without an account.' },
          { heading: 'Accounts and safety', body: 'Register with an email address you own and can receive mail at, and keep your password secure. Do not submit another person’s private data, unlawful content, malicious links, phishing pages, or any highly sensitive authentication information.' },
          { heading: 'Courses, jobs, and resumes', body: 'Courses are for learning and practice. Job information comes from public recruiting sources and can change or expire; always rely on the original job page. The CV tool produces a reviewable draft. You must verify every fact, date, skill, and contact detail before exporting or applying.' },
          { heading: 'Fair use', body: 'Do not disrupt the service, bypass access controls, bulk-scrape protected content, abuse the contact form, or use the site for fraud, infringement, or unlawful activity. We may limit or suspend misuse to protect the service and its users.' },
          { heading: 'Updates and contact', body: 'We may update these terms as the service improves; material changes appear with a new date on this page. For service questions, contact studyainow@mail.com.' },
        ],
      },
    },
    about: {
      eyebrow: 'About Study AI Now!',
      title: 'Connect AI learning to real work capabilities.',
      intro: 'Study AI Now! is a practical AI learning platform for global learners. We connect actionable courses, skills evidence in job requirements, and reusable job-search materials so that learners can move from knowing to doing and explaining.',
      principles: [
        { heading: 'Free and accessible', body: 'The course catalogue, course introductions, job pages, and public information pages are open without sign-in. Sign-in only saves your own learning, resumes, and bookmarks.' },
        { heading: 'Practice first', body: 'Every course is designed around concrete contexts, tasks, practice, and verifiable outcomes—not a pile of terminology.' },
        { heading: 'Traceable by design', body: 'Jobs retain their original source URL and validity checks. Skill connections improve as courses and the knowledge graph evolve.' },
      ],
      coursesTitle: 'Original practical courses',
      coursesBody: 'Courses cover AI foundations, LLM principles, prompting and context engineering, agent engineering, reliability, safety, visual workflows, and AI engineering management—with more added over time.',
      jobsTitle: 'Jobs and skills',
      jobsBody: 'Job pages keep the original JD text, highlight reviewed skill evidence, and link learnable knowledge points to relevant course lessons.',
      resumeTitle: 'CV Maker',
      resumeBody: 'After signing in, you can manage multiple resumes, import existing material, and create a reviewable resume draft using your bookmarked roles.',
      coursesAction: 'Explore AI courses',
      jobsAction: 'Explore jobs',
      resumeAction: 'Open CV Maker',
    },
    contact: {
      eyebrow: 'Contact Study AI Now!',
      title: 'Tell us how we can help.',
      intro: 'Use the form for course feedback, job-source suggestions, account help, or partnership enquiries.',
      emailLabel: 'Support email',
      emailBody: 'You can also email us directly.',
      formTitle: 'Send a message',
      nameLabel: 'Name',
      emailFieldLabel: 'Email',
      messageLabel: 'Message',
      namePlaceholder: 'Your name',
      emailPlaceholder: 'you@example.com',
      messagePlaceholder: 'Briefly describe your question or suggestion.',
      send: 'Send message',
      sending: 'Sending…',
      sent: 'Your message was sent. We will reply by email as soon as we can.',
      failed: 'We could not send your message right now. Please try again later or email us directly.',
      privacy: 'By sending, you agree that we use this information only to handle this enquiry. Do not send passwords, codes, identity documents, or other sensitive information.',
      errorName: 'Enter a name between 1 and 120 characters.',
      errorEmail: 'Enter a valid email address.',
      errorMessage: 'Enter a message between 2 and 5000 characters.',
    },
  },
  fr: {
    footer: { about: 'À propos', contact: 'Contact' },
    legal: {
      privacy: {
        title: 'Politique de confidentialité',
        subtitle: 'Comment Study AI Now! traite, de façon limitée au nécessaire, les données d’apprentissage, de compte et de contact.',
        updated: `Dernière mise à jour : ${updatedAt}`,
        home: 'Retour aux cours',
        sections: [
          { heading: 'Données traitées', body: 'Lors de l’inscription ou de la connexion, nous traitons votre nom affiché, votre adresse e-mail, votre mot de passe chiffré, l’état de vérification et la session. Lors de l’utilisation des services d’apprentissage, nous traitons aussi votre progression, vos favoris, les cours créés, les informations de CV et les messages de contact que vous choisissez d’envoyer.' },
          { heading: 'Finalités', body: 'Ces données servent uniquement à authentifier les comptes, vérifier l’e-mail, réinitialiser les mots de passe, enregistrer la progression, générer ou enregistrer un CV, fournir les fonctions demandées, répondre aux demandes et préserver la sécurité et la fiabilité du service. Nous ne demandons jamais de numéro de carte, numéro d’identité, clé privée, phrase de récupération ou code à usage unique.' },
          { heading: 'Prestataires', body: 'Cloudflare héberge nos pages, API, base D1 et stockage R2. Resend envoie les e-mails transactionnels. Si vous choisissez la connexion Google, Google traite aussi les données de connexion concernées selon sa propre politique.' },
          { heading: 'Publicité et cookies', body: 'Sur les pages publiques de cours ou d’exercices contenant de la publicité, des fournisseurs tiers, dont Google AdSense, peuvent utiliser des cookies, des adresses IP, des balises web ou des identifiants similaires pour diffuser, limiter, mesurer et améliorer les annonces. Google et ses partenaires peuvent personnaliser les annonces selon les visites de ce site ou d’autres sites ; vous pouvez gérer ou désactiver la personnalisation dans les paramètres des annonces Google. Aucune annonce Google n’est demandée sur les pages de connexion, d’inscription, de compte, de CV, d’administration, de contact, juridiques, d’erreur ou de chargement. Lorsque le consentement est requis, les choix sont recueillis et transmis par une plateforme de gestion du consentement certifiée par Google.' },
          { heading: 'Formulaire de contact et conservation', body: 'Votre nom, e-mail et message sont envoyés au support par e-mail afin que nous puissions répondre. Pour prévenir les abus, nous ne conservons brièvement qu’un identifiant réseau haché ; le contenu du message n’est pas enregistré dans notre base. Les données de compte sont conservées tant que le compte est actif ; vous pouvez demander l’accès, la correction ou la suppression.' },
          { heading: 'Nous contacter', body: 'Pour toute demande liée à la confidentialité, au compte ou à la suppression des données, écrivez à studyainow@mail.com.' },
        ],
      },
      terms: {
        title: 'Conditions d’utilisation',
        subtitle: 'Les règles essentielles pour utiliser les cours, les offres d’emploi et les outils de Study AI Now!.',
        updated: `Dernière mise à jour : ${updatedAt}`,
        home: 'Retour aux cours',
        sections: [
          { heading: 'Ce que nous proposons', body: 'Study AI Now! propose des cours d’IA, le suivi de progression, la création de cours, des informations publiques sur les offres, des liens entre emplois et compétences, ainsi que des outils de création de CV. Sauf pour les fonctions indiquées comme nécessitant une connexion, le catalogue, les présentations de cours, les pages d’emploi et les pages d’information sont accessibles sans compte.' },
          { heading: 'Comptes et sécurité', body: 'Inscrivez-vous avec une adresse e-mail qui vous appartient et à laquelle vous avez accès, et protégez votre mot de passe. Ne soumettez pas les données privées d’autrui, du contenu illicite, des liens malveillants, des pages d’hameçonnage ou des informations d’authentification sensibles.' },
          { heading: 'Cours, emplois et CV', body: 'Les cours sont destinés à l’apprentissage et à la pratique. Les offres proviennent de sources de recrutement publiques et peuvent changer ou expirer ; référez-vous toujours à la page d’origine. L’outil de CV produit un brouillon à vérifier. Vous devez contrôler chaque fait, date, compétence et coordonnée avant export ou candidature.' },
          { heading: 'Utilisation loyale', body: 'N’entravez pas le service, ne contournez pas les contrôles d’accès, n’aspirez pas en masse du contenu protégé, n’abusez pas du formulaire de contact et n’utilisez pas le site à des fins frauduleuses, illicites ou portant atteinte aux droits. Nous pouvons limiter ou suspendre les usages abusifs pour protéger le service et ses utilisateurs.' },
          { heading: 'Mises à jour et contact', body: 'Nous pouvons mettre à jour ces conditions à mesure que le service évolue ; les changements importants apparaîtront avec une nouvelle date sur cette page. Pour toute question, écrivez à studyainow@mail.com.' },
        ],
      },
    },
    about: {
      eyebrow: 'À propos de Study AI Now!',
      title: 'Relier l’apprentissage de l’IA aux compétences de travail réelles.',
      intro: 'Study AI Now! est une plateforme d’apprentissage pratique de l’IA destinée aux apprenants du monde entier. Nous relions des cours actionnables, les preuves de compétences présentes dans les offres et des supports réutilisables de recherche d’emploi afin de passer de « savoir » à « faire et expliquer ».',
      principles: [
        { heading: 'Gratuit et accessible', body: 'Le catalogue, les présentations de cours, les pages d’emploi et les pages d’information sont ouverts sans connexion. La connexion sert uniquement à enregistrer votre apprentissage, vos CV et vos favoris.' },
        { heading: 'La pratique d’abord', body: 'Chaque cours est conçu autour de contextes, tâches, exercices et résultats vérifiables, et non autour d’une simple accumulation de termes.' },
        { heading: 'Traçable par conception', body: 'Les offres conservent leur URL source et des vérifications de validité. Les liens entre compétences évoluent avec les cours et le graphe de connaissances.' },
      ],
      coursesTitle: 'Cours pratiques originaux',
      coursesBody: 'Les cours couvrent les fondements de l’IA, les principes des LLM, les prompts et le contexte, l’ingénierie des agents, la fiabilité, la sécurité, les flux visuels et la gestion de l’ingénierie IA, avec des ajouts continus.',
      jobsTitle: 'Emplois et compétences',
      jobsBody: 'Les pages d’emploi conservent le texte original de la JD, mettent en évidence les preuves de compétences examinées et relient les connaissances apprenables aux leçons pertinentes.',
      resumeTitle: 'Créateur de CV',
      resumeBody: 'Après connexion, vous pouvez gérer plusieurs CV, importer des éléments existants et créer un brouillon de CV à vérifier à partir des offres enregistrées.',
      coursesAction: 'Explorer les cours IA',
      jobsAction: 'Explorer les offres',
      resumeAction: 'Ouvrir le créateur de CV',
    },
    contact: {
      eyebrow: 'Contacter Study AI Now!',
      title: 'Dites-nous comment nous pouvons vous aider.',
      intro: 'Utilisez ce formulaire pour un retour sur les cours, une suggestion de source d’offre, une aide de compte ou une demande de partenariat.',
      emailLabel: 'E-mail du support',
      emailBody: 'Vous pouvez aussi nous écrire directement.',
      formTitle: 'Envoyer un message',
      nameLabel: 'Nom',
      emailFieldLabel: 'E-mail',
      messageLabel: 'Message',
      namePlaceholder: 'Votre nom',
      emailPlaceholder: 'vous@example.com',
      messagePlaceholder: 'Décrivez brièvement votre question ou suggestion.',
      send: 'Envoyer le message',
      sending: 'Envoi…',
      sent: 'Votre message a été envoyé. Nous vous répondrons par e-mail dès que possible.',
      failed: 'Nous ne pouvons pas envoyer le message pour le moment. Réessayez plus tard ou écrivez-nous directement.',
      privacy: 'En envoyant ce formulaire, vous acceptez que nous utilisions ces informations uniquement pour traiter cette demande. N’envoyez ni mot de passe, ni code, ni pièce d’identité, ni autre information sensible.',
      errorName: 'Saisissez un nom de 1 à 120 caractères.',
      errorEmail: 'Saisissez une adresse e-mail valide.',
      errorMessage: 'Saisissez un message de 2 à 5000 caractères.',
    },
  },
  es: {
    footer: { about: 'Acerca de', contact: 'Contacto' },
    legal: {
      privacy: {
        title: 'Política de privacidad',
        subtitle: 'Cómo Study AI Now! trata únicamente la información necesaria de aprendizaje, cuenta y contacto.',
        updated: `Última actualización: ${updatedAt}`,
        home: 'Volver a los cursos',
        sections: [
          { heading: 'Información que tratamos', body: 'Cuando te registras o inicias sesión, tratamos tu nombre visible, dirección de correo, contraseña cifrada, estado de verificación y sesión. Al usar los servicios de aprendizaje, también tratamos el progreso de cursos, marcadores, cursos que creas, información de CV y los mensajes de contacto que decides enviar.' },
          { heading: 'Para qué la usamos', body: 'Usamos esta información solo para autenticar cuentas, verificar el correo, restablecer contraseñas, guardar el progreso, generar o guardar tu CV, ofrecer las funciones solicitadas, responder consultas y mantener el servicio seguro y fiable. Nunca pedimos números de tarjeta, documentos de identidad, claves privadas, frases semilla ni códigos de un solo uso.' },
          { heading: 'Proveedores de servicio', body: 'Cloudflare aloja nuestras páginas, API, base de datos D1 y almacenamiento R2. Resend entrega correo transaccional. Si eliges iniciar sesión con Google, Google también trata la información de inicio de sesión correspondiente según su propia política.' },
          { heading: 'Publicidad y cookies', body: 'En las páginas públicas de cursos o ejercicios que contienen publicidad, proveedores externos, incluido Google AdSense, pueden usar cookies, direcciones IP, balizas web o identificadores similares para mostrar, limitar, medir y mejorar los anuncios. Google y sus socios pueden personalizar anuncios según las visitas a este u otros sitios; puedes gestionar o desactivar la publicidad personalizada en la configuración de anuncios de Google. No solicitamos anuncios de Google en páginas de inicio de sesión, registro, cuenta, CV, administración, contacto, avisos legales, error o carga. Cuando la ley exige consentimiento, las opciones se recopilan y transmiten mediante una plataforma de gestión del consentimiento certificada por Google.' },
          { heading: 'Formulario de contacto y conservación', body: 'Tu nombre, correo y mensaje se envían por correo al soporte para que podamos responder. Para prevenir abusos, conservamos brevemente solo un identificador de red con hash; no guardamos el cuerpo del mensaje en nuestra base de datos. Los datos de la cuenta se conservan mientras esté activa, y puedes solicitar acceso, corrección o eliminación.' },
          { heading: 'Contacto', body: 'Para ayuda sobre privacidad, cuenta o eliminación de datos, escribe a studyainow@mail.com.' },
        ],
      },
      terms: {
        title: 'Términos de servicio',
        subtitle: 'Las reglas básicas para usar los cursos, la información de empleos y las herramientas de Study AI Now!.',
        updated: `Última actualización: ${updatedAt}`,
        home: 'Volver a los cursos',
        sections: [
          { heading: 'Qué ofrecemos', body: 'Study AI Now! ofrece cursos de IA, registros de progreso, creación de cursos, información pública de empleos, conexiones entre empleos y habilidades, y herramientas para crear CV. Salvo las funciones indicadas expresamente como de inicio de sesión, el catálogo, las introducciones de cursos, las páginas de empleo y las páginas públicas están disponibles sin cuenta.' },
          { heading: 'Cuentas y seguridad', body: 'Regístrate con una dirección de correo que poseas y puedas recibir, y protege tu contraseña. No envíes datos privados de otras personas, contenido ilegal, enlaces maliciosos, páginas de suplantación ni información de autenticación altamente sensible.' },
          { heading: 'Cursos, empleos y CV', body: 'Los cursos son para aprendizaje y práctica. La información de empleos procede de fuentes públicas de contratación y puede cambiar o caducar; consulta siempre la página original de la oferta. La herramienta de CV genera un borrador revisable. Debes comprobar cada hecho, fecha, habilidad y dato de contacto antes de exportar o postularte.' },
          { heading: 'Uso razonable', body: 'No interfieras con el servicio, evadas controles de acceso, extraigas masivamente contenido protegido, abuses del formulario de contacto ni uses el sitio para fraude, infracción o actividad ilegal. Podemos limitar o suspender el uso indebido para proteger el servicio y a sus usuarios.' },
          { heading: 'Actualizaciones y contacto', body: 'Podemos actualizar estos términos conforme mejore el servicio; los cambios importantes aparecerán con una nueva fecha en esta página. Para preguntas sobre el servicio, escribe a studyainow@mail.com.' },
        ],
      },
    },
    about: {
      eyebrow: 'Acerca de Study AI Now!',
      title: 'Conectar el aprendizaje de IA con capacidades reales de trabajo.',
      intro: 'Study AI Now! es una plataforma práctica de aprendizaje de IA para personas de todo el mundo. Conectamos cursos accionables, evidencia de habilidades en los requisitos de empleo y materiales reutilizables de búsqueda laboral para pasar de saber a hacer y explicar.',
      principles: [
        { heading: 'Gratis y accesible', body: 'El catálogo, las introducciones de cursos, las páginas de empleo y las páginas públicas se pueden consultar sin iniciar sesión. El inicio de sesión solo guarda tu aprendizaje, CV y marcadores.' },
        { heading: 'La práctica primero', body: 'Cada curso se diseña alrededor de contextos concretos, tareas, práctica y resultados verificables, no como una acumulación de términos.' },
        { heading: 'Trazable por diseño', body: 'Las ofertas conservan su URL de origen y comprobaciones de validez. Las conexiones de habilidades mejoran con los cursos y el grafo de conocimiento.' },
      ],
      coursesTitle: 'Cursos prácticos originales',
      coursesBody: 'Los cursos cubren fundamentos de IA, principios de LLM, prompts e ingeniería de contexto, ingeniería de agentes, fiabilidad, seguridad, flujos visuales y gestión de ingeniería de IA, con nuevas incorporaciones continuas.',
      jobsTitle: 'Empleos y habilidades',
      jobsBody: 'Las páginas de empleo conservan el texto original de la JD, destacan evidencia de habilidades revisada y conectan conocimientos aprendibles con lecciones relevantes.',
      resumeTitle: 'Creador de CV',
      resumeBody: 'Después de iniciar sesión puedes gestionar varios CV, importar material existente y crear un borrador revisable con las vacantes que guardaste.',
      coursesAction: 'Explorar cursos de IA',
      jobsAction: 'Explorar empleos',
      resumeAction: 'Abrir creador de CV',
    },
    contact: {
      eyebrow: 'Contacta a Study AI Now!',
      title: 'Cuéntanos cómo podemos ayudarte.',
      intro: 'Usa este formulario para comentarios sobre cursos, sugerencias de fuentes de empleo, ayuda con tu cuenta o consultas de colaboración.',
      emailLabel: 'Correo de soporte',
      emailBody: 'También puedes escribirnos directamente.',
      formTitle: 'Enviar un mensaje',
      nameLabel: 'Nombre',
      emailFieldLabel: 'Correo electrónico',
      messageLabel: 'Mensaje',
      namePlaceholder: 'Tu nombre',
      emailPlaceholder: 'tu@ejemplo.com',
      messagePlaceholder: 'Describe brevemente tu pregunta o sugerencia.',
      send: 'Enviar mensaje',
      sending: 'Enviando…',
      sent: 'Tu mensaje fue enviado. Te responderemos por correo lo antes posible.',
      failed: 'No podemos enviar tu mensaje ahora. Inténtalo más tarde o escríbenos directamente.',
      privacy: 'Al enviar, aceptas que usemos esta información solo para atender esta consulta. No envíes contraseñas, códigos, documentos de identidad ni otra información sensible.',
      errorName: 'Introduce un nombre de entre 1 y 120 caracteres.',
      errorEmail: 'Introduce un correo electrónico válido.',
      errorMessage: 'Introduce un mensaje de entre 2 y 5000 caracteres.',
    },
  },
};

export function getPublicInfoCopy(locale: AppLocale): PublicInfoCopy {
  return copy[locale] ?? copy['zh-CN'];
}
