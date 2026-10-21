import { describe, expect, it } from 'vitest'
import { findFailedCheck, passesCheck, summarizeTargets, type VmBlock, type VmTarget } from '../src/content/checks'

const block = (opcode: string, extra: Partial<VmBlock> = {}): VmBlock => ({
  opcode,
  next: null,
  topLevel: false,
  inputs: {},
  ...extra,
})

const target = (name: string, isStage: boolean, blocks: Record<string, VmBlock>): VmTarget => ({
  isStage,
  getName: () => name,
  blocks: { _blocks: blocks },
})

// EduBot: when flag clicked → say (with a reporter in its input); a loose move block.
// Stage: when flag clicked → switch backdrop.
const targets = [
  target('Stage', true, {
    s1: block('event_whenflagclicked', { topLevel: true, next: 's2' }),
    s2: block('looks_switchbackdropto'),
  }),
  target('EduBot', false, {
    a: block('event_whenflagclicked', { topLevel: true, next: 'b' }),
    b: block('looks_sayforsecs', { inputs: { MESSAGE: { block: 'c' } } }),
    c: block('operator_join'),
    d: block('motion_movesteps', { topLevel: true }),
  }),
  target('Friend', false, {}),
]

describe('mission checks', () => {
  const summary = summarizeTargets(targets)

  it('summarizes scripts, including blocks in inputs', () => {
    expect(summary.targets[1].scripts).toEqual([
      {
        hat: 'event_whenflagclicked',
        opcodes: new Set(['event_whenflagclicked', 'looks_sayforsecs', 'operator_join']),
      },
      { hat: 'motion_movesteps', opcodes: new Set(['motion_movesteps']) },
    ])
  })

  it('counts blocks in the wanted targets', () => {
    expect(
      passesCheck(summary, { type: 'hasBlock', opcode: 'event_whenflagclicked', minCount: 2, target: 'any' }),
    ).toBe(true)
    expect(
      passesCheck(summary, { type: 'hasBlock', opcode: 'event_whenflagclicked', minCount: 2, target: 'sprite' }),
    ).toBe(false)
    expect(
      passesCheck(summary, { type: 'hasBlock', opcode: 'looks_switchbackdropto', minCount: 1, target: 'stage' }),
    ).toBe(true)
    expect(
      passesCheck(summary, {
        type: 'hasBlock',
        opcode: 'motion_movesteps',
        minCount: 1,
        target: { sprite: 'Friend' },
      }),
    ).toBe(false)
  })

  it('looks for a block inside a script with the given hat', () => {
    const check = { type: 'hasBlockInScript', hat: 'event_whenflagclicked', target: 'any' } as const
    expect(passesCheck(summary, { ...check, opcode: 'operator_join' })).toBe(true)
    // The move block is loose, not under the hat.
    expect(passesCheck(summary, { ...check, opcode: 'motion_movesteps' })).toBe(false)
    expect(passesCheck(summary, { ...check, opcode: 'looks_sayforsecs', target: 'stage' })).toBe(false)
  })

  it('counts sprites, not the stage', () => {
    expect(passesCheck(summary, { type: 'hasSprites', minCount: 2 })).toBe(true)
    expect(passesCheck(summary, { type: 'hasSprites', minCount: 3 })).toBe(false)
  })

  it('finds the first failed check', () => {
    expect(findFailedCheck(summary, [])).toBeUndefined()
    const tooMany = { type: 'hasSprites', minCount: 3, feedback: '친구를 더 만들어요' } as const
    expect(
      findFailedCheck(summary, [{ type: 'hasSprites', minCount: 2 }, tooMany, { type: 'hasSprites', minCount: 4 }]),
    ).toBe(tooMany)
  })

  it('does not loop on malformed block links', () => {
    const looped = summarizeTargets([
      target('Loop', false, { a: block('control_forever', { topLevel: true, next: 'a' }) }),
    ])
    expect(looped.targets[0].scripts[0].opcodes).toEqual(new Set(['control_forever']))
  })
})
