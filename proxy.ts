export { auth as proxy } from "@/auth";

export const config = {
  // Everything signs in first, except auth itself and the files an installed app fetches on its own.
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons/|manifest.webmanifest|sw.js).*)"],
};
