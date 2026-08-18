export interface CardProfile {
  id: string;
  displayName: string;
  smsName: string;
  phone: string;
  email: string;
  businessCardUrl: string;
  smsTemplate: string;
  vcardUrl: string;
}

const cardProfiles: Record<string, CardProfile> = {
  baoqj: {
    id: 'baoqj',
    displayName: '包庆君',
    smsName: 'Bao Qingjun',
    phone: '4389945225',
    email: 'polluxbao@gmail.com',
    businessCardUrl: '/about',
    smsTemplate: 'Hello {recipientName}, this is {senderName}. We just met and I’m glad to connect with you.',
    vcardUrl: '/card/baoqj',
  },
};

export function getCardProfile(cardId: string) {
  return cardProfiles[cardId.toLowerCase()] ?? null;
}

export function renderSmsMessage(profile: CardProfile, senderName: string) {
  const safeSenderName = senderName.trim() || 'MyName';

  return profile.smsTemplate
    .replaceAll('{recipientName}', profile.smsName)
    .replaceAll('{senderName}', safeSenderName);
}

export function publicCardProfile(profile: CardProfile) {
  return {
    id: profile.id,
    displayName: profile.displayName,
    smsName: profile.smsName,
    phone: profile.phone,
    email: profile.email,
    businessCardUrl: profile.businessCardUrl,
    smsTemplate: profile.smsTemplate,
    defaultSenderName: 'MyName',
    defaultMessage: renderSmsMessage(profile, 'MyName'),
    vcardUrl: profile.vcardUrl,
  };
}

export function serializeVCard(profile: CardProfile) {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Bao;Qingjun',
    'FN:Qingjun Bao',
    `TEL;TYPE=CELL;VOICE:${profile.phone}`,
    `EMAIL;WORK;INTERNET:${profile.email}`,
    'URL:www.aibao.me/about',
    'END:VCARD',
  ].join('\r\n') + '\r\n';
}
