import { dispatchReminders } from "./dispatch";
import { logger } from "./logger";

async function main() {
  const intervalSec = Number(process.env.REMINDER_POLL_INTERVAL_SECONDS ?? 60);
  logger.info({ intervalSec }, "Reminder worker starting");

  const tick = async () => {
    try {
      const result = await dispatchReminders();
      logger.info(result, "Reminder tick complete");
    } catch (err) {
      logger.error({ err }, "Reminder tick failed");
    }
  };

  await tick();
  setInterval(tick, intervalSec * 1000);
}

main().catch((err) => {
  logger.error({ err }, "Worker crashed");
  process.exit(1);
});
