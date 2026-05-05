// Contoh penggunaan Legacy JWT di Server Component Next.js
import { verifyLegacyToken } from '@/lib/jwt-legacy';
import { cookies } from 'next/headers';

/**
 * Server Component dengan Legacy JWT Auth
 */
export default async function ProtectedPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    return <div>Silakan login terlebih dahulu</div>;
  }

  const user = verifyLegacyToken(token);

  if (!user) {
    return <div>Token invalid atau expired</div>;
  }

  return (
    <div>
      <h1>Selamat datang, {user.email}!</h1>
      <p>User ID: {user.sub || user.id}</p>
    </div>
  );
}
