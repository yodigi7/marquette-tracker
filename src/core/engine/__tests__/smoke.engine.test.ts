// @vitest-environment node
import { describe, expect, it } from 'vitest'

describe('smoke', () => {
  it('runs in node environment', () => {
    expect(typeof window).toBe('undefined')
    expect(1 + 1).toBe(2)
  })
})