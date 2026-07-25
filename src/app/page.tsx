import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'coordinador') {
    redirect('/coordinador/dashboard');
  } else {
    redirect('/instructor/dashboard');
  }
}
