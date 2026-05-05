'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLocalMode, setIsLocalMode] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    const getUser = async () => {
      // ============================================
      // METODE 1: Coba dari Supabase Auth dulu
      // ============================================
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          setUser(authUser)
          
          // Get profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single()
          
          setProfile(profileData)
          setLoading(false)
          return
        }
      } catch (supabaseErr) {
        console.log('Supabase auth error:', supabaseErr)
      }

      // ============================================
      // METODE 2: Fallback ke localStorage (local mode)
      // ============================================
      try {
        const localSession = localStorage.getItem('simdir_session')
        const localUser = localStorage.getItem('simdir_user')
        
        if (localSession && localUser) {
          const userData = JSON.parse(localUser)
          setUser({
            id: userData.id,
            email: userData.email,
            user_metadata: {
              username: userData.username,
              role: userData.role
            }
          })
          setProfile({
            id: userData.id,
            username: userData.username,
            full_name: userData.full_name,
            role: userData.role
          })
          setIsLocalMode(true)
          console.log('Using local session for user:', userData.username)
        }
      } catch (localErr) {
        console.error('Local session error:', localErr)
      }
      
      setLoading(false)
    }

    getUser()
  }, [])

  const signOut = async () => {
    if (isLocalMode) {
      // Hapus local session cookie via API
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (e) {
        console.log('Logout API error:', e)
      }
      
      // Hapus local session dari localStorage
      localStorage.removeItem('simdir_session')
      localStorage.removeItem('simdir_user')
      window.location.href = '/login'
    } else {
      // Coba logout dari Supabase
      try {
        await supabase.auth.signOut()
      } catch (e) {
        console.log('Supabase logout error:', e)
      }
      
      // Juga hapus local cookie untuk bersih-bersih
      try {
        await fetch('/api/auth/logout', { method: 'POST' })
      } catch (e) {
        // Ignore
      }
      
      localStorage.removeItem('simdir_session')
      localStorage.removeItem('simdir_user')
      window.location.href = '/login'
    }
  }

  return { user, profile, loading, signOut, isLocalMode }
}
