import { verifyLegacyToken } from './jwt-legacy';

/**
 * Middleware untuk verifikasi token legacy
 * Gunakan ini di API routes atau middleware Next.js
 */

export function withLegacyAuth(handler) {
  return async (req, res) => {
    try {
      // Ambil token dari header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Token tidak ditemukan' 
        });
      }

      const token = authHeader.substring(7);
      
      // Verifikasi dengan legacy secret
      const decoded = verifyLegacyToken(token);
      
      if (!decoded) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Token invalid atau expired' 
        });
      }

      // Attach user data ke request
      req.user = decoded;
      
      // Lanjut ke handler
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: error.message 
      });
    }
  };
}

/**
 * Helper untuk extract token dari request
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
