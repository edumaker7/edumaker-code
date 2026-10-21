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
  onCheck: () => boolean
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
  const [result, setResult] = useState<{ stepId: string; passed: boolean } | null>(null)
  const stepResult = result?.stepId === step.id ? result.passed : null
  const isLast = stepIndex === lesson.steps.length - 1

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
              <button
                type="button"
                className={styles.checkButton}
                onClick={() => setResult({ stepId: step.id, passed: onCheck() })}
              >
                {messages.check}
              </button>
            )}
            <p className={stepResult ? styles.passed : styles.failed} role="status" aria-live="polite">
              {stepResult === null ? '' : stepResult ? messages.checkPassed : messages.checkFailed}
            </p>
          </section>
        )}
      </div>

      <footer className={styles.footer}>
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
          disabled={isLast}
          onClick={() => onStepChange(stepIndex + 1)}
        >
          {messages.next}
        </button>
      </footer>
    </aside>
  )
}
