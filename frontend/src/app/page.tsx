import { LoginForm } from '@/components/auth/login-form';
import { LayoutWithBg } from './layout-with-bg';

export default function Home() {
  return (
    <LayoutWithBg>
      <LoginForm />
    </LayoutWithBg>
  );
}
