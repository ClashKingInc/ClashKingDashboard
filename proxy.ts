import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all routes except login, auth, servers, and static files
  matcher: ['/((?!login|auth|servers|_next|_vercel|api|.*\\..*).*)', '/']
};
