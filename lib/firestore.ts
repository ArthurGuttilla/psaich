import { db } from "./firebase"
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import type { User } from "firebase/auth"

export interface UserData {
  email: string
  country: string
  phoneNumber: string
  firstName: string
  lastName: string
  photoURL: string
  lastLogin: Date
  freeMessages: number
  lastFreeMessagesReset: Date
  streak?: number
  displayName?: string
  address?: string
  newsletter?: boolean
  psychologySchool?: string
}

export async function getUserData(userId: string): Promise<UserData | null> {
  const userDocRef = doc(db, "users", userId)
  try {
    const userDoc = await getDoc(userDocRef)
    if (userDoc.exists()) {
      const data = userDoc.data() as UserData
      return {
        ...data,
        lastLogin: data.lastLogin?.toDate() || new Date(),
        lastFreeMessagesReset: data.lastFreeMessagesReset?.toDate() || new Date(),
      }
    }
    return null
  } catch (error) {
    console.error("Error getting user data:", error)
    throw error
  }
}

export async function updateUserData(userId: string, data: Partial<UserData>) {
  const userDocRef = doc(db, "users", userId)
  try {
    await updateDoc(userDocRef, data)
  } catch (error) {
    console.error("Error updating user data:", error)
    throw error
  }
}

export async function saveUserData(user: User, additionalData: Partial<UserData>) {
  const userDocRef = doc(db, "users", user.uid)
  const userDoc = await getDoc(userDocRef)

  const now = new Date()
  let userData: Partial<UserData> = {
    email: user.email || "",
    photoURL: user.photoURL || "",
    lastLogin: now,
    country: additionalData.country || "",
  }

  if (userDoc.exists()) {
    const existingData = userDoc.data() as UserData
    userData = {
      ...existingData,
      ...additionalData,
      ...userData,
    }
  } else {
    userData = {
      ...userData,
      ...additionalData,
      phoneNumber: user.phoneNumber || additionalData.phoneNumber || "",
      firstName: additionalData.firstName || "",
      lastName: additionalData.lastName || "",
      freeMessages: 15,
      lastFreeMessagesReset: now,
    }
  }

  try {
    await setDoc(userDocRef, userData, { merge: true })
    return userData as UserData
  } catch (error) {
    console.error("Error saving user data:", error)
    throw error
  }
}

export async function updateLastLogin(userId: string) {
  try {
    await updateDoc(doc(db, "users", userId), {
      lastLogin: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating last login:", error)
    throw error
  }
}

export async function updateFreeMessages(userId: string, count: number) {
  const userDocRef = doc(db, "users", userId)
  try {
    await updateDoc(userDocRef, {
      freeMessages: count,
    })
  } catch (error) {
    console.error("Error updating free messages count:", error)
    throw error
  }
}

export async function getFreeMessagesCount(userId: string): Promise<number> {
  const userDocRef = doc(db, "users", userId)
  try {
    const userDoc = await getDoc(userDocRef)
    const userData = userDoc.data() as UserData

    const now = new Date()
    const lastReset = userData.lastFreeMessagesReset?.toDate() || now

    if (shouldResetFreeMessages(lastReset)) {
      await resetFreeMessages(userId)
      return 15
    }

    return userData.freeMessages
  } catch (error) {
    console.error("Error getting free messages count:", error)
    throw error
  }
}

function shouldResetFreeMessages(lastReset: Date): boolean {
  const now = new Date()
  return now.getFullYear() !== lastReset.getFullYear() || now.getMonth() !== lastReset.getMonth()
}

async function resetFreeMessages(userId: string) {
  const userDocRef = doc(db, "users", userId)
  try {
    await updateDoc(userDocRef, {
      freeMessages: 15,
      lastFreeMessagesReset: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error resetting free messages:", error)
    throw error
  }
}

export interface ChatMessage {
  aiResponse: string
  timestamp: Date
  userMessage: string
}

export async function saveChatMessage(userId: string, message: ChatMessage) {
  try {
    await addDoc(collection(db, "users", userId, "chat"), {
      ...message,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error saving chat message:", error)
    throw error
  }
}

export async function updateStreak(userId: string) {
  const userDocRef = doc(db, "users", userId)
  const now = new Date()

  try {
    const userDoc = await getDoc(userDocRef)
    const userData = userDoc.data() as UserData

    if (!userData.lastLogin) {
      await updateDoc(userDocRef, {
        streak: 1,
        lastLogin: now,
      })
      return 1
    }

    const lastLogin = userData.lastLogin.toDate()
    const daysSinceLastLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 3600 * 24))

    if (daysSinceLastLogin === 0) {
      return userData.streak || 0
    } else if (daysSinceLastLogin === 1) {
      const newStreak = (userData.streak || 0) + 1
      await updateDoc(userDocRef, {
        streak: newStreak,
        lastLogin: now,
      })
      return newStreak
    } else {
      await updateDoc(userDocRef, {
        streak: 1,
        lastLogin: now,
      })
      return 1
    }
  } catch (error) {
    console.error("Error updating streak:", error)
    throw error
  }
}

export async function getStreak(userId: string): Promise<number> {
  const userDocRef = doc(db, "users", userId)
  try {
    const userDoc = await getDoc(userDocRef)
    const userData = userDoc.data() as UserData
    return userData.streak || 0
  } catch (error) {
    console.error("Error getting streak:", error)
    throw error
  }
}

// ─── Mood Tracking ────────────────────────────────────────────────────────────

export type MoodLevel = 1 | 2 | 3 | 4 | 5

export interface MoodEntry {
  id?: string
  mood: MoodLevel
  note?: string
  timestamp: Date
}

export async function saveMoodEntry(userId: string, mood: MoodLevel, note?: string): Promise<void> {
  try {
    await addDoc(collection(db, "users", userId, "moods"), {
      mood,
      note: note || "",
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error saving mood entry:", error)
    throw error
  }
}

export async function getRecentMoods(userId: string, days = 7): Promise<MoodEntry[]> {
  try {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const moodsRef = collection(db, "users", userId, "moods")
    const q = query(
      moodsRef,
      where("timestamp", ">=", Timestamp.fromDate(since)),
      orderBy("timestamp", "desc"),
      limit(30),
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        mood: data.mood as MoodLevel,
        note: data.note,
        timestamp: data.timestamp?.toDate() || new Date(),
      }
    })
  } catch (error) {
    console.error("Error fetching recent moods:", error)
    return []
  }
}

export async function getTodayMood(userId: string): Promise<MoodEntry | null> {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const moodsRef = collection(db, "users", userId, "moods")
    const q = query(
      moodsRef,
      where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
      orderBy("timestamp", "desc"),
      limit(1),
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const d = snapshot.docs[0]
    const data = d.data()
    return {
      id: d.id,
      mood: data.mood as MoodLevel,
      note: data.note,
      timestamp: data.timestamp?.toDate() || new Date(),
    }
  } catch (error) {
    console.error("Error fetching today's mood:", error)
    return null
  }
}
