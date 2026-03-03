import cron from 'node-cron'
import { logger } from '../lib/logger'
import { fixtureService } from './fixture-service'

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

  logger.info('Cron jobs started')
}
