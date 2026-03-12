import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Use Node.js runtime to avoid Edge middleware failures on Vercel
export const runtime = "nodejs";

const isPublicRoute = createRouteMatcher([
  "/oh/(.*)",
  "/api/v1/visitor-signin",
  "/api/v1/auth/webhook",
  "/api/v1/open-houses/by-slug/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/styleguide",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
