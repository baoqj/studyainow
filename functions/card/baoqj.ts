import { getCardProfile, serializeVCard } from '../_lib/cardProfiles';

const headers = {
  'content-type': 'text/vcard; charset=utf-8',
  'content-disposition': 'inline; filename="qingjun-bao.vcf"',
  'cache-control': 'public, max-age=3600',
};

export const onRequest: PagesFunction = async ({ request }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        allow: 'GET, HEAD',
      },
    });
  }

  const profile = getCardProfile('baoqj');

  if (!profile) {
    return new Response('Card not found', { status: 404 });
  }

  return new Response(request.method === 'HEAD' ? null : serializeVCard(profile), { headers });
};
