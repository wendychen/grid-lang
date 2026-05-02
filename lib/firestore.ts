"use client"

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  where,
} from "firebase/firestore"
import { getFirebaseDb, getCurrentUser, isFirebaseConfigured } from "./firebase"
import { db as dexieDb, type SentenceProgressEntity, type SettingsEntity, type StreakEntity, type DailyActivityEntity, type GraphEdgeEntity, type CustomSentenceEntity, type NotebookEntryEntity } from "./db"

// ===== Helper Functions =====

function getUserId(): string | null {
  const user = getCurrentUser()
  return user?.uid || null
}

function getUserCollection(collectionName: string): string {
  const userId = getUserId()
  if (!userId) throw new Error("User not authenticated")
  return `users/${userId}/${collectionName}`
}

// ===== Check if using Firestore =====

export function isUsingFirestore(): boolean {
  return isFirebaseConfigured() && getUserId() !== null
}

// ===== Progress Operations =====

export async function getAllProgressFirestore(): Promise<Record<string, SentenceProgressEntity>> {
  if (!isUsingFirestore()) return {}
  
  const db = getFirebaseDb()
  if (!db) return {}

  try {
    const colRef = collection(db, getUserCollection("progress"))
    const snapshot = await getDocs(colRef)
    const result: Record<string, SentenceProgressEntity> = {}
    snapshot.forEach((doc) => {
      result[doc.id] = doc.data() as SentenceProgressEntity
    })
    return result
  } catch (error) {
    console.error("[GridLang] Error fetching progress:", error)
    return {}
  }
}

export async function getProgressFirestore(id: string): Promise<SentenceProgressEntity | null> {
  if (!isUsingFirestore()) return null
  
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const docRef = doc(db, getUserCollection("progress"), id)
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? (snapshot.data() as SentenceProgressEntity) : null
  } catch (error) {
    console.error("[GridLang] Error fetching progress:", error)
    return null
  }
}

export async function saveProgressFirestore(progress: SentenceProgressEntity): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("progress"), progress.id)
    await setDoc(docRef, progress)
  } catch (error) {
    console.error("[GridLang] Error saving progress:", error)
  }
}

// ===== Settings Operations =====

export async function getSettingsFirestore(): Promise<SettingsEntity | null> {
  if (!isUsingFirestore()) return null
  
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const docRef = doc(db, getUserCollection("settings"), "settings")
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? (snapshot.data() as SettingsEntity) : null
  } catch (error) {
    console.error("[GridLang] Error fetching settings:", error)
    return null
  }
}

export async function saveSettingsFirestore(settings: SettingsEntity): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("settings"), "settings")
    await setDoc(docRef, settings)
  } catch (error) {
    console.error("[GridLang] Error saving settings:", error)
  }
}

// ===== Streak Operations =====

export async function getStreakFirestore(): Promise<StreakEntity | null> {
  if (!isUsingFirestore()) return null
  
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const docRef = doc(db, getUserCollection("streak"), "streak")
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? (snapshot.data() as StreakEntity) : null
  } catch (error) {
    console.error("[GridLang] Error fetching streak:", error)
    return null
  }
}

export async function saveStreakFirestore(streak: StreakEntity): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("streak"), "streak")
    await setDoc(docRef, streak)
  } catch (error) {
    console.error("[GridLang] Error saving streak:", error)
  }
}

// ===== Activity Operations =====

export async function getAllActivityFirestore(): Promise<Record<string, DailyActivityEntity>> {
  if (!isUsingFirestore()) return {}
  
  const db = getFirebaseDb()
  if (!db) return {}

  try {
    const colRef = collection(db, getUserCollection("activity"))
    const snapshot = await getDocs(colRef)
    const result: Record<string, DailyActivityEntity> = {}
    snapshot.forEach((doc) => {
      result[doc.id] = doc.data() as DailyActivityEntity
    })
    return result
  } catch (error) {
    console.error("[GridLang] Error fetching activity:", error)
    return {}
  }
}

export async function saveActivityFirestore(activity: DailyActivityEntity): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("activity"), activity.date)
    await setDoc(docRef, activity)
  } catch (error) {
    console.error("[GridLang] Error saving activity:", error)
  }
}

// ===== Pushed Queue Operations =====

