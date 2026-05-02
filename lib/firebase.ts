"use client"

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import {
  getFirestore,
  enableIndexedDbPersistence,
  type Firestore,
} from "firebase/firestore"

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  )
}

// Initialize Firebase
let app: FirebaseApp | null = null
let auth: ReturnType<typeof getAuth> | null = null
let db: Firestore | null = null
let persistenceEnabled = false

export function initializeFirebase() {
  if (!isFirebaseConfigured()) {
    console.warn("[GridLang] Firebase not configured - using local storage only")
    return { app: null, auth: null, db: null }
  }

  if (!app && getApps().length === 0) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)

    // Enable offline persistence
    if (typeof window !== "undefined" && !persistenceEnabled) {
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === "failed-precondition") {
          console.warn("[GridLang] Multiple tabs open, persistence enabled in first tab only")
        } else if (err.code === "unimplemented") {
          console.warn("[GridLang] Browser doesn't support persistence")
        }
      })
      persistenceEnabled = true
    }
  } else if (getApps().length > 0) {
    app = getApps()[0]
    auth = getAuth(app)
    db = getFirestore(app)
  }

  return { app, auth, db }
}

// Get Firebase instances
export function getFirebaseAuth() {
  if (!auth) initializeFirebase()
  return auth
}

export function getFirebaseDb() {
  if (!db) initializeFirebase()
  return db
}

// Google Sign-In
const googleProvider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<User | null> {
  const auth = getFirebaseAuth()
  if (!auth) {
    console.error("[GridLang] Firebase auth not initialized")
    return null
  }

  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error) {
    console.error("[GridLang] Google sign-in error:", error)
    throw error
  }
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth) return

  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error("[GridLang] Sign-out error:", error)
    throw error
  }
}

// Auth state listener
export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth()
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

// Get current user
export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth()
  return auth?.currentUser || null
}

// Export types
export type { User }
