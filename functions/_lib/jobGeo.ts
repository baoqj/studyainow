export type JobGeoLocation = {
  rawText: string;
  countryCode: string | null;
  countryName: string | null;
  regionName: string | null;
  cityName: string | null;
  isRemote: boolean;
  confidence: number;
  source: 'structured_source' | 'location_text';
};

type LocationObject = Record<string, unknown>;

// ISO 3166-1 alpha-2 regions. Names are resolved at runtime with Intl so the
// parser recognises country names supplied in English, Chinese, French and
// Spanish without sending job locations to a third-party geocoding service.
const REGION_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW`.split(' ');

const COUNTRY_ALIASES: Record<string, string> = {
  'usa': 'US', 'us': 'US', 'u s': 'US', 'u s a': 'US', 'united states of america': 'US', 'america': 'US',
  'uk': 'GB', 'u k': 'GB', 'great britain': 'GB', 'britain': 'GB', 'england': 'GB',
  'uae': 'AE', 'u a e': 'AE', 'emirates': 'AE',
  'south korea': 'KR', 'republic of korea': 'KR', 'north korea': 'KP',
  'taiwan': 'TW', 'taiwan china': 'TW', 'hong kong': 'HK', 'macao': 'MO', 'macau': 'MO',
  'china': 'CN', 'mainland china': 'CN', 'prc': 'CN',
  'russia': 'RU', 'russian federation': 'RU', 'czech republic': 'CZ', 'czechia': 'CZ',
  'viet nam': 'VN', 'vietnam': 'VN', 'laos': 'LA', 'moldova': 'MD', 'bolivia': 'BO',
  'venezuela': 'VE', 'iran': 'IR', 'syria': 'SY', 'tanzania': 'TZ', 'brunei': 'BN',
  'palestine': 'PS', 'kosovo': 'XK',
  '美国': 'US', '英国': 'GB', '加拿大': 'CA', '中国': 'CN', '中國': 'CN', '香港': 'HK', '台湾': 'TW', '台灣': 'TW',
  'france': 'FR', 'germany': 'DE', 'espana': 'ES', 'spain': 'ES', 'mexico': 'MX', 'brazil': 'BR',
};

const US_STATE_REGIONS: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

const CANADA_PROVINCE_REGIONS: Record<string, string> = {
  AB: 'Alberta', ALBERTA: 'Alberta', BC: 'British Columbia', 'BRITISH COLUMBIA': 'British Columbia', MB: 'Manitoba', MANITOBA: 'Manitoba',
  NB: 'New Brunswick', 'NEW BRUNSWICK': 'New Brunswick', NL: 'Newfoundland and Labrador', 'NEWFOUNDLAND AND LABRADOR': 'Newfoundland and Labrador',
  NS: 'Nova Scotia', 'NOVA SCOTIA': 'Nova Scotia', NT: 'Northwest Territories', 'NORTHWEST TERRITORIES': 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', ONTARIO: 'Ontario', PE: 'Prince Edward Island', 'PRINCE EDWARD ISLAND': 'Prince Edward Island',
  QC: 'Quebec', QUÉBEC: 'Quebec', QUEBEC: 'Quebec', SK: 'Saskatchewan', SASKATCHEWAN: 'Saskatchewan',
  YT: 'Yukon', YUKON: 'Yukon',
};

type ChinaPlace = { region: string; city: string | null };

// Mainland city-to-province reference data. It covers all provincial capitals,
// municipalities and the main technology/employment centres used by official
// career sites. We only infer a province when this exact local mapping exists.
const CHINA_PLACES: Record<string, ChinaPlace> = {
  北京: { region: '北京市', city: '北京市' }, 北京市: { region: '北京市', city: '北京市' },
  上海: { region: '上海市', city: '上海市' }, 上海市: { region: '上海市', city: '上海市' },
  天津: { region: '天津市', city: '天津市' }, 天津市: { region: '天津市', city: '天津市' },
  重庆: { region: '重庆市', city: '重庆市' }, 重庆市: { region: '重庆市', city: '重庆市' },
  广州: { region: '广东省', city: '广州市' }, 广州市: { region: '广东省', city: '广州市' }, 深圳: { region: '广东省', city: '深圳市' }, 深圳市: { region: '广东省', city: '深圳市' },
  东莞: { region: '广东省', city: '东莞市' }, 东莞市: { region: '广东省', city: '东莞市' }, 佛山: { region: '广东省', city: '佛山市' }, 佛山市: { region: '广东省', city: '佛山市' },
  珠海: { region: '广东省', city: '珠海市' }, 珠海市: { region: '广东省', city: '珠海市' }, 惠州: { region: '广东省', city: '惠州市' }, 惠州市: { region: '广东省', city: '惠州市' },
  横琴粤澳深度合作区: { region: '广东省', city: '珠海市' }, 横琴: { region: '广东省', city: '珠海市' },
  杭州: { region: '浙江省', city: '杭州市' }, 杭州市: { region: '浙江省', city: '杭州市' }, 宁波: { region: '浙江省', city: '宁波市' }, 宁波市: { region: '浙江省', city: '宁波市' },
  南京: { region: '江苏省', city: '南京市' }, 南京市: { region: '江苏省', city: '南京市' }, 苏州: { region: '江苏省', city: '苏州市' }, 苏州市: { region: '江苏省', city: '苏州市' },
  无锡: { region: '江苏省', city: '无锡市' }, 无锡市: { region: '江苏省', city: '无锡市' }, 常州: { region: '江苏省', city: '常州市' }, 常州市: { region: '江苏省', city: '常州市' },
  成都: { region: '四川省', city: '成都市' }, 成都市: { region: '四川省', city: '成都市' }, 绵阳: { region: '四川省', city: '绵阳市' }, 绵阳市: { region: '四川省', city: '绵阳市' },
  武汉: { region: '湖北省', city: '武汉市' }, 武汉市: { region: '湖北省', city: '武汉市' }, 长沙: { region: '湖南省', city: '长沙市' }, 长沙市: { region: '湖南省', city: '长沙市' },
  西安: { region: '陕西省', city: '西安市' }, 西安市: { region: '陕西省', city: '西安市' }, 郑州: { region: '河南省', city: '郑州市' }, 郑州市: { region: '河南省', city: '郑州市' },
  合肥: { region: '安徽省', city: '合肥市' }, 合肥市: { region: '安徽省', city: '合肥市' }, 福州: { region: '福建省', city: '福州市' }, 福州市: { region: '福建省', city: '福州市' },
  厦门: { region: '福建省', city: '厦门市' }, 厦门市: { region: '福建省', city: '厦门市' }, 济南: { region: '山东省', city: '济南市' }, 济南市: { region: '山东省', city: '济南市' },
  青岛: { region: '山东省', city: '青岛市' }, 青岛市: { region: '山东省', city: '青岛市' }, 石家庄: { region: '河北省', city: '石家庄市' }, 石家庄市: { region: '河北省', city: '石家庄市' },
  保定: { region: '河北省', city: '保定市' }, 保定市: { region: '河北省', city: '保定市' }, 太原: { region: '山西省', city: '太原市' }, 太原市: { region: '山西省', city: '太原市' },
  沈阳: { region: '辽宁省', city: '沈阳市' }, 沈阳市: { region: '辽宁省', city: '沈阳市' }, 大连: { region: '辽宁省', city: '大连市' }, 大连市: { region: '辽宁省', city: '大连市' },
  长春: { region: '吉林省', city: '长春市' }, 长春市: { region: '吉林省', city: '长春市' }, 哈尔滨: { region: '黑龙江省', city: '哈尔滨市' }, 哈尔滨市: { region: '黑龙江省', city: '哈尔滨市' },
  昆明: { region: '云南省', city: '昆明市' }, 昆明市: { region: '云南省', city: '昆明市' }, 贵阳: { region: '贵州省', city: '贵阳市' }, 贵阳市: { region: '贵州省', city: '贵阳市' },
  南昌: { region: '江西省', city: '南昌市' }, 南昌市: { region: '江西省', city: '南昌市' }, 南宁: { region: '广西壮族自治区', city: '南宁市' }, 南宁市: { region: '广西壮族自治区', city: '南宁市' },
  海口: { region: '海南省', city: '海口市' }, 海口市: { region: '海南省', city: '海口市' }, 三亚: { region: '海南省', city: '三亚市' }, 三亚市: { region: '海南省', city: '三亚市' },
  兰州: { region: '甘肃省', city: '兰州市' }, 兰州市: { region: '甘肃省', city: '兰州市' }, 西宁: { region: '青海省', city: '西宁市' }, 西宁市: { region: '青海省', city: '西宁市' },
  银川: { region: '宁夏回族自治区', city: '银川市' }, 银川市: { region: '宁夏回族自治区', city: '银川市' }, 乌鲁木齐: { region: '新疆维吾尔自治区', city: '乌鲁木齐市' }, 乌鲁木齐市: { region: '新疆维吾尔自治区', city: '乌鲁木齐市' },
  拉萨: { region: '西藏自治区', city: '拉萨市' }, 拉萨市: { region: '西藏自治区', city: '拉萨市' }, 呼和浩特: { region: '内蒙古自治区', city: '呼和浩特市' }, 呼和浩特市: { region: '内蒙古自治区', city: '呼和浩特市' },
};

const CHINA_REGIONS = new Set([
  '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省',
  '广东省', '海南省', '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省', '台湾省', '北京市', '天津市', '上海市', '重庆市',
  '内蒙古自治区', '广西壮族自治区', '西藏自治区', '宁夏回族自治区', '新疆维吾尔自治区', '香港特别行政区', '澳门特别行政区',
]);

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[._()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const countryNames = new Map<string, { code: string; name: string }>();
for (const code of REGION_CODES) {
  for (const locale of ['en', 'fr', 'es', 'zh-CN', 'zh-TW']) {
    try {
      const DisplayNames = (Intl as unknown as { DisplayNames?: new (locales: string[], options: { type: 'region' }) => { of(code: string): string | undefined } }).DisplayNames;
      const name = DisplayNames ? new DisplayNames([locale], { type: 'region' }).of(code) : undefined;
      if (name) countryNames.set(normalizeText(name), { code, name: new DisplayNames(['en'], { type: 'region' }).of(code) ?? code });
    } catch {
      // The explicit aliases still cover common country names on runtimes that
      // lack Intl.DisplayNames. Unknown values remain unclassified rather than guessed.
    }
  }
}

function resolveCountryExact(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmed) && REGION_CODES.includes(trimmed)) {
    const entry = countryNames.get(normalizeText(trimmed));
    const DisplayNames = (Intl as unknown as { DisplayNames?: new (locales: string[], options: { type: 'region' }) => { of(code: string): string | undefined } }).DisplayNames;
    return { code: trimmed, name: entry?.name ?? (DisplayNames ? new DisplayNames(['en'], { type: 'region' }).of(trimmed) ?? trimmed : trimmed) };
  }
  const key = normalizeText(value);
  const alias = COUNTRY_ALIASES[key];
  if (alias) {
    const DisplayNames = (Intl as unknown as { DisplayNames?: new (locales: string[], options: { type: 'region' }) => { of(code: string): string | undefined } }).DisplayNames;
    return { code: alias, name: DisplayNames ? new DisplayNames(['en'], { type: 'region' }).of(alias) ?? alias : alias };
  }
  return countryNames.get(key) ?? null;
}

function findCountryInText(value: string) {
  const exact = resolveCountryExact(value);
  if (exact) return exact;
  const normalized = normalizeText(value);
  const named = [...countryNames.entries(), ...Object.entries(COUNTRY_ALIASES).map(([name, code]) => [name, { code, name: resolveCountryExact(code)?.name ?? code }] as const)]
    .sort(([left], [right]) => right.length - left.length);
  for (const [name, country] of named) {
    const pattern = new RegExp(`(?:^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z])`, 'i');
    if (pattern.test(normalized)) return country;
  }
  return null;
}

function sourceObject(value: unknown): LocationObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LocationObject : null;
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null;
}

function isRemoteText(value: string) {
  return /\b(remote|distributed|work from home|anywhere)\b|远程|遠端|居家办公|居家辦公|t[eé]l[eé]travail/i.test(value);
}

function cleanPlacePart(value: string) {
  const cleaned = value.replace(/\b(remote|hybrid|on[-\s]?site|distributed|work from home|anywhere)\b/gi, '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

function countryFromCode(code: string) {
  return resolveCountryExact(code);
}

function locationParts(value: string) {
  return value.split(/[,;|]|\s+[—–-]\s+/).map((part) => part.trim()).filter(Boolean);
}

function usStateInParts(parts: string[], structuredRegion: string | null) {
  const candidates = [structuredRegion, ...parts].filter((value): value is string => Boolean(value));
  for (const value of candidates) {
    const code = value.trim().toUpperCase();
    if (US_STATE_REGIONS[code]) return { code, name: US_STATE_REGIONS[code] };
  }
  return null;
}

function canadaProvinceInParts(parts: string[], structuredRegion: string | null) {
  const candidates = [structuredRegion, ...parts].filter((value): value is string => Boolean(value));
  for (const value of candidates) {
    const key = value.trim().toUpperCase();
    if (CANADA_PROVINCE_REGIONS[key]) return CANADA_PROVINCE_REGIONS[key];
  }
  return null;
}

function chinaPlaceInText(value: string) {
  const compact = value.replace(/[\s,，、;；|]/g, '');
  if (CHINA_PLACES[compact]) return CHINA_PLACES[compact];
  const known = Object.keys(CHINA_PLACES).sort((left, right) => right.length - left.length).find((name) => compact.includes(name));
  if (known) return CHINA_PLACES[known];
  const region = [...CHINA_REGIONS].find((name) => compact.includes(name));
  return region ? { region, city: null } : null;
}

function explicitCountryInParts(parts: string[]) {
  for (const part of parts) {
    const country = resolveCountryExact(part) ?? findCountryInText(part);
    if (country) return country;
  }
  return null;
}

/**
 * Produce a conservative country/city record. Country must be explicit in an
 * ATS structured field or the location text. City is retained only as an
 * explicitly separated place segment; no external geocoder is used to infer it.
 */
export function normalizeJobLocation(value: unknown): JobGeoLocation | null {
  const object = sourceObject(value);
  // Accept both ATS-specific field names and Schema.org PostalAddress names.
  // Ashby and future JSON-LD sources commonly use addressLocality,
  // addressRegion and addressCountry, which provide higher-confidence city
  // classification than a human display label such as "Toronto".
  const structuredCountry = object ? firstString(object.countryCode, object.country_code, object.country, object.countryName, object.addressCountry) : null;
  const structuredCity = object ? firstString(object.city, object.cityName, object.locality, object.addressLocality) : null;
  const structuredRegion = object ? firstString(object.region, object.regionName, object.state, object.stateCode, object.province, object.addressRegion) : null;
  const rawText = typeof value === 'string'
    ? value.trim()
    : firstString(object?.formattedAddress, object?.location, object?.locationName, object?.name, object?.text, object?.displayName)
      ?? [structuredCity, structuredRegion, structuredCountry].filter(Boolean).join(', ');
  if (!rawText) return null;

  const parts = locationParts(rawText);
  const chinaPlace = chinaPlaceInText(structuredCity ?? rawText) ?? chinaPlaceInText(structuredRegion ?? '');
  const usState = usStateInParts(parts, structuredRegion);
  const canadaProvince = canadaProvinceInParts(parts, structuredRegion);
  const country = structuredCountry
    ? resolveCountryExact(structuredCountry) ?? findCountryInText(structuredCountry)
    : chinaPlace ? countryFromCode('CN') : usState ? countryFromCode('US') : canadaProvince ? countryFromCode('CA') : findCountryInText(rawText) ?? explicitCountryInParts(parts);
  const isRemote = isRemoteText(rawText);
  const countryIndex = parts.findIndex((part) => Boolean(resolveCountryExact(part) ?? findCountryInText(part)));
  const stateIndex = usState ? parts.findIndex((part) => part.trim().toUpperCase() === usState.code) : -1;
  const placeParts = parts.filter((part, index) => index !== countryIndex && index !== stateIndex).map(cleanPlacePart).filter((part): part is string => Boolean(part));
  const cityName = chinaPlace?.city ?? structuredCity ?? (isRemote ? null : placeParts[0] ?? null);
  const regionName = chinaPlace?.region ?? usState?.name ?? canadaProvince ?? structuredRegion ?? (isRemote ? null : placeParts.length > 1 ? placeParts[1] : null);
  const confidence = country
    ? structuredCountry || structuredCity || structuredRegion ? 1 : cityName ? 0.82 : 0.9
    : cityName ? 0.45 : 0.2;

  return {
    rawText,
    countryCode: country?.code ?? null,
    countryName: country?.name ?? null,
    regionName,
    cityName,
    isRemote,
    confidence,
    source: structuredCountry || structuredCity || structuredRegion ? 'structured_source' : 'location_text',
  };
}

export function normalizeJobLocations(values: unknown[]) {
  const result: JobGeoLocation[] = [];
  const seen = new Set<string>();
  const expandedValues = values.flatMap((value) => {
    if (typeof value !== 'string') return [value];
    const primary = value.split(/[|;；]/).map((part) => part.trim()).filter(Boolean);
    // Chinese official boards often list multiple cities with Chinese commas;
    // preserve ordinary English "City, Region, Country" address syntax.
    return primary.flatMap((part) => {
      const chineseParts = part.split(/[，、,]/).map((item) => item.trim()).filter(Boolean);
      return chineseParts.length > 1 && chineseParts.every((item) => Boolean(chinaPlaceInText(item))) ? chineseParts : [part];
    });
  });
  for (const value of expandedValues) {
    const location = normalizeJobLocation(value);
    if (!location) continue;
    const key = `${location.countryCode ?? ''}|${location.regionName ?? ''}|${location.cityName ?? ''}|${location.rawText}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(location);
  }
  return result;
}
