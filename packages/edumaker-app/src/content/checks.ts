import type { Check, CheckTarget } from './format'

/** The parts of a project that mission checks look at. */
export interface ProjectSummary {
  targets: TargetSummary[]
}

export interface TargetSummary {
  name: string
  isStage: boolean
  /** Opcodes of every block in the target, including blocks not attached to any script. */
  opcodes: string[]
  /** For each script (a top-level block and everything attached to it): its first block and all opcodes in it. */
  scripts: { hat: string; opcodes: Set<string> }[]
}

/** A block as stored by the Scratch VM (`target.blocks._blocks`). */
export interface VmBlock {
  opcode: string
  next: string | null
  topLevel: boolean
  inputs: Record<string, { block: string | null }>
}

export interface VmTarget {
  isStage: boolean
  getName(): string
  blocks: { _blocks: Record<string, VmBlock> }
}

const collectScript = (blocks: Record<string, VmBlock>, topId: string): Set<string> => {
  const opcodes = new Set<string>()
  const pending = [topId]
  const visited = new Set<string>()
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    const block = blocks[id] as VmBlock | undefined
    if (!block || visited.has(id)) continue
    visited.add(id)
    opcodes.add(block.opcode)
    if (block.next) pending.push(block.next)
    for (const input of Object.values(block.inputs)) {
      if (input.block) pending.push(input.block)
    }
  }
  return opcodes
}

export const summarizeTargets = (targets: readonly VmTarget[]): ProjectSummary => ({
  targets: targets.map((target) => {
    const blocks = target.blocks._blocks
    return {
      name: target.getName(),
      isStage: target.isStage,
      opcodes: Object.values(blocks).map((block) => block.opcode),
      scripts: Object.entries(blocks)
        .filter(([, block]) => block.topLevel)
        .map(([id, block]) => ({ hat: block.opcode, opcodes: collectScript(blocks, id) })),
    }
  }),
})

const matchesTarget = (target: TargetSummary, wanted: CheckTarget): boolean => {
  if (wanted === 'any') return true
  if (wanted === 'stage') return target.isStage
  if (wanted === 'sprite') return !target.isStage
  return !target.isStage && target.name === wanted.sprite
}

export const passesCheck = (summary: ProjectSummary, check: Check): boolean => {
  switch (check.type) {
    case 'hasBlock': {
      const count = summary.targets
        .filter((target) => matchesTarget(target, check.target))
        .reduce((total, target) => total + target.opcodes.filter((opcode) => opcode === check.opcode).length, 0)
      return count >= check.minCount
    }
    case 'hasBlockInScript':
      return summary.targets
        .filter((target) => matchesTarget(target, check.target))
        .some((target) =>
          target.scripts.some((script) => script.hat === check.hat && script.opcodes.has(check.opcode)),
        )
    case 'hasSprites':
      return summary.targets.filter((target) => !target.isStage).length >= check.minCount
  }
}

/**
 * Checks a project against a step's checks, in order.
 * @param summary - The project, from `summarizeTargets`.
 * @param checks - The step's checks.
 * @returns The first check that fails, or undefined when every check passes (or there are none).
 */
export const findFailedCheck = (summary: ProjectSummary, checks: readonly Check[]): Check | undefined =>
  checks.find((check) => !passesCheck(summary, check))
