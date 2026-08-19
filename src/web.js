const express = require('express');
const cors = require('cors');
const pkg = require('../package.json');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`<html><head><meta charset="utf-8"><title>Friendbase</title></head><body><h1>Friendbase Bot</h1><p>Version ${pkg.version}</p><p>Visit <a href="/health">/health</a> for status.</p></body></html>`);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

module.exports.start = function start() {
  return new Promise((resolve, reject) => {
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`[web] Listening on ${port}`);
      resolve(server);
    });
    server.on('error', (err) => reject(err));
  });
};
