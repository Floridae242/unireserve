import { handleApi } from '../../../lib/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handler = (request: Request) => handleApi(request);
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
