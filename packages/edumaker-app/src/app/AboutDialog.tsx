import { useEffect, useRef } from 'react'
import { messages } from '../messages'
import styles from './AboutDialog.module.css'

export const SOURCE_CODE_URL = import.meta.env.VITE_SOURCE_CODE_URL ?? 'https://github.com/edumaker7/edumaker-code'

export interface AboutDialogProps {
  onClose: () => void
}

export const AboutDialog = ({ onClose }: AboutDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    // jsdom has no showModal.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }, [])

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="em-about-title" onClose={onClose}>
      <h2 id="em-about-title" className={styles.title}>
        {messages.aboutTitle}
      </h2>
      <p>{messages.aboutBasedOn}</p>
      <p>
        <a href={SOURCE_CODE_URL} target="_blank" rel="noreferrer">
          {messages.aboutSourceCode}
        </a>
      </p>
      <p>{messages.aboutLibrary}</p>
      <p className={styles.small}>{messages.aboutTrademark}</p>
      <button type="button" className={styles.close} onClick={onClose}>
        {messages.close}
      </button>
    </dialog>
  )
}
