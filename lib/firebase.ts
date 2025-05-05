import { getApps, initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, OAuthProvider, type User, updateProfile } from "firebase/auth"
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyC53QFFcNZzs3xQyehL0pzmgW4dnMK_ATc",
  authDomain: "psaich-com.firebaseapp.com",
  projectId: "psaich-com",
  storageBucket: "psaich-com.firebasestorage.app",
  messagingSenderId: "614055865225",
  appId: "1:614055865225:web:17a232662e97e30bba8f58",
  measurementId: "G-79QP588KDE",
}

let app
let auth
let googleProvider
let microsoftProvider
let db
let storage

if (typeof window !== "undefined" && !getApps().length) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  googleProvider = new GoogleAuthProvider()
  // NOTE: Make sure to enable Microsoft authentication in the Firebase console
  // Go to Authentication > Sign-in method > Add new provider > Microsoft
  microsoftProvider = new OAuthProvider("microsoft.com")
  db = getFirestore(app)
  storage = getStorage(app)
}

export { auth, googleProvider, microsoftProvider, db, storage }

// Dynamically import analytics only on the client side
export const initializeAnalytics = async () => {
  if (typeof window !== "undefined") {
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
  try {
    // Update Firebase Auth profile
    await updateProfile(user, {
      displayName: data.displayName,
      photoURL: data.photoURL,
    })

    // Update Firestore document
    const userDocRef = doc(db, "users", user.uid)
    await setDoc(userDocRef, data, { merge: true })
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

export async function getUserProfile(userId: string): Promise<UserData | null> {
  try {
    const userDocRef = doc(db, "users", userId)
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
  const storageRef = ref(storage, `profile_images/${userId}`)
  await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(storageRef)
  return downloadURL
}
