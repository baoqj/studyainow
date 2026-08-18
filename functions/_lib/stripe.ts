export const COFFEE_AMOUNTS = [2, 5, 10] as const;
export type CoffeeAmount = (typeof COFFEE_AMOUNTS)[number];

function hasCoffeeAmount(value: number): value is CoffeeAmount {
  return (COFFEE_AMOUNTS as readonly number[]).includes(value);
}

export function parseCoffeeAmount(value: unknown): CoffeeAmount | null {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(amount) && hasCoffeeAmount(amount) ? amount : null;
}

export function stripeApiKey(env: Env) {
  // STRIPE_RESTRICTED_KEYS was set before the singular variable name was
  // standardised. Keep it as a backwards-compatible fallback until it is
  // renamed in the Worker dashboard.
  return env.STRIPE_RESTRICTED_KEY || env.STRIPE_RESTRICTED_KEYS || env.STRIPE_SECRET_KEY || null;
}

export function coffeePriceId(env: Env, amount: CoffeeAmount) {
  if (amount === 2) return env.STRIPE_PRICE_COFFEE_2 || null;
  if (amount === 5) return env.STRIPE_PRICE_COFFEE_5 || null;
  return env.STRIPE_PRICE_COFFEE_10 || null;
}

export function stripeAuthorization(apiKey: string) {
  return `Basic ${btoa(`${apiKey}:`)}`;
}
