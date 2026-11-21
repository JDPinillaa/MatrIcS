import { describe, expect, it } from 'vitest'
import { BARRIER_PRESENTATION, BADGE_ICON, getBarrierPresentation, isBarrierState } from './barrier-state'

describe('barrier state presentation', () => {
  it('maps ABIERTA to the green tone with a raised arm', () => {
    const presentation = getBarrierPresentation('ABIERTA')

    expect(presentation.tone).toBe('open')
    expect(presentation.label).toBe('Abierta')
    expect(presentation.armAngle).toBeLessThan(0)
  })

  it('maps CERRADA to the red tone with a blocking arm', () => {
    const presentation = getBarrierPresentation('CERRADA')

    expect(presentation.tone).toBe('closed')
    expect(presentation.label).toBe('Cerrada')
    expect(presentation.armAngle).toBe(0)
  })

  it('maps LLENO to the alert tone with a blocking arm', () => {
    const presentation = getBarrierPresentation('LLENO')

    expect(presentation.tone).toBe('full')
    expect(presentation.label).toBe('Lleno')
    expect(presentation.armAngle).toBe(0)
  })

  it('gives every state a distinct tone so they never look the same', () => {
    const tones = Object.values(BARRIER_PRESENTATION).map((presentation) => presentation.tone)

    expect(new Set(tones).size).toBe(tones.length)
  })

  it('pairs every state with an icon and a non-empty explanation', () => {
    for (const state of Object.keys(BARRIER_PRESENTATION) as Array<keyof typeof BARRIER_PRESENTATION>) {
      expect(BADGE_ICON[state]).toBeTruthy()
      expect(BARRIER_PRESENTATION[state].defaultReason.length).toBeGreaterThan(10)
    }
  })

  it('rejects values that are not barrier states', () => {
    expect(isBarrierState('ABIERTA')).toBe(true)
    expect(isBarrierState('abierta')).toBe(false)
    expect(isBarrierState('OCUPADO')).toBe(false)
    expect(isBarrierState(null)).toBe(false)
    expect(isBarrierState(undefined)).toBe(false)
  })
})
