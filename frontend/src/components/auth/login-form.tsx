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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Phone / Email */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <FormControl>
                  <Input
                    placeholder="Phone Number or Email"
                    {...field}
                    className="h-12 pl-10"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    {...field}
                    className="h-12 pl-10 pr-10"
                  />
                </FormControl>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Forgot password */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
