// ============================================================
// AI Relay CLI — Local Commands
// ============================================================

import { loadProfile } from './profile.js';
import { startLocalServer } from './server.js';

export async function startCommand() {
  const profile = await loadProfile();

  if (!profile) {
    console.error('❌ Not logged in. Run "ai-relay login <cloud-url>" first.');
    process.exit(1);
  }

  console.log('🚀 Starting AI Relay Local Server...\n');
  console.log(`   Device: ${profile.deviceName}`);
  console.log(`   Cloud: ${profile.cloudUrl}`);
  console.log(`   Listen: http://${profile.listenHost}:${profile.listenPort}\n`);

  const server = await startLocalServer(profile);

  console.log('✅ Server started!\n');
  console.log(`   Health: http://${profile.listenHost}:${server.port}/health`);
  console.log(`   Endpoint: http://${profile.listenHost}:${server.port}/v1`);
  console.log('\n🔄 Syncing config every 30s, heartbeat every 60s');
  console.log('   Press Ctrl+C to stop\n');

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Stopping server...');
    await server.stop();
    console.log('✅ Server stopped');
    process.exit(0);
  });
}
