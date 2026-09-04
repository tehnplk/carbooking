import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AddBookingForm from './AddBookingForm';

export const dynamic = 'force-dynamic';

const SSO_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'คุณยกเลิกการเข้าสู่ระบบ กรุณากด "อนุญาตและดำเนินการต่อ" เพื่อขอใช้รถ',
  invalid_request: 'คำขอเข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่อีกครั้ง',
};

const SSO_ERROR_FALLBACK = 'ไม่สามารถยืนยันตัวตนผ่าน MOPH ID ได้ กรุณาลองใหม่อีกครั้ง';

export default async function AddBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ sso_error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    // Show the failure instead of bouncing back to SSO, which would loop.
    if (params.sso_error) {
      return (
        <div className="mx-auto max-w-md space-y-4 rounded-md border border-rose-200 bg-rose-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-rose-700">เข้าสู่ระบบไม่สำเร็จ</h1>
          <p className="text-sm text-rose-600">
            {SSO_ERROR_MESSAGES[params.sso_error] ?? SSO_ERROR_FALLBACK}
          </p>
          <Link
            href="/auth/sso/login?callbackUrl=/bookings/add"
            className="inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            ลองอีกครั้ง
          </Link>
        </div>
      );
    }

    redirect('/auth/sso/login?callbackUrl=/bookings/add');
  }

  return (
    <AddBookingForm
      requesterName={session.user.name ?? ''}
      requesterPosition={session.user.position ?? ''}
    />
  );
}
