/** A class link: `#class/{classId}` with an optional `?pw=` class password, as the hub's class links use. */
export interface ClassRoute {
  classId: string
  password: string
}

const CLASS_ID = /^[A-Za-z0-9_-]{1,64}$/

const passwordKey = (classId: string) => `em:linkpw:class:${classId}`

/**
 * Reads a class link from the address. A password from the link is kept in this tab's session storage and removed
 * from the address bar, like the hub's other apps do.
 * @param location - The page location.
 * @param history - Used to remove the password from the address.
 * @param storage - This tab's session storage.
 * @returns The class link, or null when the address has none.
 */
export const parseClassRoute = (location: Location, history: History, storage: Storage): ClassRoute | null => {
  const match = /^#class\/([^?]*)(?:\?pw=(.*))?$/.exec(location.hash)
  if (!match || !CLASS_ID.test(match[1])) return null
  const classId = match[1]
  const linkPassword = match[2] as string | undefined
  try {
    if (linkPassword !== undefined) {
      const password = decodeURIComponent(linkPassword)
      storage.setItem(passwordKey(classId), password)
      history.replaceState(null, '', `${location.pathname}${location.search}#class/${classId}`)
      return { classId, password }
    }
    return { classId, password: storage.getItem(passwordKey(classId)) ?? '' }
  } catch {
    return { classId, password: linkPassword === undefined ? '' : decodeURIComponent(linkPassword) }
  }
}

/**
 * Remembers a password the student typed, so that reloading the page keeps them in the class.
 * @param storage - This tab's session storage.
 * @param route - The class and its password.
 */
export const rememberClassPassword = (storage: Storage, route: ClassRoute): void => {
  try {
    storage.setItem(passwordKey(route.classId), route.password)
  } catch {
    // Without storage the student types the password again after a reload.
  }
}
