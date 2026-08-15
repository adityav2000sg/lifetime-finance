import LifetimeFinanceHub from '@/components/LifetimeFinanceHub';
import { chatGPTSignOutPath, requireChatGPTUser } from '@/app/chatgpt-auth';

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return (
    <LifetimeFinanceHub
      viewer={{ userId: user.userId, displayName: user.displayName, email: user.email }}
      signOutPath={chatGPTSignOutPath("/")}
    />
  );
}