export async function getPushedQueueFirestore(): Promise<string[]> {
  if (!isUsingFirestore()) return []
  
  const db = getFirebaseDb()
  if (!db) return []

  try {
    const docRef = doc(db, getUserCollection("pushed"), "pushed")
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? (snapshot.data().sentenceIds || []) : []
  } catch (error) {
    console.error("[GridLang] Error fetching pushed queue:", error)
    return []
  }
}

export async function savePushedQueueFirestore(sentenceIds: string[]): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("pushed"), "pushed")
    await setDoc(docRef, { id: "pushed", sentenceIds })
  } catch (error) {
    console.error("[GridLang] Error saving pushed queue:", error)
  }
}

// ===== Graph Edge Operations =====

export async function getAllEdgesFirestore(): Promise<GraphEdgeEntity[]> {
  if (!isUsingFirestore()) return []
  
  const db = getFirebaseDb()
  if (!db) return []

  try {
    const colRef = collection(db, getUserCollection("edges"))
    const snapshot = await getDocs(colRef)
    const result: GraphEdgeEntity[] = []
    snapshot.forEach((doc) => {
      result.push(doc.data() as GraphEdgeEntity)
    })
    return result
  } catch (error) {
    console.error("[GridLang] Error fetching edges:", error)
    return []
  }
}

export async function saveEdgeFirestore(edge: GraphEdgeEntity): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("edges"), edge.id)
    await setDoc(docRef, edge)
  } catch (error) {
    console.error("[GridLang] Error saving edge:", error)
  }
}

export async function deleteEdgeFirestore(id: string): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("edges"), id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("[GridLang] Error deleting edge:", error)
  }
}

// ===== Custom Sentence Operations =====

export async function getAllCustomSentencesFirestore(): Promise<CustomSentenceEntity[]> {
  if (!isUsingFirestore()) return []
  
  const db = getFirebaseDb()
  if (!db) return []

  try {
    const colRef = collection(db, getUserCollection("customSentences"))
    const snapshot = await getDocs(colRef)
    const result: CustomSentenceEntity[] = []
    snapshot.forEach((doc) => {
      result.push(doc.data() as CustomSentenceEntity)
    })
    return result
  } catch (error) {
    console.error("[GridLang] Error fetching custom sentences:", error)
    return []
  }
}

export async function saveCustomSentenceFirestore(sentence: CustomSentenceEntity): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("customSentences"), sentence.id)
    await setDoc(docRef, sentence)
  } catch (error) {
    console.error("[GridLang] Error saving custom sentence:", error)
  }
}

export async function deleteCustomSentenceFirestore(id: string): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("customSentences"), id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("[GridLang] Error deleting custom sentence:", error)
  }
}

// ===== Notebook Operations =====

export async function getAllNotebookEntriesFirestore(): Promise<Record<string, NotebookEntryEntity>> {
  if (!isUsingFirestore()) return {}
  
  const db = getFirebaseDb()
  if (!db) return {}

  try {
    const colRef = collection(db, getUserCollection("notebook"))
    const snapshot = await getDocs(colRef)
    const result: Record<string, NotebookEntryEntity> = {}
    snapshot.forEach((doc) => {
      result[doc.id] = doc.data() as NotebookEntryEntity
    })
    return result
  } catch (error) {
    console.error("[GridLang] Error fetching notebook:", error)
    return {}
  }
}

export async function saveNotebookEntryFirestore(entry: NotebookEntryEntity): Promise<void> {
  if (!isUsingFirestore()) return
  
  const db = getFirebaseDb()
  if (!db) return

  try {
    const docRef = doc(db, getUserCollection("notebook"), entry.date)
    await setDoc(docRef, entry)
  } catch (error) {
    console.error("[GridLang] Error saving notebook entry:", error)
  }
}

// ===== Migration from Dexie to Firestore =====

