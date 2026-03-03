import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'services/match-service',
  'services/api-gateway',
  'services/stats-service',
  'services/user-service',
])
