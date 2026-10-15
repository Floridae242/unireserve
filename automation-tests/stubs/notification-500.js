// Failing Notification used to check Booking's behaviour when Notification is unhealthy:
// POST /notifications always answers 500 and is counted, so tests can verify Booking retries exactly once.
// GET /calls returns { calls } for the assertion.
const http = require('node:http');

const port = Number(process.env.PORT ?? 3002);
let calls = 0;
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { status: 'ok', service: 'notification-500' });
  if (req.method === 'GET' && req.url === '/calls') return json(res, 200, { calls });
  if (req.method === 'POST' && req.url === '/notifications') {
    calls++;
    req.resume();
    return json(res, 500, { error: 'INTERNAL_ERROR' });
  }
  json(res, 404, { error: 'NOT_FOUND' });
}).listen(port, () => console.log(`Failing notification stub listening on port ${port}`));
