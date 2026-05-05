// API Route Example dengan Legacy JWT
import { withLegacyAuth } from '@/lib/auth-middleware';

/**
 * @route GET /api/protected
 * @desc Protected route dengan Legacy JWT verification
 */
async function handler(req, res) {
  try {
    // req.user sudah tersedia dari middleware
    const { user } = req;

    return res.status(200).json({
      success: true,
      message: 'Akses diberikan',
      user: {
        id: user.sub || user.id,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default withLegacyAuth(handler);
