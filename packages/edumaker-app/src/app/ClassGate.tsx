import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ClassLoginErrorCode } from '../class/classSource'
import { messages } from '../messages'
import styles from './ClassGate.module.css'

export interface ClassGateProps {
  checking: boolean
  error?: ClassLoginErrorCode
  onEnter: (password: string) => void
  onSkip: () => void
}

// Asks for the class password when a class link comes without one (or with a wrong one).
export const ClassGate = ({ checking, error, onEnter, onSkip }: ClassGateProps) => {
  const [password, setPassword] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onEnter(password)
  }

  return (
    <div className={styles.backdrop}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="em-class-title"
        onSubmit={submit}
      >
        <h2 id="em-class-title" className={styles.title}>
          {messages.classGateTitle}
        </h2>
        <p>{messages.classGateBody}</p>
        <label className={styles.label}>
          {messages.classPassword}
          <input
            className={styles.input}
            type="password"
            autoComplete="off"
            ref={inputRef}
            value={password}
            disabled={checking}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <p className={styles.error} role="alert">
          {error && messages.classErrors[error]}
        </p>
        <div className={styles.buttons}>
          <button type="button" className={styles.skip} onClick={onSkip}>
            {messages.classSkip}
          </button>
          <button type="submit" className={styles.enter} disabled={checking}>
            {checking ? messages.classChecking : messages.classEnter}
          </button>
        </div>
      </form>
    </div>
  )
}
