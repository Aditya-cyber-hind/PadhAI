import { AccountView } from '@neondatabase/auth-ui';
import { accountViewPaths } from '@neondatabase/auth-ui/server';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-stone-50">
      <div className="w-full max-w-2xl bg-white rounded-xl border border-stone-200 p-6">
        <AccountView path={path} />
      </div>
    </main>
  );
} 
