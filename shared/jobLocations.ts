export type JobLocationLocale = 'zh-CN' | 'zh-TW' | 'en' | 'fr' | 'es';

type LocalizedNames = Record<JobLocationLocale, string>;
type CityDefinition = {
  countryCode: string;
  slug: string;
  aliases: string[];
  names: LocalizedNames;
};

const COUNTRY_NAMES: Partial<Record<string, LocalizedNames>> = {
  AE: { 'zh-CN': '阿联酋', 'zh-TW': '阿聯酋', en: 'United Arab Emirates', fr: 'Émirats arabes unis', es: 'Emiratos Árabes Unidos' },
  AU: { 'zh-CN': '澳洲', 'zh-TW': '澳洲', en: 'Australia', fr: 'Australie', es: 'Australia' },
  CN: { 'zh-CN': '中国', 'zh-TW': '中國', en: 'China', fr: 'Chine', es: 'China' },
  EU: { 'zh-CN': '欧洲', 'zh-TW': '歐洲', en: 'Europe', fr: 'Europe', es: 'Europa' },
  GB: { 'zh-CN': '英国', 'zh-TW': '英國', en: 'United Kingdom', fr: 'Royaume-Uni', es: 'Reino Unido' },
  HK: { 'zh-CN': '香港', 'zh-TW': '香港', en: 'Hong Kong', fr: 'Hong Kong', es: 'Hong Kong' },
  TW: { 'zh-CN': '台湾', 'zh-TW': '臺灣', en: 'Taiwan', fr: 'Taïwan', es: 'Taiwán' },
  US: { 'zh-CN': '美国', 'zh-TW': '美國', en: 'United States', fr: 'États-Unis', es: 'Estados Unidos' },
};

