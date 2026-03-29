import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/oh/(.*)",
  "/flyer/(.*)",
  "/api/v1/visitor-signin",
  "/api/v1/auth/webhook",
  "/api/v1/open-houses/by-slug/(.*)",
  "/api/v1/debug/rls-context(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/styleguide",
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const isLocalDebug = process.env.NODE_ENV !== "production";

  // Hard bypass for local diagnostics endpoint so Clerk middleware cannot intercept.
  // Security remains enforced by the route's x-rls-diagnostics secret-header guard.
  if (pathname === "/api/v1/debug/rls-context") {
    return NextResponse.next();
  }

  if (isLocalDebug && pathname === "/api/v1/debug/rls-context") {
    // eslint-disable-next-line no-console
    console.log("[middleware] incoming /api/v1/debug/rls-context", {
      pathname,
      method: req.method,
      isPublic: isPublicRoute(req),
    });
  }

  const isPublic = isPublicRoute(req);
  if (isPublic) {
    if (isLocalDebug && pathname === "/api/v1/debug/rls-context") {
      // eslint-disable-next-line no-console
      console.log("[middleware] public route — skipping Clerk auth");
    }
    return NextResponse.next();
  }
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
