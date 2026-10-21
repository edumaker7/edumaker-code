import { useState } from 'react'
import type { PanelSide } from '../content/format'
import { resolveLessonUrl, type LoadedLesson } from '../content/loader'
import { messages } from '../messages'
import styles from './StoryPanel.module.css'

export interface StoryPanelProps {
  loaded: LoadedLesson
  stepIndex: number
  side: PanelSide
  onStepChange: (stepIndex: number) => void
  onSideChange: (side: PanelSide) => void
  onClose: () => void
  /** Checks the current step's mission against the project. */
  onCheck: () => CheckOutcome
}

export interface CheckOutcome {
  passed: boolean
  /** What to fix, from the first failed check. */
  feedback?: string
}

export const StoryPanel = ({
  loaded,
  stepIndex,
  side,
  onStepChange,
  onSideChange,
  onClose,
  onCheck,
}: StoryPanelProps) => {
  const { lesson } = loaded
  const step = lesson.steps[stepIndex]
  const [result, setResult] = useState<(CheckOutcome & { stepId: string }) | null>(null)
  const [passedSteps, setPassedSteps] = useState<ReadonlySet<string>>(new Set())
  const stepResult = result?.stepId === step.id ? result : null
  const isLast = stepIndex === lesson.steps.length - 1
  const locked = step.checks.length > 0 && !passedSteps.has(step.id)

  const check = () => {
    const outcome = onCheck()
    setResult({ ...outcome, stepId: step.id })
    if (outcome.passed) setPassedSteps(new Set(passedSteps).add(step.id))
  }

  return (
    <aside className={styles.panel} data-side={side} aria-label={messages.storyLabel}>
      <header className={styles.header}>
        <div className={styles.titles}>
          <h1 className={styles.title}>{lesson.title}</h1>
          {lesson.subtitle && <p className={styles.subtitle}>{lesson.subtitle}</p>}
        </div>
        <div className={styles.headerButtons}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => onSideChange(side === 'left' ? 'right' : 'left')}
          >
            {side === 'left' ? messages.moveRight : messages.moveLeft}
          </button>
          <button type="button" className={styles.iconButton} onClick={onClose}>
            {messages.closeLesson}
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <p className={styles.progress}>{messages.step(stepIndex + 1, lesson.steps.length)}</p>
        <h2 className={styles.stepTitle}>{step.title}</h2>
        {step.body.map((paragraph, index) => (
          <p key={index} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
        {step.image && <img className={styles.image} src={resolveLessonUrl(loaded, step.image)} alt="" />}

        {step.mission && (
          <section className={styles.mission}>
            <h3 className={styles.missionTitle}>{messages.mission}</h3>
            <p className={styles.paragraph}>{step.mission}</p>
            {step.hint && (
              <details className={styles.hint}>
                <summary>{messages.hint}</summary>
                <p className={styles.paragraph}>{step.hint}</p>
              </details>
            )}
            {step.checks.length > 0 && (
              <button type="button" className={styles.checkButton} onClick={check}>
                {messages.check}
              </button>
            )}
            <p className={stepResult?.passed ? styles.passed : styles.failed} role="status" aria-live="polite">
              {stepResult &&
                (stepResult.passed ? messages.checkPassed : (stepResult.feedback ?? messages.checkFailed))}
            </p>
          </section>
        )}
      </div>

      <footer className={styles.footer}>
        {locked && !isLast && <p className={styles.lockedNote}>{messages.nextLocked}</p>}
        <button
          type="button"
          className={styles.navButton}
          disabled={stepIndex === 0}
          onClick={() => onStepChange(stepIndex - 1)}
        >
          {messages.previous}
        </button>
        <button
          type="button"
          className={styles.navButton}
          disabled={isLast || locked}
          onClick={() => onStepChange(stepIndex + 1)}
        >
          {messages.next}
        </button>
      </footer>
    </aside>
  )
}
