import cron from 'node-cron'
import { logger } from '../lib/logger'
import { fixtureService } from './fixture-service'
import { reportService } from './report.service'
import { predictionController } from '../controllers/prediction.controller'

export function startCronJobs() {
  // Every 6 hours: fixture sync
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Cron: fixture sync started')
    try {
      await fixtureService.syncFromProviders()
      logger.info('Cron: fixture sync completed')
    } catch (error) {
      logger.error({ error }, 'Cron: fixture sync failed')
    }
  })

  // Every day at 3 AM: standings sync
  cron.schedule('0 3 * * *', async () => {
    logger.info('Cron: standings sync started')
    try {
      await fixtureService.syncStandings()
      logger.info('Cron: standings sync completed')
    } catch (error) {
      logger.error({ error }, 'Cron: standings sync failed')
    }
  })

  // Every day at 4 AM: season calendar → auto-activate/deactivate
  // competitions whose season started/ended. Also kicked once at startup so
  // a deploy applies the calendar immediately.
  cron.schedule('0 4 * * *', async () => {
    logger.info('Cron: season calendar sync started')
    try {
      await fixtureService.syncSeasonCalendar()
      logger.info('Cron: season calendar sync completed')
    } catch (error) {
      logger.error({ error }, 'Cron: season calendar sync failed')
    }
  })
  fixtureService
    .syncSeasonCalendar()
    .catch((error) =>
      logger.error({ error }, 'Startup season calendar sync failed')
    )

  // Every 6 hours (offset by 30 min from fixture sync): value-bet refresh so
  // the matches list / "Değerli Bahisler" pills and market odds stay warm
  // without anyone clicking the admin button. Also kicked ~1 min after startup
  // (once fixtures have a chance to be present).
  cron.schedule('30 */6 * * *', async () => {
    logger.info('Cron: value-bet refresh started')
    try {
      const result = await predictionController.computeAndCacheValueBets()
      logger.info(result, 'Cron: value-bet refresh completed')
    } catch (error) {
      logger.error({ error }, 'Cron: value-bet refresh failed')
    }
  })
  setTimeout(() => {
    predictionController
      .computeAndCacheValueBets()
      .then((result) =>
        logger.info(result, 'Startup value-bet refresh completed')
      )
      .catch((error) =>
        logger.error({ error }, 'Startup value-bet refresh failed')
      )
  }, 60_000)

  // Every hour: close out stale live fixtures (a finished match vanishes
  // from the live feed, so something must flip it to FINISHED), THEN
  // generate post-match reports for everything newly finished. This is what
  // feeds the performance page and the post-match review pages.
  // Startup kick after 2 min.
  const settleFinishedMatches = async () => {
    const { finalizeStaleLiveFixtures } = await import('./live-update.service')
    await finalizeStaleLiveFixtures().catch((error) =>
      logger.error({ error }, 'finalize stale live fixtures failed')
    )
    await reportService.generatePending()
  }
  cron.schedule('15 * * * *', async () => {
    try {
      await settleFinishedMatches()
    } catch (error) {
      logger.error({ error }, 'Cron: post-match settle failed')
    }
  })
  setTimeout(() => {
    settleFinishedMatches().catch((error) =>
      logger.error({ error }, 'Startup post-match settle failed')
    )
  }, 120_000)

  logger.info('Cron jobs started')
}
