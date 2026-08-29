import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const index = read('../index.html');
const ad = read('../src/components/ads/AdSenseAd.tsx');
const course = read('../src/components/course/ContentArea.tsx');
const interview = read('../src/pages/InterviewQuestion.tsx');
const resume = read('../src/pages/user/ResumeStudio.tsx');
const privacy = read('../src/data/publicInfoCopy.ts');
const routes = read('../src/lib/routeMetadata.ts');

assert.match(index, /google-adsense-account[^>]+ca-pub-2674524487916692/, 'ownership meta tag is missing');
assert.doesNotMatch(index, /pagead2\.googlesyndication\.com/, 'AdSense loader must not run site-wide');
assert.match(ad, /document\.head\.appendChild\(script\)/, 'ad loader must be route/component scoped');
assert.match(course, /lesson\s*&&\s*<AdSenseAd/, 'course ads must require a real lesson');
assert.match(interview, /<AdSenseAd\s*\/>/, 'interview question ad placement is missing');
assert.doesNotMatch(resume, /AdSenseAd|adsbygoogle|googlesyndication/, 'resume tool must remain ad-free');
assert.match(privacy, /Google AdSense/, 'privacy policy needs an English AdSense disclosure');
assert.match(privacy, /Google AdSense[^\n]+广告/, 'privacy policy needs a Chinese AdSense disclosure');
assert.match(routes, /PRIVATE_OR_BEHAVIOR_PATHS/, 'private and behavioral routes need explicit noindex policy');
assert.match(routes, /Page not found/, 'unknown routes need not-found metadata');

console.log(JSON.stringify({
  ownershipMeta: true,
  globalAdLoader: false,
  contentOnlyAds: true,
  resumeAds: false,
  privacyDisclosure: true,
  routePolicy: true,
}));
