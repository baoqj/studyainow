import type { AppLocale } from './courseContent';

export interface SupportCopy {
  button: string;
  footerButton: string;
  title: string;
  body: string;
  note: string;
  qrPaymentTitle: string;
  qrPaymentDescription: string;
  wechat: string;
  alipay: string;
  qrCodeAlt: string;
  amount: string;
  notNow: string;
  close: string;
  processing: string;
  unavailable: string;
  startFailed: string;
  successTitle: string;
  successBody: string;
  continueLearning: string;
  cancelledTitle: string;
  cancelledBody: string;
  verifyingTitle: string;
  verifyingBody: string;
  verificationFailedTitle: string;
  verificationFailedBody: string;
}

const supportCopy: Record<AppLocale, SupportCopy> = {
  'zh-CN': {
    button: '请我喝杯咖啡',
    footerButton: '请我咖啡',
    title: '支持 StudyAI ☕',
    body: 'StudyAI 对所有人免费开放。\n\n如果这些课程对你有帮助，可以支持这个项目，帮助课程一直保持免费。',
    note: '无需订阅，也没有付费解锁的内容；这只是支持项目的一点心意。',
    qrPaymentTitle: '扫码打赏', qrPaymentDescription: '使用微信或支付宝扫描二维码即可支持 StudyAI。', wechat: '微信支付', alipay: '支付宝', qrCodeAlt: '{{method}} 打赏二维码',
    amount: '☕ ${{amount}}', notNow: '暂时不用', close: '关闭', processing: '正在打开安全支付页面…', unavailable: '打赏暂未开放，请稍后再试。', startFailed: '无法打开安全支付页面，请重试。',
    successTitle: '感谢支持 StudyAI ☕',
    successBody: '你的支持帮助支付网站托管、AI 服务，以及制作更多免费学习资料所投入的时间。',
    continueLearning: '继续学习', cancelledTitle: '没关系', cancelledBody: '本次打赏没有完成，课程仍会一直免费开放。',
    verifyingTitle: '正在确认支付…', verifyingBody: '正在安全确认本次支持。', verificationFailedTitle: '暂未能确认支付', verificationFailedBody: '如果你已完成支付，无需再次付款；请稍后返回查看，或联系支持邮箱。',
  },
  'zh-TW': {
    button: '請我喝杯咖啡',
    footerButton: '請我咖啡',
    title: '支持 StudyAI ☕',
    body: 'StudyAI 對所有人免費開放。\n\n如果這些課程對你有幫助，可以支持這個計畫，讓課程持續免費。',
    note: '無須訂閱，也沒有付費解鎖的內容；這只是支持計畫的一點心意。',
    qrPaymentTitle: '掃碼贊助', qrPaymentDescription: '使用微信或支付寶掃描 QR Code，即可支持 StudyAI。', wechat: '微信支付', alipay: '支付寶', qrCodeAlt: '{{method}} 贊助 QR Code',
    amount: '☕ ${{amount}}', notNow: '暫時不用', close: '關閉', processing: '正在開啟安全付款頁面…', unavailable: '打賞功能暫未開放，請稍後再試。', startFailed: '無法開啟安全付款頁面，請重試。',
    successTitle: '感謝支持 StudyAI ☕',
    successBody: '你的支持有助支付網站代管、AI 服務，以及製作更多免費學習教材所投入的時間。',
    continueLearning: '繼續學習', cancelledTitle: '沒關係', cancelledBody: '本次打賞未完成，課程仍會一直免費開放。',
    verifyingTitle: '正在確認付款…', verifyingBody: '正在安全確認本次支持。', verificationFailedTitle: '尚未能確認付款', verificationFailedBody: '若你已完成付款，無須再次付款；請稍後回來查看，或聯絡支援信箱。',
  },
  en: {
    button: 'Buy me a coffee',
    footerButton: 'A coffee',
    title: 'Support StudyAI ☕',
    body: 'StudyAI is free and open to everyone.\n\nIf these courses have helped you, you can support the project and help keep the lessons free.',
    note: 'No subscription. No paid content unlocks. Just a small way to support the project.',
    qrPaymentTitle: 'Support by QR code', qrPaymentDescription: 'Scan with WeChat or Alipay to support StudyAI.', wechat: 'WeChat', alipay: 'Alipay', qrCodeAlt: '{{method}} support QR code',
    amount: '☕ ${{amount}}', notNow: 'Maybe later', close: 'Close', processing: 'Opening secure checkout…', unavailable: 'Donations are not available yet. Please try again later.', startFailed: 'We could not open secure checkout. Please try again.',
    successTitle: 'Thanks for supporting StudyAI ☕',
    successBody: 'Your support helps cover hosting, AI services, and the time spent creating new free learning materials.',
    continueLearning: 'Continue learning', cancelledTitle: 'No problem', cancelledBody: 'Your donation was not completed. The courses will remain free for you.',
    verifyingTitle: 'Confirming your payment…', verifyingBody: 'We are securely confirming your support.', verificationFailedTitle: 'We could not confirm the payment yet', verificationFailedBody: 'If you completed payment, do not pay again. Please return shortly or contact support.',
  },
  fr: {
    button: 'Offrez-moi un café',
    footerButton: 'Un café',
    title: 'Soutenez StudyAI ☕',
    body: 'StudyAI est gratuit et ouvert à toutes et à tous.\n\nSi ces cours vous ont aidé, vous pouvez soutenir le projet et aider à garder les leçons gratuites.',
    note: 'Aucun abonnement. Aucun contenu à débloquer par paiement. Un petit geste pour soutenir le projet.',
    qrPaymentTitle: 'Soutenir par QR code', qrPaymentDescription: 'Scannez avec WeChat ou Alipay pour soutenir StudyAI.', wechat: 'WeChat', alipay: 'Alipay', qrCodeAlt: 'QR code de soutien {{method}}',
    amount: '☕ ${{amount}}', notNow: 'Peut-être plus tard', close: 'Fermer', processing: 'Ouverture du paiement sécurisé…', unavailable: 'Les dons ne sont pas encore disponibles. Réessayez plus tard.', startFailed: 'Impossible d’ouvrir le paiement sécurisé. Réessayez.',
    successTitle: 'Merci de soutenir StudyAI ☕',
    successBody: 'Votre soutien aide à couvrir l’hébergement, les services d’IA et le temps consacré à créer de nouvelles ressources d’apprentissage gratuites.',
    continueLearning: 'Continuer à apprendre', cancelledTitle: 'Aucun problème', cancelledBody: 'Votre don n’a pas été finalisé. Les cours resteront gratuits.',
    verifyingTitle: 'Confirmation du paiement…', verifyingBody: 'Nous confirmons votre soutien de façon sécurisée.', verificationFailedTitle: 'Le paiement n’a pas encore pu être confirmé', verificationFailedBody: 'Si vous avez payé, ne payez pas une seconde fois. Revenez dans un instant ou contactez le support.',
  },
  es: {
    button: 'Invítame a un café',
    footerButton: 'Un café',
    title: 'Apoya a StudyAI ☕',
    body: 'StudyAI es gratis y está abierto para todo el mundo.\n\nSi estos cursos te han ayudado, puedes apoyar el proyecto y ayudar a mantener las lecciones gratuitas.',
    note: 'Sin suscripción. Sin contenido que se desbloquee pagando. Una pequeña forma de apoyar el proyecto.',
    qrPaymentTitle: 'Apoya con código QR', qrPaymentDescription: 'Escanea con WeChat o Alipay para apoyar a StudyAI.', wechat: 'WeChat', alipay: 'Alipay', qrCodeAlt: 'Código QR de apoyo de {{method}}',
    amount: '☕ ${{amount}}', notNow: 'Quizá más tarde', close: 'Cerrar', processing: 'Abriendo el pago seguro…', unavailable: 'Las donaciones aún no están disponibles. Inténtalo más tarde.', startFailed: 'No pudimos abrir el pago seguro. Vuelve a intentarlo.',
    successTitle: 'Gracias por apoyar a StudyAI ☕',
    successBody: 'Tu apoyo ayuda a cubrir el alojamiento, los servicios de IA y el tiempo dedicado a crear nuevos materiales de aprendizaje gratuitos.',
    continueLearning: 'Seguir aprendiendo', cancelledTitle: 'No pasa nada', cancelledBody: 'Tu donación no se completó. Los cursos seguirán siendo gratuitos.',
    verifyingTitle: 'Confirmando tu pago…', verifyingBody: 'Estamos confirmando tu apoyo de forma segura.', verificationFailedTitle: 'Aún no pudimos confirmar el pago', verificationFailedBody: 'Si completaste el pago, no vuelvas a pagar. Regresa dentro de poco o contacta con soporte.',
  },
};

export function getSupportCopy(locale: AppLocale): SupportCopy {
  return supportCopy[locale] ?? supportCopy.en;
}