// These canonical city identities keep the public URL stable and merge the
// variant names supplied by official ATS boards. New, unrecognised places
// remain usable with their source name until they are added here.
const CITIES: CityDefinition[] = [
  { countryCode: 'AU', slug: 'sydney', aliases: ['Sydney'], names: { 'zh-CN': '悉尼', 'zh-TW': '悉尼', en: 'Sydney', fr: 'Sydney', es: 'Sídney' } },
  { countryCode: 'CA', slug: 'toronto', aliases: ['Toronto'], names: { 'zh-CN': '多伦多', 'zh-TW': '多倫多', en: 'Toronto', fr: 'Toronto', es: 'Toronto' } },
  { countryCode: 'CA', slug: 'vancouver', aliases: ['Vancouver'], names: { 'zh-CN': '温哥华', 'zh-TW': '溫哥華', en: 'Vancouver', fr: 'Vancouver', es: 'Vancouver' } },
  { countryCode: 'CH', slug: 'zurich', aliases: ['Zürich', 'Zurich'], names: { 'zh-CN': '苏黎世', 'zh-TW': '蘇黎世', en: 'Zurich', fr: 'Zurich', es: 'Zúrich' } },
  { countryCode: 'CN', slug: 'beijing', aliases: ['北京', '北京市'], names: { 'zh-CN': '北京', 'zh-TW': '北京', en: 'Beijing', fr: 'Pékin', es: 'Pekín' } },
  { countryCode: 'CN', slug: 'chengdu', aliases: ['成都', '成都市'], names: { 'zh-CN': '成都', 'zh-TW': '成都', en: 'Chengdu', fr: 'Chengdu', es: 'Chengdu' } },
  { countryCode: 'CN', slug: 'chongqing', aliases: ['重庆', '重庆市', '重慶', '重慶市'], names: { 'zh-CN': '重庆', 'zh-TW': '重慶', en: 'Chongqing', fr: 'Chongqing', es: 'Chongqing' } },
  { countryCode: 'CN', slug: 'guangzhou', aliases: ['广州', '广州市', '廣州', '廣州市'], names: { 'zh-CN': '广州', 'zh-TW': '廣州', en: 'Guangzhou', fr: 'Canton', es: 'Cantón' } },
  { countryCode: 'CN', slug: 'guiyang', aliases: ['贵阳', '贵阳市', '貴陽', '貴陽市'], names: { 'zh-CN': '贵阳', 'zh-TW': '貴陽', en: 'Guiyang', fr: 'Guiyang', es: 'Guiyang' } },
  { countryCode: 'CN', slug: 'hangzhou', aliases: ['杭州', '杭州市'], names: { 'zh-CN': '杭州', 'zh-TW': '杭州', en: 'Hangzhou', fr: 'Hangzhou', es: 'Hangzhou' } },
  { countryCode: 'CN', slug: 'jinan', aliases: ['济南', '济南市', '濟南', '濟南市'], names: { 'zh-CN': '济南', 'zh-TW': '濟南', en: 'Jinan', fr: 'Jinan', es: 'Jinan' } },
  { countryCode: 'CN', slug: 'shanghai', aliases: ['上海', '上海市'], names: { 'zh-CN': '上海', 'zh-TW': '上海', en: 'Shanghai', fr: 'Shanghai', es: 'Shanghaï' } },
  { countryCode: 'CN', slug: 'shenzhen', aliases: ['深圳', '深圳市'], names: { 'zh-CN': '深圳', 'zh-TW': '深圳', en: 'Shenzhen', fr: 'Shenzhen', es: 'Shenzhen' } },
  { countryCode: 'CN', slug: 'zhuhai', aliases: ['珠海', '珠海市'], names: { 'zh-CN': '珠海', 'zh-TW': '珠海', en: 'Zhuhai', fr: 'Zhuhai', es: 'Zhuhai' } },
  { countryCode: 'DE', slug: 'munich', aliases: ['Munich', 'München'], names: { 'zh-CN': '慕尼黑', 'zh-TW': '慕尼黑', en: 'Munich', fr: 'Munich', es: 'Múnich' } },
  { countryCode: 'FR', slug: 'paris', aliases: ['Paris'], names: { 'zh-CN': '巴黎', 'zh-TW': '巴黎', en: 'Paris', fr: 'Paris', es: 'París' } },
  { countryCode: 'GB', slug: 'london', aliases: ['London'], names: { 'zh-CN': '伦敦', 'zh-TW': '倫敦', en: 'London', fr: 'Londres', es: 'Londres' } },
  { countryCode: 'HK', slug: 'hong-kong', aliases: ['Hong Kong', '香港'], names: { 'zh-CN': '香港', 'zh-TW': '香港', en: 'Hong Kong', fr: 'Hong Kong', es: 'Hong Kong' } },
  { countryCode: 'IE', slug: 'dublin', aliases: ['Dublin'], names: { 'zh-CN': '都柏林', 'zh-TW': '都柏林', en: 'Dublin', fr: 'Dublin', es: 'Dublín' } },
  { countryCode: 'IN', slug: 'bengaluru', aliases: ['Bangalore', 'Bengaluru'], names: { 'zh-CN': '班加罗尔', 'zh-TW': '班加羅爾', en: 'Bengaluru', fr: 'Bangalore', es: 'Bangalore' } },
  { countryCode: 'JP', slug: 'tokyo', aliases: ['Tokyo', 'Tokyo Prefecture'], names: { 'zh-CN': '东京', 'zh-TW': '東京', en: 'Tokyo', fr: 'Tokyo', es: 'Tokio' } },
  { countryCode: 'KR', slug: 'seoul', aliases: ['Seoul'], names: { 'zh-CN': '首尔', 'zh-TW': '首爾', en: 'Seoul', fr: 'Séoul', es: 'Seúl' } },
  { countryCode: 'SG', slug: 'singapore', aliases: ['Singapore', '新加坡'], names: { 'zh-CN': '新加坡', 'zh-TW': '新加坡', en: 'Singapore', fr: 'Singapour', es: 'Singapur' } },
  { countryCode: 'TW', slug: 'taipei', aliases: ['Taipei', '台北', '臺北'], names: { 'zh-CN': '台北', 'zh-TW': '臺北', en: 'Taipei', fr: 'Taipei', es: 'Taipéi' } },
  { countryCode: 'US', slug: 'boston', aliases: ['Boston'], names: { 'zh-CN': '波士顿', 'zh-TW': '波士頓', en: 'Boston', fr: 'Boston', es: 'Boston' } },
  { countryCode: 'US', slug: 'los-angeles', aliases: ['Los Angeles'], names: { 'zh-CN': '洛杉矶', 'zh-TW': '洛杉磯', en: 'Los Angeles', fr: 'Los Angeles', es: 'Los Ángeles' } },
  { countryCode: 'US', slug: 'new-york', aliases: ['New York', 'New York City'], names: { 'zh-CN': '纽约', 'zh-TW': '紐約', en: 'New York', fr: 'New York', es: 'Nueva York' } },
  { countryCode: 'US', slug: 'san-francisco', aliases: ['San Francisco'], names: { 'zh-CN': '旧金山', 'zh-TW': '三藩市', en: 'San Francisco', fr: 'San Francisco', es: 'San Francisco' } },
  { countryCode: 'US', slug: 'san-jose', aliases: ['San Jose', 'San José'], names: { 'zh-CN': '圣何塞', 'zh-TW': '聖荷西', en: 'San Jose', fr: 'San José', es: 'San José' } },
  { countryCode: 'US', slug: 'seattle', aliases: ['Seattle'], names: { 'zh-CN': '西雅图', 'zh-TW': '西雅圖', en: 'Seattle', fr: 'Seattle', es: 'Seattle' } },
  { countryCode: 'US', slug: 'washington', aliases: ['Washington', 'Washington, D.C.', 'Washington DC'], names: { 'zh-CN': '华盛顿', 'zh-TW': '華盛頓', en: 'Washington', fr: 'Washington', es: 'Washington' } },
];

