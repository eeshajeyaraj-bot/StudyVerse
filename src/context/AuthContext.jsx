import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({ user: null, session: null, loading: true, refreshUser: async () => null })

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function refreshUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) return null
    setSession(current => current ? { ...current, user: data.user } : current)
    return data.user
  }

  const value = {
    user: session?.user ?? null,
    session,
    loading,
    refreshUser,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
