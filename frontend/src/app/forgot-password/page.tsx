import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import { LayoutWithBg } from '../layout-with-bg';

export default function ForgotPasswordPage() {
  return (
    <LayoutWithBg>
      <Card className="w-full max-w-xs rounded-xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <CardHeader className="space-y-2 text-center">
          <h1 className="text-3xl font-bold font-headline text-foreground">Forgot Password</h1>
          <p className="text-muted-foreground">Enter your email to reset your password.</p>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
            <Link href="/" className="font-semibold text-accent underline-offset-4 hover:underline">
              &larr; Back to Login
            </Link>
        </CardFooter>
      </Card>
    </LayoutWithBg>
  );
}
