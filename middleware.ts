import { NextResponse, type NextRequest } from "next/server";

/**
 * The gate.
 *
 * Posture is DEFAULT DENY: anything not explicitly listed as public needs
 * a valid-looking link token, either in the path (/i/<token>) or in the
 * cookie we set the first time someone opens their link.
 *
 * This runs on the Edge and deliberately does NOT touch the database —
 * it only checks the token's *shape*. Real validation happens in the page,
 * which looks the token up and 404s if it isn't a real household. A forged
 * cookie therefore gets you past the gate and straight into a 404.
 */

const TOKEN_COOKIE = "wd_token";
const TOKEN_RE = /^[23456789abcdefghijkmnpqrstuvwxyz]{22}$/;
const TWO_YEARS = 60 * 60 * 24 * 730;

/** Public: the save-the-date face of the site. No venue, no timings. */
const PUBLIC_PATHS = new Set([
  "/",
  "/robots.txt",
  "/manifest.webmanifest",
  "/favicon.ico",
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Opening a personal link: remember it, so the household never needs
  // the original message again on this device.
  if (pathname.startsWith("/i/")) {
    const token = pathname.slice("/i/".length).split("/")[0];
    const res = noindex(NextResponse.next());
    if (TOKEN_RE.test(token)) {
      res.cookies.set(TOKEN_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: TWO_YEARS,
        path: "/",
      });
    }
    return res;
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return noindex(NextResponse.next());
  }

  // Dev-only previews of the full site with mock data, no Supabase or
  // real token needed — /preview, /preview-image, /preview-video (see
  // components/PreviewSite.tsx). Those pages 404 themselves outside
  // development; this just keeps the gate from redirecting them away
  // before they get the chance to.
  if (
    (pathname === "/preview" || pathname.startsWith("/preview-")) &&
    process.env.NODE_ENV !== "production"
  ) {
    return noindex(NextResponse.next());
  }

  // Everything else is behind the gate.
  const cookie = req.cookies.get(TOKEN_COOKIE)?.value;
  if (cookie && TOKEN_RE.test(cookie)) {
    return noindex(NextResponse.next());
  }

  const home = req.nextUrl.clone();
  home.pathname = "/";
  home.search = "";
  return noindex(NextResponse.redirect(home));
}

/**
 * Belt and braces alongside the metadata robots tag: this covers API
 * responses and anything else that isn't an HTML document.
 */
function noindex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

export const config = {
  matcher: [
    // Everything except Next internals and static files in /public.
    // Media has to be listed here too — a <video> whose file gets
    // redirected to "/" by the gate fails silently with no usable source.
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|mp4|webm|mov|woff|woff2|ttf|glb)$).*)",
  ],
};
