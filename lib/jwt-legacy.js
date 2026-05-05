import jwt from 'jsonwebtoken';

/**
 * Legacy JWT Configuration
 * 
 * Cara penggunaan:
 * 1. Copy .env.local.example → .env.local
 * 2. Isi LEGACY_JWT_SECRET dengan value dari Supabase Dashboard
 * 3. Import dan gunakan fungsi di bawah ini
 */

function getSecret() {
  return process.env.LEGACY_JWT_SECRET;
}

/**
 * Verifikasi token menggunakan Legacy JWT Secret
 * @param {string} token - JWT token yang akan diverifikasi
 * @returns {object|null} - Decoded payload atau null jika invalid
 */
export function verifyLegacyToken(token) {
  try {
    const secret = getSecret();
    if (!secret) {
      throw new Error('LEGACY_JWT_SECRET belum diatur di .env.local');
    }

    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Generate token menggunakan Legacy JWT Secret (jika diperlukan)
 * @param {object} payload - Data yang akan dimasukkan ke token
 * @param {object} options - Opsi jwt.sign (expiresIn, dll)
 * @returns {string} - JWT token
 */
export function generateLegacyToken(payload, options = { expiresIn: '7d' }) {
  try {
    const secret = getSecret();
    if (!secret) {
      throw new Error('LEGACY_JWT_SECRET belum diatur di .env.local');
    }

    const token = jwt.sign(payload, secret, options);
    return token;
  } catch (error) {
    console.error('Token generation failed:', error.message);
    throw error;
  }
}

/**
 * Decode token tanpa verifikasi (untuk debug)
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload
 */
export function decodeToken(token) {
  try {
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    console.error('Token decode failed:', error.message);
    return null;
  }
}

export default {
  verifyLegacyToken,
  generateLegacyToken,
  decodeToken,
};
