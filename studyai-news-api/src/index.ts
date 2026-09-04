import { app } from './app';
import { processCandidateBatch } from './enrichment/service';
import type { Env } from './env';
import { runScheduledIngestion } from './ingestion/service';

export default {
  fetch(request, env, context) {
    return app.fetch(request, env, context);
  },
  scheduled(controller, env, context) {
    context.waitUntil(runScheduledIngestion(env, new Date(controller.scheduledTime)).then(async (results) => {
      const enrichment = await processCandidateBatch(env, 100);
      console.log(JSON.stringify({
        event: 'news.ingestion.schedule.completed',
        cron: controller.cron,
        sourceCount: results.length,
        results,
        enrichment,
      }));
    }));
  },
} satisfies ExportedHandler<Env>;
