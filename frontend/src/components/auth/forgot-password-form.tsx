'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    console.log(values);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
  }

  /* =========================
   RENDER
========================= */
return (
  <div className="w-full max-w-[320px] bg-[#13233f] rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.55)] p-6">
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* TITLE */}
        <h2 className="text-2xl font-bold text-orange-500 text-center">
          Forgot Password
        </h2>

        <p className="text-xs text-center text-slate-300 -mt-2">
          Enter your email to receive a reset link
        </p>

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Email address"
                    className="
                      h-11 pl-10
                      bg-transparent
                      text-white
                      border border-orange-500
                      rounded-lg
                      placeholder:text-slate-400
                      focus-visible:ring-0
                    "
                  />
                </FormControl>
              </div>
              <FormMessage className="text-red-400 text-xs" />
            </FormItem>
          )}
        />

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full h-11
            bg-orange-500 hover:bg-orange-400
            text-black font-semibold
            rounded-full
            text-lg
          "
        >
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </Button>

        {/* Back to login */}
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-400">
            Remember your password?{" "}
          </span>
          <Link
            href="/login"
          className="text-sm font-semibold text-orange-500 hover:underline">
            Back to login
          </Link>
        </div>

      </form>
    </Form>
  </div>
);
}