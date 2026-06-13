import cron from 'node-cron'
import { logger } from '../lib/logger'
import { fixtureService } from './fixture-service'
import { reportService } from './report.service'
import { predictionController } from '../controllers/prediction.controller'

export function startCronJobs() {
  // Every 6 hours: fixture sync (DB is the single source of truth for the
  // match lists, so it must always be populated). Also kicked at startup so
  // a fresh deploy fills the DB immediately.
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Cron: fixture sync started')
    try {
      await fixtureService.syncFromProviders()
      await fixtureService.syncActiveSeasons()
      logger.info('Cron: fixture sync completed')
    } catch (error) {
      logger.error({ error }, 'Cron: fixture sync failed')
    }
  })
  setTimeout(() => {
    fixtureService
      .syncFromProviders()
      .then(() => fixtureService.syncActiveSeasons())
      .then(() => undefined)
      .catch((error) => logger.error({ error }, 'Startup fixture sync failed'))
  }, 30_000)

  // Every 10 minutes: re-sync active organizations. This is also how
  // Football-Data-sourced fixtures transition SCHEDULED → LIVE → FINISHED
  // (the FD upsert refreshes status/score on existing rows).
  cron.schedule('*/10 * * * *', async () => {
    try {
      await fixtureService.syncActiveSeasons()
    } catch (error) {
      logger.error({ error }, 'Cron: active-season sync failed')
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

  // Every 30 minutes: pre-match analysis automation — make sure upcoming
  // matches in active competitions have a model prediction ready, so the
  // "Önce" report exists before kickoff without anyone clicking. Capped per
  // run to respect the AI provider quota. Startup kick after ~90s.
  cron.schedule('*/30 * * * *', async () => {
    try {
      await reportService.generateUpcomingPredictions()
    } catch (error) {
      logger.error({ error }, 'Cron: pre-match prediction sweep failed')
    }
  })
  setTimeout(() => {
    reportService
      .generateUpcomingPredictions()
      .catch((error) =>
        logger.error({ error }, 'Startup pre-match prediction sweep failed')
      )
  }, 90_000)

  // Every 5 minutes: in-play ("maç arası") automation — generate the live /
  // half-time read for matches underway and cache it for the report. Cheap
  // and self-skipping when the score hasn't changed.
  cron.schedule('*/5 * * * *', async () => {
    try {
      await reportService.generateInPlayAnalyses()
    } catch (error) {
      logger.error({ error }, 'Cron: in-play analysis sweep failed')
    }
  })

  logger.info('Cron jobs started')
}
