import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect('/bookings');
  }

  const params = await searchParams;
  const callbackUrl = params.callbackUrl || '/bookings';
  const hasError = !!params.error;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-md border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-emerald-800">เข้าสู่ระบบ</h1>
          <p className="text-sm text-slate-500">ใช้บัญชีผู้ใช้งานในระบบรถส่วนกลาง</p>
        </div>

        {hasError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง
          </div>
        )}

        <form
          action={async (formData) => {
            'use server';

            const username = formData.get('username');
            const password = formData.get('password');
            const redirectTo = typeof formData.get('callbackUrl') === 'string'
              ? String(formData.get('callbackUrl'))
              : '/bookings';

            try {
              await signIn('credentials', {
                username,
                password,
                redirectTo,
              });
            } catch (error) {
              if (error instanceof AuthError) {
                redirect(`/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(redirectTo)}`);
              }

              throw error;
            }
          }}
          className="space-y-4"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          <div className="space-y-2">
            <label htmlFor="username" className="text-xs font-semibold uppercase text-slate-500">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-semibold uppercase text-slate-500">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}
