'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Lock, Phone, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  role: string;
}

const formSchema = z.object({
  phone: z
    .string()
    .min(1, { message: 'Phone number or email is required.' })
    .min(3, { message: 'Please enter a valid phone number or email.' }),
  password: z.string().min(1, { message: 'Password is required.' }).min(8, {
    message: 'Password must be at least 8 characters.',
  }),
});

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9002";
  console.log("API_URL FE =", API_URL);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

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
        throw new Error(data?.error || data?.message || 'Login failed');
      }

      if (data?.token) {
        const isLocalhost =
          typeof window !== 'undefined' && window.location.hostname === 'localhost';

        // Simpan token dalam cookie
        document.cookie = `token=${data.token}; Path=/; ${
          isLocalhost ? 'SameSite=Lax' : 'SameSite=None; Secure'
        }`;

        // Backup token
        localStorage.setItem('token', data.token);

        // Decode JWT
        const decoded = jwtDecode<JwtPayload>(data.token);

        // NORMALISASI ROLE (fix utama)
        const userRole = decoded.role?.toUpperCase();
        console.log("Decoded role =", decoded.role, "→ Normalized =", userRole);

        toast({
          title: 'Success',
          description: 'Logged in successfully!',
        });

        // Redirect berdasarkan role
        if (userRole === 'ADMIN') {
          router.push('/admin-dashboard');
        } else {
          router.push('/chat');
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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
                    className="h-12 pl-10 transition-shadow duration-300 focus:shadow-sm"
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
                    className="h-12 pl-10 pr-10 transition-shadow duration-300 focus:shadow-sm"
                  />
                </FormControl>

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Forgot password */}
        <div className="flex justify-end !mt-2">
          <Link
            href="/forgot-password"
            className="text-xs text-accent hover:underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full !mt-6 h-12 text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
