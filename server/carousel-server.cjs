const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.CAROUSEL_PORT || 3001);
const dataDirectory = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDirectory, 'carousels.json');
const menus = ['Audio', 'Capture', 'Computers', 'Smart Tech', 'Home', 'Lifestyle', 'Industry'];

function emptyData() {
  return Object.fromEntries(menus.map(menu => [menu, []]));
}

function readData() {
  try { return { ...emptyData(), ...JSON.parse(fs.readFileSync(dataFile, 'utf8')) }; }
  catch { return emptyData(); }
}

function send(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  response.end(JSON.stringify(payload));
}

http.createServer((request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {});
  if (request.url !== '/api/carousels') return send(response, 404, { error: 'Not found' });
  if (request.method === 'GET') return send(response, 200, readData());
  if (request.method !== 'PUT') return send(response, 405, { error: 'Method not allowed' });

  let body = '';
  request.setEncoding('utf8');
  request.on('data', chunk => {
    body += chunk;
    if (body.length > 15 * 1024 * 1024) request.destroy();
  });
  request.on('end', () => {
    try {
      const incoming = JSON.parse(body);
      const sanitized = Object.fromEntries(menus.map(menu => [menu, Array.isArray(incoming[menu]) ? incoming[menu].map(item => ({ id: String(item.id || ''), image: String(item.image || ''), title: String(item.title || ''), collection: String(item.collection || '') })) : []]));
      fs.mkdirSync(dataDirectory, { recursive: true });
      fs.writeFileSync(dataFile, JSON.stringify(sanitized, null, 2));
      send(response, 200, sanitized);
    } catch { send(response, 400, { error: 'Invalid carousel data' }); }
  });
}).listen(port, '0.0.0.0', () => console.log(`Carousel API listening at http://0.0.0.0:${port}/api/carousels`));
