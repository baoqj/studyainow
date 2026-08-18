import { ApiError, errorResponse, json, readJson } from '../../_lib/http';
import { coffeePriceId, parseCoffeeAmount, stripeApiKey, stripeAuthorization } from '../../_lib/stripe';

const checkoutLocales: Record<string, string> = {
  'zh-CN': 'zh',
  'zh-TW': 'zh-TW',
  en: 'en',
  fr: 'fr',
  es: 'es',
};

function appOrigin(request: Request, env: Env) {
  return (env.APP_ORIGIN || new URL(request.url).origin).replace(/\/$/, '');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<{ amount?: unknown; language?: unknown }>(request);
    const amount = parseCoffeeAmount(body.amount);
    if (amount === null) throw new ApiError(400, 'Choose a supported coffee amount');
    const apiKey = stripeApiKey(env);
    const priceId = coffeePriceId(env, amount);

    if (!apiKey || !priceId) {
      throw new ApiError(503, 'Donations are not configured');
    }

    const origin = appOrigin(request, env);
    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && requestOrigin !== origin) {
      throw new ApiError(403, 'Invalid request origin');
    }

    const language = typeof body.language === 'string' && checkoutLocales[body.language] ? body.language : 'en';
    const params = new URLSearchParams({
      mode: 'payment',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${origin}/?donation=success&session_id={CHECKOUT_SESSION_ID}&locale=${encodeURIComponent(language)}`,
      cancel_url: `${origin}/?donation=cancelled&locale=${encodeURIComponent(language)}`,
      locale: checkoutLocales[language],
      submit_type: 'donate',
      client_reference_id: crypto.randomUUID(),
      'metadata[source]': 'studyai.now',
      'metadata[locale]': language,
      'metadata[coffee_amount_usd]': String(amount),
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: stripeAuthorization(apiKey),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const stripeData = (await stripeResponse.json()) as { url?: unknown; error?: { message?: unknown } };
    if (!stripeResponse.ok || typeof stripeData.url !== 'string') {
      console.error('Stripe Checkout session creation failed', stripeResponse.status, stripeData.error?.message);
      throw new ApiError(502, 'Unable to create secure checkout');
    }

    return json({ url: stripeData.url, amount });
  } catch (error) {
    return errorResponse(error);
  }
};
