// frontend/src/components/auth/signup-form.tsx
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const formSchema = z.object({
  username: z.string().min(2, { message: "Username must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export function SignUpForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      // =========================
      // HANDLE ERROR SPESIFIK
      // =========================
      if (!response.ok) {
        if (data?.field === "username") {
          toast({
            title: "Gagal",
            description: "Username sudah digunakan",
            variant: "destructive",
          });
          return;
        }

        if (data?.field === "phone") {
          toast({
            title: "Gagal",
            description: "Nomor HP sudah digunakan",
            variant: "destructive",
          });
          return;
        }

        if (data?.field === "email") {
          toast({
            title: "Gagal",
            description: "Email sudah terdaftar",
            variant: "destructive",
          });
          return;
        }

        throw new Error(data?.message || "Signup failed");
      }

      // =========================
      // SUCCESS
      // =========================
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      toast({
        title: undefined,
        description: (
          <span>
            Account created! Welcome,&nbsp;
            <strong className="font-semibold text-blue-800">
              {values.username}
            </strong>
          </span>
        ),
      });

      setTimeout(() => {
        window.location.href = "/chat";
      }, 800);

    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Signup failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
  <div className="w-full max-w-[340px] bg-slate-900 rounded-2xl shadow-2xl p-7">
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* TITLE */}
        <h2 className="text-2xl font-bold text-orange-500 text-center">
          Sign Up
        </h2>

        {/* Username */}
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500" />
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Username"
                    className="h-12 pl-10 bg-transparent text-white border border-orange-500 focus-visible:ring-0"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

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
                    className="h-12 pl-10 bg-transparent text-white border border-orange-500 focus-visible:ring-0"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        {/* Phone */}
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
                    placeholder="Phone number"
                    className="h-12 pl-10 bg-transparent text-white border border-orange-500 focus-visible:ring-0"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-red-400" />
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

              <p className="text-[11px] text-orange-400 mt-1">
                Password must be at least 8 characters
              </p>

              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        {/* SUBMIT */}
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
            !mt-6
          "
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>
        
        {/* Back to login */}
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-400">
            Already have an account?{" "}
          </span>
          <Link
            href="/login"
            className="text-sm font-semibold text-orange-500 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </form>
    </Form>
  </div>
);
}
