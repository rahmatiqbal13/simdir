/**
 * Supabase Auth Setup Script
 * 
 * Script ini akan membuat users di Supabase Auth
 * Usage: node setup-supabase-auth.js
 */

const { createClient } = require('@supabase/supabase-js')

// ============================================
// KONFIGURASI - Sesuaikan dengan project Anda
// ============================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fqlxjnlxilnsyicamtqj.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'

// Users yang akan dibuat
const users = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'adminiqbal@usc.ac.id',
    password: 'usc@_140451',
    username: 'adminiqbal',
    full_name: 'Admin Iqbal',
    role: 'super_admin'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'keuangan@usc.ac.id',
    password: 'keuangan123',
    username: 'keuangan',
    full_name: 'Admin Keuangan',
    role: 'admin_keuangan'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'operator@usc.ac.id',
    password: 'operator123',
    username: 'operator',
    full_name: 'Operator',
    role: 'admin'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'pimpinan@usc.ac.id',
    password: 'pimpinan123',
    username: 'pimpinan',
    full_name: 'Pimpinan',
    role: 'pimpinan'
  }
]

// ============================================
// MAIN SCRIPT
// ============================================
async function setupAuth() {
  console.log('============================================')
  console.log('Supabase Auth Setup')
  console.log('============================================\n')

  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) {
    console.error('❌ Error: SUPABASE_URL belum diatur dengan benar')
    console.log('Pastikan Anda mengedit file ini dengan URL Supabase yang benar')
    process.exit(1)
  }

  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.includes('YOUR_')) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY belum diatur')
    console.log('\nCara mendapatkan Service Role Key:')
    console.log('1. Buka Supabase Dashboard → Project Settings → API')
    console.log('2. Copy "service_role secret" (bukan anon key)')
    console.log('3. Ganti YOUR_SERVICE_ROLE_KEY_HERE di file ini\n')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log(`🔗 Connecting to: ${SUPABASE_URL}\n`)

  for (const user of users) {
    console.log(`\n👤 Processing: ${user.username} (${user.email})`)
    
    try {
      // Cek apakah user sudah ada
      const { data: existingUser, error: getError } = await supabase.auth.admin.getUserById(user.id)
      
      if (getError && getError.message !== 'User not found') {
        console.log(`   ⚠️  Error checking user: ${getError.message}`)
        continue
      }

      if (existingUser?.user) {
        console.log(`   ℹ️  User already exists, updating...`)
        
        // Update user
        const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          {
            email: user.email,
            password: user.password,
            user_metadata: {
              username: user.username,
              full_name: user.full_name,
              role: user.role
            },
            email_confirm: true
          }
        )

        if (updateError) {
          console.log(`   ❌ Failed to update: ${updateError.message}`)
        } else {
          console.log(`   ✅ User updated successfully`)
        }
      } else {
        console.log(`   📝 Creating new user...`)
        
        // Create user dengan UUID spesifik
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          id: user.id,
          email: user.email,
          password: user.password,
          user_metadata: {
            username: user.username,
            full_name: user.full_name,
            role: user.role
          },
          email_confirm: true
        })

        if (createError) {
          console.log(`   ❌ Failed to create: ${createError.message}`)
        } else {
          console.log(`   ✅ User created successfully`)
        }
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`)
    }
  }

  console.log('\n\n============================================')
  console.log('Setup Complete!')
  console.log('============================================')
  console.log('\n📋 Summary:')
  console.log('- 4 users configured in Supabase Auth')
  console.log('- Run the SQL script to create database tables')
  console.log('- Default login: adminiqbal / usc@_140451')
  console.log('\n📖 Next Steps:')
  console.log('1. Jalankan supabase-setup-complete.sql di SQL Editor')
  console.log('2. Update NEXT_PUBLIC_SUPABASE_URL di .env.local')
  console.log('3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local')
  console.log('4. Restart dev server: npm run dev')
}

// Jalankan script
setupAuth().catch(console.error)
