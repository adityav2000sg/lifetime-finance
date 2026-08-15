import LifetimeFinanceHub from '@/components/LifetimeFinanceHub';
import { LOCAL_USER } from '@/app/local-identity';

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <LifetimeFinanceHub
      viewer={{ userId: LOCAL_USER.userId, displayName: LOCAL_USER.displayName, email: LOCAL_USER.email }}
    />
  );
}
