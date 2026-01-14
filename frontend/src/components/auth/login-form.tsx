'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { Lock, Phone, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

/* =========================
   SCHEMA
========================= */
const formSchema = z.object({
  phone: z
    .string()
    .min(1, { message: 'Phone number or email is required.' })
    .min(3, { message: 'Please enter a valid phone number or email.' }),
  password: z
    .string()
    .min(1, { message: 'Password is required.' })
    .min(8, { message: 'Password must be at least 8 characters.' }),
});

/* =========================
   HELPERS
========================= */
async function fetchMe(API_URL: string) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token tidak ditemukan');

  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Gagal mengambil data user');
  }

  return res.json();
}

/* =========================
   COMPONENT
========================= */
export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  /* =========================
     SUBMIT
  ========================= */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: values.phone,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data?.code === 'USER_NOT_FOUND') {
          throw new Error(
            'Maaf, user belum terdaftar silahkan register terlebih dahulu'
          );
        }

        if (data?.code === 'INVALID_PASSWORD') {
          throw new Error('Password yang Anda masukkan salah');
        }

        throw new Error(data?.message || 'Login gagal');
      }

      /* ===== SUCCESS ===== */
      const token = data?.token;
      if (!token) throw new Error('Token tidak ditemukan');

      const isLocalhost =
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost';

      document.cookie = `token=${token}; Path=/; ${
        isLocalhost ? 'SameSite=Lax' : 'SameSite=None; Secure'
      }`;

      localStorage.setItem('token', token);

      const user = await fetchMe(API_URL);
      localStorage.setItem('user', JSON.stringify(user));

      window.dispatchEvent(
        new CustomEvent('user-updated', { detail: user })
      );

      toast({
        description: (
          <span>
            Welcome to Chat Room,&nbsp;
            <strong className="font-semibold">{user.username}</strong>
          </span>
        ),
      });

      router.push(
        user.role?.toUpperCase() === 'ADMIN'
          ? '/admin-dashboard'
          : '/chat'
      );
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Login failed',
        variant: 'destructive',
      });

      form.setFocus('phone');
    } finally {
      setIsSubmitting(false);
    }
  }

/* =========================
   RENDER
========================= */
return (
  <div
      className="
      w-full max-w-[320px]
      p-6
      rounded-2xl
      bg-[#13233f]
      shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* SINGLE TITLE */}
        <h2 className="text-2xl font-bold text-orange-500 text-center">
          Login
        </h2>

        {/* Phone / Email */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Phone number or email"
                    className="h-12 pl-10 bg-transparent text-white border border-orange-500 focus-visible:ring-0"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        {/* Password + Forgot */}
        <div className="space-y-1">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                  <FormControl>
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      className="h-12 pl-10 pr-10 bg-transparent text-white border border-orange-500 focus-visible:ring-0"
                    />
                  </FormControl>

                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          {/* Forgot password */}
          <div className="flex justify-end pr-1 -mt-1">
            <Link
              href="/forgot-password"
              className="text-[11px] text-orange-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full
            h-12
            bg-orange-500
            hover:bg-orange-400
            text-black
            font-bold
            text-lg
            rounded-full
            transition-all
            duration-200
            disabled:opacity-90
          "
        >
          {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            <span className="text-black/40 font-medium tracking-wide blur-[0.3px]">
              Logging in...
            </span>
          </div>
        ) : (
          "Login"
        )}
        </Button>

        {/* Sign up link */}
        <div className="text-center text-sm text-gray-400 pt-2">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-orange-500 hover:underline"
          >
            Sign up
          </Link>
        </div>
      </form>
    </Form>
  </div>
);
}