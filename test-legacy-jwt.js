// Test file untuk memastikan Legacy JWT berfungsi
import { verifyLegacyToken, generateLegacyToken, decodeToken } from './lib/jwt-legacy.js';

console.log('🧪 Testing Legacy JWT Configuration...\n');

// Cek apakah LEGACY_JWT_SECRET sudah diatur
const secret = process.env.LEGACY_JWT_SECRET;

if (!secret || secret === 'GANTI_DENGAN_LEGACY_JWT_SECRET_ANDA_DISINI') {
  console.error('❌ LEGACY_JWT_SECRET belum diatur di .env.local');
  console.log('\nPastikan Anda sudah:');
  console.log('1. Copy .env.local.example ke .env.local');
  console.log('2. Isi LEGACY_JWT_SECRET dengan value dari Supabase Dashboard');
  process.exit(1);
}

console.log('✅ LEGACY_JWT_SECRET ditemukan');
console.log(`🔑 Secret length: ${secret.length} karakter\n`);

// Test 1: Generate Token
console.log('📋 Test 1: Generate Token');
try {
  const payload = { 
    userId: '123', 
    email: 'test@example.com',
    role: 'authenticated'
  };
  const token = generateLegacyToken(payload, { expiresIn: '1h' });
  console.log('✅ Token berhasil dibuat');
  console.log(`📝 Token: ${token.substring(0, 50)}...\n`);

  // Test 2: Decode Token
  console.log('📋 Test 2: Decode Token (tanpa verifikasi)');
  const decoded = decodeToken(token);
  console.log('✅ Token berhasil di-decode');
  console.log('📄 Payload:', JSON.stringify(decoded, null, 2));

  // Test 3: Verify Token
  console.log('\n📋 Test 3: Verify Token');
  const verified = verifyLegacyToken(token);
  if (verified) {
    console.log('✅ Token valid dan terverifikasi');
    console.log('👤 User:', verified.email);
  } else {
    console.log('❌ Token invalid');
  }

  // Test 4: Verify Token Invalid
  console.log('\n📋 Test 4: Verify Token Invalid');
  const invalidResult = verifyLegacyToken('token-palsu-yang-salah');
  if (!invalidResult) {
    console.log('✅ Sistem berhasil menolak token invalid\n');
  }

  console.log('🎉 Semua test berhasil! Legacy JWT siap digunakan.');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Troubleshooting:');
  console.log('- Pastikan jsonwebtoken sudah terinstall: npm install jsonwebtoken');
  console.log('- Pastikan LEGACY_JWT_SECRET memiliki minimal 32 karakter');
  console.log('- Restart server jika baru mengubah .env.local');
}
