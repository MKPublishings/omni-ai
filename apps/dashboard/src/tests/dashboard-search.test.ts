import assert from 'node:assert/strict'
import test from 'node:test'
import { recordDashboardRecentSearch, searchDashboardEntries } from '@/lib/dashboard-search'

test('searchDashboardEntries matches workspace routes by keywords and descriptions', () => {
  const assistantResults = searchDashboardEntries('assistant')
  const analyticsResults = searchDashboardEntries('telemetry trends')

  assert.equal(assistantResults[0]?.href, '/assistant')
  assert.equal(analyticsResults[0]?.href, '/analytics')
})

test('searchDashboardEntries ranks exact route labels above broader keyword matches', () => {
  const results = searchDashboardEntries('billing')

  assert.equal(results[0]?.href, '/billing/manage')
  assert.ok(results.some((entry) => entry.href === '/pricing'))
})

test('recordDashboardRecentSearch keeps recent queries unique and bounded', () => {
  const recent = recordDashboardRecentSearch('analytics', ['Events', 'analytics', 'Settings'], 3)

  assert.deepEqual(recent, ['analytics', 'Events', 'Settings'])
})