import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  console.log("=== MIDDLEWARE RUN ===");
  console.log("PATH:", req.nextUrl.pathname);
  console.log("TOKEN RAW:", token);

  if (!token) {
    console.log("NO TOKEN → redirect login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    console.log("PAYLOAD:", payload);

    const role = (payload as any).role;
    const isAdmin = req.nextUrl.pathname.startsWith("/admin-dashboard");

    console.log("IS ADMIN PAGE:", isAdmin);
    console.log("ROLE:", role);

    if (isAdmin && role !== "ADMIN") {
      console.log("NOT ADMIN → redirect dashboard user");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    console.log("ACCESS ALLOWED");
    return NextResponse.next();
  } catch (error) {
    console.log("JWT ERROR:", error);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin-dashboard/:path*"],
};
