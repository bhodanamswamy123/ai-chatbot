import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6Im5peWl3NTMzNDVAN3R1bC5jb20iLCJlbWFpbCI6Im5peWl3NTMzNDVAN3R1bC5jb20iLCJuYW1laWQiOiJjMTU1NzM1Mi1kMGE0LTRlMDktYTgzMi1kMGYzNDE5OGM2MWEiLCJGaXJzdE5hbWUiOiJSYW1lc2giLCJMYXN0TmFtZSI6IkJvbGxhIiwiU2Vzc2lvbiI6ImM4N2FkNDYwLTMxM2ItNGJkOC04MDhlLWNjMjU3YThjYThjOSIsIk9yaWdpbiI6Im9yZGVyc2RlbW8uZWFzeWZhc3Rub3cuY29tIiwiQXBwUmVmZXJlbmNlIjoiMmQxMzJkYmEtNTFmNC00YmU1LTk4YTItYmRlZTM4MjgyNmI2IiwiYXVkIjpbIkNDUUFBbGxvY2F0aW9uQ29tbWFuZEFQSSIsIkNDUUFBbGxvY2F0aW9uUXVlcmllc0FQSSIsIkNDUUFDYXJ0UXVlcmllc0FQSSIsIkNDUUFDYXJ0Q29tbWFuZHNBUEkiLCJDQ1FBUXVvdGVDb21tYW5kc0FQSSIsIkNDUUFRdW90ZVF1ZXJpZXNBUEkiLCJDQ1FBV2lzaGxpc3RBUEkiLCJDQ1FBRXhwb3J0c1F1ZXJpZXNBUEkiLCJDQ1FBRXhwb3J0c0NvbW1hbmRBUEkiLCJRQU9uZVNvdXJjZUFQSSIsIk5vZGVDb21tb25TZXJ2aWNlIiwiQ0NRQUNNU1F1ZXJpZXNBUEkiLCJDQ1FBQ01TQ29tbWFuZEFQSSIsIkNDUUFBY2NvdW50Q29tbWFuZEFQSSIsIkNDUUFBY2NvdXRRdWVyaWVzQVBJIiwiQ0NRQUF1dGhTeW5jQ29tbWFuZEFQSSIsIkNDUUFDb3JlQ29udHJvbENvbW1hbmRBUEkiLCJDQ1FBQ29yZUNvbnRyb2xRdWVyaWVzQVBJIiwiQ0NRQUN1c3RvbWVyQ29tbWFuZEFQSSIsIkNDUUFDdXN0b21lclF1ZXJpZXNBUEkiLCJDQ1FBUGF5bWVudENvbmZpZ0NvbW1hbmRBUEkiLCJDQ1FBUGF5bWVudENvbmZpZ1F1ZXJpZXNBUEkiLCJDQ1FBUE1Db21tYW5kQVBJIiwiQ0NRQVBNUXVlcmllc0FQSSIsIkNDUUFQcm9kdWN0c0NvbW1hbmRBUEkiLCJDQ1FBUnVsZUNvbW1hbmRBUEkiLCJDQ1FBUnVsZVF1ZXJpZXNBUEkiLCJDQ1FBU2FsZXNDb21tYW5kQVBJIiwiQ0NRQVNlYXJjaENvbW1hbmRBUEkiLCJDQ1FBU2VhcmNoUXVlcmllc0FQSSIsIkNDUUFTaGlwcGluZ0NvbW1hbmRBUEkiLCJDQ1FBU2hpcHBpbmdRdWVyaWVzQVBJIiwiQ0NRQVRheENvbmZpZ0NvbW1hbmRBUEkiLCJDQ1FBVGF4Q29uZmlnUXVlcmllc0FQSSIsIkNDUUFVTVF1ZXJpZXNBUEkiLCJDQ1FBV0lDb21tYW5kQVBJIiwiQ0NRQVdJUXVlcmllc0FQSSIsIkNDUUFXZWJzaXRlQ29tbWFuZEFQSSIsIkNDUUFXZWJzaXRlUXVlcmllc0FQSSIsIkNDUUFNYXJrZXRpbmdDb21tYW5kQVBJIiwiQ0NRQU1hcmtldGluZ1F1ZXJpZXNBUEkiLCJDQ1FBSW1wb3J0c0NvbW1hbmRBUEkiLCJDQ1FBSW1wb3J0c1F1ZXJpZXNBUEkiLCJDQ1FBTWFjcm9zQ29tbWFuZEFQSSIsIkNDUUFNYWNyb3NRdWVyaWVzQVBJIiwiQ0NRQUV2ZW50UmVnaXN0ZXJDb21tYW5kQVBJIiwiQ0NRQU9yZGVyQ29tbWFuZHNBUEkiLCJDQ1FBT3JkZXJRdWVyaWVzQVBJIl0sInNjb3BlIjoiIiwibmJmIjoxNzYzOTY3NjA2LCJleHAiOjE3NjQwNTQwMDYsImlhdCI6MTc2Mzk2NzYwNiwiaXNzIjoiZWRnZS1xYS1pc3N1ZXIifQ.PWdYVqhvT6gK9hhuvtOvoETUzfsdovfxOuBPITSadbw4OCrrdie1MEIXx7UZV9KtpxSQIwyWeg-H5FzJI_8Cbwwwbm3xaNwLbEd-yA4xeuDtYh1vn4Kz6Q9KJyARxWqrm8ucKPbdXj30KynrFFOr7pxgtyiYDZkVkBoey51foTwoE87LuaigSpxsSX6-kNtYMS3lf25aGUsGBJCuYBXTO866lVfUMm5y7_RymLcEriuWIWlsxEW6OSj7dVgZfipdZrS6sv2m568f6jG6SVbK8B9hXj42BF1p7IRbKKYc_NGIDxKdHZqleisR2VSGN05eqvX6rPY8dFqrIfY4qRmyRw",
    secureCookie: !isDevelopmentEnvironment,
  });

  // Detect iframe embedding and allow guest mode without server redirect
  const secFetchDest = request.headers.get("sec-fetch-dest");
  const referer = request.headers.get("referer");
  const { searchParams } = request.nextUrl;
  const isIframeParam = searchParams.get("iframe") === "true";

  // Allow if:
  // 1. Browser indicates iframe context, OR
  // 2. Request comes from allowed domain, OR
  // 3. Has iframe query parameter
  const isIframeContext = secFetchDest === "iframe" ||
                         (referer && referer.includes("easyfastnow.com")) ||
                         isIframeParam;

  // Skip auth redirect for iframe embeds - let client-side guest auth handle it
  if (!token && !isIframeContext) {
    const redirectUrl = encodeURIComponent(request.url);

    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  const isGuest = guestRegex.test(token?.email ?? "");

  if (token && !isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