// Official feeds occasionally supply only a Canadian province in their city
// field. Do not present those values as a fake city option or card location.
// This narrow list intentionally does not exclude genuine city/state pairs
// such as New York, Beijing, Paris, or Zurich.
const REGION_ONLY_LOCATIONS: Record<string, string[]> = {
  CA: ['British Columbia', 'Ontario'],
};

function normalise(value: string) {
  return value.trim().toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

function cityDefinition(countryCode: string | null | undefined, value: string | null | undefined) {
  if (!countryCode || !value?.trim()) return null;
  const country = countryCode.toUpperCase();
  const token = normalise(value);
  return CITIES.find((city) => city.countryCode === country && (city.slug === token || city.aliases.some((alias) => normalise(alias) === token))) ?? null;
}

export function citySlugFor(countryCode: string | null | undefined, value: string | null | undefined) {
  if (!value?.trim()) return '';
  return cityDefinition(countryCode, value)?.slug ?? value.trim();
}

export function cityAliasesForSlug(countryCode: string | null | undefined, slugOrName: string) {
  const city = cityDefinition(countryCode, slugOrName);
  return city ? [...new Set([city.slug, ...city.aliases])] : [slugOrName.trim()];
}

export function localizeCity(countryCode: string | null | undefined, value: string | null | undefined, locale: JobLocationLocale) {
  if (!value?.trim()) return '';
  return cityDefinition(countryCode, value)?.names[locale] ?? value.trim();
}

export function isRegionOnlyLocation(countryCode: string | null | undefined, value: string | null | undefined) {
  if (!countryCode || !value?.trim()) return false;
  return (REGION_ONLY_LOCATIONS[countryCode.toUpperCase()] ?? []).some((name) => normalise(name) === normalise(value));
}

export function localizeCountry(countryCode: string | null | undefined, locale: JobLocationLocale, fallback = '') {
  const code = countryCode?.toUpperCase();
  if (!code) return fallback;
  const explicit = COUNTRY_NAMES[code];
  if (explicit) return explicit[locale];
  try {
    return (new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? fallback) || code;
  } catch {
    return fallback || code;
  }
}
