import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Use Node.js runtime to avoid Edge middleware failures on Vercel
export const runtime = "nodejs";

const isPublicRoute = createRouteMatcher([
  "/oh/(.*)",
  "/api/v1/visitor-signin",
  "/api/v1/auth/webhook",
  "/api/v1/open-houses/by-slug/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth().protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