export async function migrateFromDexieToFirestore(): Promise<void> {
  if (!isUsingFirestore()) return

  const db = getFirebaseDb()
  if (!db) return

  const userId = getUserId()
  if (!userId) return

  // Check if already migrated for this user
  const migratedKey = `gridlang_firestore_migrated_${userId}`
  if (localStorage.getItem(migratedKey) === "true") return

  try {
    // Get all Dexie data
    const [progress, settings, streak, activity, pushed, edges, customSentences, notebook] =
      await Promise.all([
        dexieDb.progress.toArray(),
        dexieDb.settings.get("settings"),
        dexieDb.streak.get("streak"),
        dexieDb.activity.toArray(),
        dexieDb.pushedQueue.get("pushed"),
        dexieDb.edges.toArray(),
        dexieDb.customSentences.toArray(),
        dexieDb.notebook.toArray(),
      ])

    // Batch write to Firestore
    const batch = writeBatch(db)

    // Migrate progress
    for (const p of progress) {
      const docRef = doc(db, getUserCollection("progress"), p.id)
      batch.set(docRef, p)
    }

    // Migrate settings
    if (settings) {
      const docRef = doc(db, getUserCollection("settings"), "settings")
      batch.set(docRef, settings)
    }

    // Migrate streak
    if (streak) {
      const docRef = doc(db, getUserCollection("streak"), "streak")
      batch.set(docRef, streak)
    }

    // Migrate activity
    for (const a of activity) {
      const docRef = doc(db, getUserCollection("activity"), a.date)
      batch.set(docRef, a)
    }

    // Migrate pushed queue
    if (pushed) {
      const docRef = doc(db, getUserCollection("pushed"), "pushed")
      batch.set(docRef, pushed)
    }

    // Migrate edges
    for (const e of edges) {
      const docRef = doc(db, getUserCollection("edges"), e.id)
      batch.set(docRef, e)
    }

    // Migrate custom sentences
    for (const c of customSentences) {
      const docRef = doc(db, getUserCollection("customSentences"), c.id)
      batch.set(docRef, c)
    }

    // Migrate notebook
    for (const n of notebook) {
      const docRef = doc(db, getUserCollection("notebook"), n.date)
      batch.set(docRef, n)
    }

    await batch.commit()

    // Mark as migrated
    localStorage.setItem(migratedKey, "true")
    console.log("[GridLang] Successfully migrated Dexie data to Firestore")
  } catch (error) {
    console.error("[GridLang] Migration to Firestore failed:", error)
  }
}

// ===== Reset User Data =====

export async function resetUserDataFirestore(): Promise<void> {
  if (!isUsingFirestore()) return

  const db = getFirebaseDb()
  if (!db) return

  try {
    // Delete all collections for user
    const collections = ["progress", "activity", "edges", "customSentences", "notebook"]
    
    for (const collectionName of collections) {
      const colRef = collection(db, getUserCollection(collectionName))
      const snapshot = await getDocs(colRef)
      const batch = writeBatch(db)
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()
    }

    // Delete single docs
    const pushedRef = doc(db, getUserCollection("pushed"), "pushed")
    await deleteDoc(pushedRef)

    const streakRef = doc(db, getUserCollection("streak"), "streak")
    await deleteDoc(streakRef)

    console.log("[GridLang] User data reset in Firestore")
  } catch (error) {
    console.error("[GridLang] Error resetting user data:", error)
  }
}

// ===== Load All Data =====

export interface AllFirestoreData {
  progress: Record<string, SentenceProgressEntity>
  settings: SettingsEntity | null
  streak: StreakEntity | null
  activity: Record<string, DailyActivityEntity>
  pushed: string[]
  edges: GraphEdgeEntity[]
  customSentences: CustomSentenceEntity[]
  notebook: Record<string, NotebookEntryEntity>
}

export async function loadAllDataFromFirestore(): Promise<AllFirestoreData | null> {
  if (!isUsingFirestore()) return null

  try {
    const [progress, settings, streak, activity, pushed, edges, customSentences, notebook] =
      await Promise.all([
        getAllProgressFirestore(),
        getSettingsFirestore(),
        getStreakFirestore(),
        getAllActivityFirestore(),
        getPushedQueueFirestore(),
        getAllEdgesFirestore(),
        getAllCustomSentencesFirestore(),
        getAllNotebookEntriesFirestore(),
      ])

    return {
      progress,
      settings,
      streak,
      activity,
      pushed,
      edges,
      customSentences,
      notebook,
    }
  } catch (error) {
    console.error("[GridLang] Error loading all data from Firestore:", error)
    return null
  }
}
