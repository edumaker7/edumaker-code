import { initializeApp } from 'firebase/app'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getDownloadURL, getStorage, ref } from 'firebase/storage'
import { ClassLoginError, type ClassBackend, type ClassInfo, type ClassLoginErrorCode } from './classSource'

// The EduMaker Firebase project shared with the hub and its other apps. A web config is public by design;
// Firestore and Storage rules decide what a class pass can read.
const firebaseConfig = {
  apiKey: 'AIzaSyBuGdI9nTVsOr8L3BJCHX8rDy025DIWPJE',
  authDomain: 'edumaker-gallery.firebaseapp.com',
  projectId: 'edumaker-gallery',
  storageBucket: 'edumaker-gallery.firebasestorage.app',
  messagingSenderId: '298316254113',
  appId: '1:298316254113:web:b6f25af82fd313c942d9e0',
}

const CLIENT_ID_KEY = 'em:clientId'

/**
 * A random id per device, so that the same device gets the same class pass again (as in the hub's apps).
 * @returns The id, kept in local storage.
 */
const clientId = (): string => {
  try {
    const stored = localStorage.getItem(CLIENT_ID_KEY)
    if (stored && /^[A-Za-z0-9_-]{8,64}$/.test(stored)) return stored
    const created = Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    localStorage.setItem(CLIENT_ID_KEY, created)
    return created
  } catch {
    return `nostore${Math.random().toString(36).slice(2, 12)}`
  }
}

const loginErrorCode = (error: unknown): ClassLoginErrorCode => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (code.includes('resource-exhausted')) return 'throttled'
  if (code.includes('not-found')) return 'not-found'
  if (code.includes('failed-precondition')) return 'no-password'
  if (code.includes('permission-denied')) return 'wrong-password'
  return 'unknown'
}

interface ClassLoginResult {
  token: string
  cls: ClassInfo
}

export const createFirebaseBackend = (): ClassBackend => {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const storage = getStorage(app)
  const classLogin = httpsCallable<object, ClassLoginResult>(getFunctions(app, 'us-central1'), 'classLogin')
  return {
    login: async (classId, password) => {
      try {
        const result = await classLogin({ classId, password, role: 'student', clientId: clientId() })
        await signInWithCustomToken(auth, result.data.token)
        return result.data.cls
      } catch (error) {
        throw new ClassLoginError(loginErrorCode(error), error instanceof Error ? error.message : undefined)
      }
    },
    getLessonDocument: async (lessonId) => {
      const snapshot = await getDoc(doc(db, 'blocksLessons', lessonId))
      return snapshot.exists() ? snapshot.data() : null
    },
    getAssetUrl: (lessonId, path) => getDownloadURL(ref(storage, `blocks/lessons/${lessonId}/${path}`)),
  }
}
