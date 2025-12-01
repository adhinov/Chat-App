import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import { LayoutWithBg } from './layout-with-bg';

export default function Home() {
  return (
    <LayoutWithBg>
      <Card className="w-full max-w-xs rounded-2xl border-none shadow-[0_4px_15px_rgb(0,0,0,0.08)]">
        <CardHeader className="space-y-2 text-center">
          <h1 className="text-3xl font-bold font-headline text-foreground">Login</h1>
          <p className="text-muted-foreground">Enter your details</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">Don&apos;t have an account?&nbsp;</p>
          <Link href="/signup" className="font-semibold text-accent underline-offset-4 hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </LayoutWithBg>
  );
}
