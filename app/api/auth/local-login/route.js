import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { sessionData } = await request.json()
    
    if (!sessionData) {
      return NextResponse.json({ error: 'Session data required' }, { status: 400 })
    }

    // Create response with redirect
    const response = NextResponse.json({ success: true })
    
    // Set cookie for local session
    // This cookie will be read by middleware
    response.cookies.set('simdir_session_local', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Local login error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
