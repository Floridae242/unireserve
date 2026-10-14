// Stand-in for member3 Resource until it is implemented. Follows the contract Booking expects:
// GET /resources/:id -> 200 { resource: { id, name, active } } or 404.
// Ids starting with "missing-" do not exist, "inactive-" are inactive, anything else is active,
// so each test can use its own resource id without seeding.
const http = require('node:http');

const port = Number(process.env.PORT ?? 3003);
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { status: 'ok', service: 'resource-stub' });
  const match = req.method === 'GET' && req.url?.match(/^\/resources\/([^/?]+)$/);
  if (!match) return json(res, 404, { error: 'NOT_FOUND' });
  const id = decodeURIComponent(match[1]);
  if (id.startsWith('missing-')) return json(res, 404, { error: 'RESOURCE_NOT_FOUND' });
  json(res, 200, { resource: { id, name: `Stub ${id}`, active: !id.startsWith('inactive-') } });
}).listen(port, () => console.log(`Resource stub listening on port ${port}`));
