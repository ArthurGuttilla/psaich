import { getApps, initializeApp, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, OAuthProvider, type User, type Auth, updateProfile } from "firebase/auth"
import { getFirestore, doc, setDoc, getDoc, type Firestore } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL, type FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp | undefined
let auth: Auth | undefined
let googleProvider: GoogleAuthProvider | undefined
let microsoftProvider: OAuthProvider | undefined
let db: Firestore | undefined
let storage: FirebaseStorage | undefined

if (typeof window !== "undefined" && !getApps().length) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  googleProvider = new GoogleAuthProvider()
  microsoftProvider = new OAuthProvider("microsoft.com")
  db = getFirestore(app)
  storage = getStorage(app)
}

function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error("Firebase Auth is not initialized. Make sure you are on the client side.")
  }
  return auth
}

function getDbInstance(): Firestore {
  if (!db) {
    throw new Error("Firebase Firestore is not initialized. Make sure you are on the client side.")
  }
  return db
}

function getStorageInstance(): FirebaseStorage {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized. Make sure you are on the client side.")
  }
  return storage
}

export { auth, googleProvider, microsoftProvider, db, storage, getAuthInstance, getDbInstance, getStorageInstance }

// Dynamically import analytics only on the client side
export const initializeAnalytics = async () => {
  if (typeof window !== "undefined" && app) {
    try {
      const { getAnalytics } = await import("firebase/analytics")
      return getAnalytics(app)
    } catch (error) {
      console.error("Error initializing analytics:", error)
      return null
    }
  }
  return null
}

interface UserData {
  displayName?: string
  photoURL?: string
  email?: string
  phoneNumber?: string
  address?: string
  country?: string
  newsletter?: boolean
  psychologySchool?: string
}

export async function updateUserProfile(user: User, data: Partial<UserData>) {
  const firestore = getDbInstance()
  try {
    await updateProfile(user, {
      displayName: data.displayName,
      photoURL: data.photoURL,
    })

    const userDocRef = doc(firestore, "users", user.uid)
    await setDoc(userDocRef, data, { merge: true })
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

export async function getUserProfile(userId: string): Promise<UserData | null> {
  const firestore = getDbInstance()
  try {
    const userDocRef = doc(firestore, "users", userId)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists()) {
      return userDoc.data() as UserData
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting user profile:", error)
    throw error
  }
}

export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const storageInstance = getStorageInstance()
  const storageRef = ref(storageInstance, `profile_images/${userId}`)
  await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(storageRef)
  return downloadURL
}
