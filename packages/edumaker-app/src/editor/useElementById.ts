import { useEffect, useState } from 'react'

/**
 * Tracks an element that someone else (the editor) adds to and removes from `root`.
 * @param root - The element to watch.
 * @param id - The id of the element to find inside `root`.
 * @returns The element while it is inside `root`, otherwise null.
 */
export const useElementById = (root: HTMLElement | null, id: string): HTMLElement | null => {
  const [element, setElement] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!root) return
    const update = () => {
      const found = root.ownerDocument.getElementById(id)
      setElement(found && root.contains(found) ? found : null)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [root, id])
  return element
}
