export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!login|api/auth|api/init|_next/static|_next/image|favicon.ico).*)"],
};
