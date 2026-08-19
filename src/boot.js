// Boot script: start the bot (src/index.js) and a small web server for health checks and Render
require('dotenv').config();

// Start the bot by requiring the existing entrypoint. index.js runs the login flow when required.
try {
  require('./index');
} catch (err) {
  console.error('[boot] Failed to start bot:', err);
}

// Start the lightweight web/health server
const web = require('./web');
web.start().catch(err => {
  console.error('[boot] Web server failed to start:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.info('[boot] SIGINT received, shutting down...');
  try {
    // allow process to exit cleanly
    process.exit(0);
  } catch (e) {
    process.exit(1);
  }
});
