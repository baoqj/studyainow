import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const index = read('../index.html');
const privacy = read('../src/data/publicInfoCopy.ts');
const legalPage = read('../src/pages/LegalPage.tsx');

assert.match(index, /google-adsense-account[^>]+ca-pub-2674524487916692/, 'AdSense ownership meta tag is missing');
assert.doesNotMatch(index, /pagead2\.googlesyndication\.com/, 'the AdSense loader must not run site-wide');
assert.doesNotMatch(index, /adsbygoogle/, 'the site shell must not initialize Google ad placements');
for (const heading of ['广告与 Cookie', '廣告與 Cookie', 'Advertising and cookies', 'Publicité et cookies', 'Publicidad y cookies']) {
  assert.match(privacy, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing privacy disclosure: ${heading}`);
}
assert.match(legalPage, /advertisingResources/, 'privacy resources must be localized');
assert.match(legalPage, /policies\.google\.com\/technologies\/partner-sites/, 'partner-site disclosure link is missing');
assert.match(legalPage, /adssettings\.google\.com/, 'Google Ads Settings link is missing');

console.log(JSON.stringify({
  ownershipMeta: true,
  globalAdLoader: false,
  manualAdPlacements: false,
  localizedPrivacyDisclosure: true,
}, null, 2));
