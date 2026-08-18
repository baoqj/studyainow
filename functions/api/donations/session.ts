import { ApiError, errorResponse, json } from '../../_lib/http';
import { stripeApiKey, stripeAuthorization } from '../../_lib/stripe';

type StripeCheckoutSession = {
  amount_total?: unknown;
  currency?: unknown;
  metadata?: { source?: unknown; coffee_amount_usd?: unknown } | null;
  mode?: unknown;
  payment_status?: unknown;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const sessionId = new URL(request.url).searchParams.get('session_id')?.trim() ?? '';
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || sessionId.length > 255) {
      throw new ApiError(400, 'Invalid checkout session');
    }

    const apiKey = stripeApiKey(env);
    if (!apiKey) throw new ApiError(503, 'Donations are not configured');

    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { authorization: stripeAuthorization(apiKey) },
    });
    const session = (await response.json()) as StripeCheckoutSession;
    if (!response.ok) {
      console.error('Stripe Checkout session lookup failed', response.status);
      throw new ApiError(502, 'Unable to verify checkout');
    }

    const paid = session.mode === 'payment'
      && session.payment_status === 'paid'
      && session.metadata?.source === 'studyai.now';

    return json({
      paid,
      amount: paid && typeof session.amount_total === 'number' ? session.amount_total : null,
      currency: paid && typeof session.currency === 'string' ? session.currency : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
