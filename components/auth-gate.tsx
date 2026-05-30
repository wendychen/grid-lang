"use client"

import { useEffect, useState, createContext, useContext, type ReactNode } from "react"
import {
  initializeFirebase,
  onAuthChange,
  signInWithGoogle,
  signOut,
  isFirebaseConfigured,
  type User,
} from "@/lib/firebase"
import { migrateFromDexieToFirestore } from "@/lib/firestore"
import { Languages, LogIn } from "lucide-react"

// Auth Context
interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  isConfigured: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

// Auth Provider
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    // Initialize Firebase
    initializeFirebase()
    setIsConfigured(isFirebaseConfigured())

    if (!isFirebaseConfigured()) {
      // Firebase not configured, skip auth
      setLoading(false)
      return
    }

    // Listen for auth changes
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user)
      
      // Migrate Dexie data to Firestore on sign-in
      if (user) {
        await migrateFromDexieToFirestore()
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleSignIn = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error("Sign-in error:", error)
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Sign-out error:", error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut,
        isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Sign In Screen
export function SignInScreen() {
  const { signIn, loading, isConfigured } = useAuth()

  // If Firebase not configured, show message
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Languages className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">GridLang</h1>
            <p className="text-muted-foreground mt-2">
              Learn German with spaced repetition
            </p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Firebase is not configured. The app will use local storage only.
              To enable cloud sync, add Firebase environment variables.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg">
            <Languages className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">GridLang</h1>
            <p className="text-muted-foreground mt-2">
              Learn German with spaced repetition
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center mx-auto">
              <span className="text-lg">240+</span>
            </div>
            <p className="text-xs text-muted-foreground">Sentences</p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center mx-auto">
              <span className="text-lg">10</span>
            </div>
            <p className="text-xs text-muted-foreground">Themes</p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-accent-gold/10 flex items-center justify-center mx-auto">
              <span className="text-lg">SRS</span>
            </div>
            <p className="text-xs text-muted-foreground">Algorithm</p>
          </div>
        </div>

        {/* Sign In Button */}
        <div className="space-y-4">
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-foreground text-background rounded-xl font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Sign in to sync your progress across devices
          </p>
        </div>
      </div>
    </div>
  )
}

// Auth Gate - wraps app and shows sign-in if not authenticated
interface AuthGateProps {
  children: ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading, isConfigured } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Languages className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // If Firebase not configured, show app directly (local mode)
  if (!isConfigured) {
    return <>{children}</>
  }

  // Show sign-in screen if not authenticated
  if (!user) {
    return <SignInScreen />
  }

  // Show app
  return <>{children}</>
}
