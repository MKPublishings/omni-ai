import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { StatCard } from '../components/StatCard'

test('StatCard renders a real svg sparkline when sparklineValues are provided', () => {
  const markup = renderToStaticMarkup(createElement(StatCard, {
    title: 'Runtime load',
    value: '42',
    sparklineValues: [10, 12, 9, 15, 18, 17, 22],
  }))

  assert.match(markup, /<svg/)
  assert.match(markup, /<path/)
  assert.doesNotMatch(markup, /Sparkline placeholder/)
})

test('StatCard omits the sparkline when no valid values are provided', () => {
  const markup = renderToStaticMarkup(createElement(StatCard, {
    title: 'Runtime load',
    value: '42',
    sparklineValues: [Number.NaN],
  }))

  assert.doesNotMatch(markup, /<svg/)
})