// ============================================================
// AI Relay CLI — Local HTTP Server
// ============================================================

import * as http from 'http';
import type { LocalProfile } from './profile';

export interface LocalServer {
  port: number;
  stop(): Promise<void>;
}

export interface ConfigSnapshot {
  providers: Record<string, any>;
  keys: Record<string, string[]>;
  modelAliases: Record<string, string>;
  priorityRules: any[];
}

export async function startLocalServer(profile: LocalProfile): Promise<LocalServer> {
  let configVersion = 0;
  let config: ConfigSnapshot | null = null;

  // Config sync loop
  const configSyncInterval = setInterval(async () => {
    try {
      const versionRes = await fetch(`${profile.cloudUrl}/api/local/config/version`, {
        headers: { Authorization: `Bearer ${profile.deviceToken}` },
      });
      const { version } = await versionRes.json();

      if (version > configVersion) {
        const snapshotRes = await fetch(`${profile.cloudUrl}/api/local/config/snapshot`, {
          headers: { Authorization: `Bearer ${profile.deviceToken}` },
        });
        config = await snapshotRes.json();
        configVersion = version;
        console.log(`✅ Config synced (v${version})`);
      }
    } catch (err) {
      console.error('❌ Config sync failed:', (err as Error).message);
    }
  }, 30_000);

  // Heartbeat loop
  const heartbeatInterval = setInterval(async () => {
    try {
      await fetch(`${profile.cloudUrl}/api/local/usage/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${profile.deviceToken}`,
        },
        body: JSON.stringify({ events: [] }),
      });
    } catch (err) {
      console.error('❌ Heartbeat failed:', (err as Error).message);
    }
  }, 60_000);

  // Initial config fetch
  try {
    const versionRes = await fetch(`${profile.cloudUrl}/api/local/config/version`, {
      headers: { Authorization: `Bearer ${profile.deviceToken}` },
    });
    const { version } = await versionRes.json();
    const snapshotRes = await fetch(`${profile.cloudUrl}/api/local/config/snapshot`, {
      headers: { Authorization: `Bearer ${profile.deviceToken}` },
    });
    config = await snapshotRes.json();
    configVersion = version;
  } catch (err) {
    console.error('⚠️  Initial config fetch failed, will retry');
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: '2.13.0', config_version: configVersion }));
      return;
    }

    if (url.pathname === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ object: 'list', data: [] }));
      return;
    }

    if (url.pathname === '/v1/chat/completions' || url.pathname === '/v1/messages') {
      // Relay to upstream (simplified - full implementation needs relayRequest)
      res.writeHead(501, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Relay logic not yet wired' }));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  return new Promise((resolve) => {
    server.listen(profile.listenPort, profile.listenHost, () => {
      resolve({
        port: profile.listenPort,
        async stop() {
          clearInterval(configSyncInterval);
          clearInterval(heartbeatInterval);
          return new Promise((resolve) => server.close(() => resolve()));
        },
      });
    });
  });
}
