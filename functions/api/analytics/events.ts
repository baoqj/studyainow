import { ApiError, errorResponse, json, readJson } from '../../_lib/http';

const ALLOWED_EVENTS = new Set(['sms_intro_page_view', 'sms_open_clicked', 'sms_message_copied']);
const ALLOWED_SOURCES = new Set(['nfc', 'qr']);

interface AnalyticsPayload {
  event_name?: string;
  card_id?: string;
  source?: string | null;
  campaign?: string | null;
  event?: string | null;
  page_path?: string | null;
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.slice(0, maxLength);
}

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  try {
    const payload = await readJson<AnalyticsPayload>(request);
    const eventName = cleanText(payload.event_name, 80);

    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      throw new ApiError(400, 'Unsupported analytics event');
    }

    const source = cleanText(payload.source, 20);
    const analyticsEvent = {
      event_name: eventName,
      card_id: cleanText(payload.card_id, 80),
      source: source && ALLOWED_SOURCES.has(source) ? source : null,
      campaign: cleanText(payload.campaign, 120),
      event: cleanText(payload.event, 120),
      page_path: cleanText(payload.page_path, 240),
      referrer: cleanText(request.headers.get('referer'), 240),
      logged_at: new Date().toISOString(),
    };

    console.log('analytics_event', JSON.stringify(analyticsEvent));

    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};
