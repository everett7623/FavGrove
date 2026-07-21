import { request } from 'node:http';
import { createServer } from 'vite';

function requestServer(port, headers) {
  return new Promise((resolve, reject) => {
    const clientRequest = request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/',
        headers
      },
      (response) => {
        response.resume();
        response.on('end', () => resolve({ headers: response.headers, statusCode: response.statusCode }));
      }
    );
    clientRequest.on('error', reject);
    clientRequest.end();
  });
}

const server = await createServer({
  logLevel: 'silent',
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { host: '127.0.0.1', port: 0 }
});
let exitCode = 0;
try {
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Unable to read the Vite test server address.');

  const rejectedOrigin = await requestServer(address.port, {
    Host: `127.0.0.1:${address.port}`,
    Origin: 'https://untrusted.example'
  });
  if (rejectedOrigin.headers['access-control-allow-origin']) throw new Error('Untrusted Origin received CORS access.');

  const extensionOrigin = 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const allowedOrigin = await requestServer(address.port, {
    Host: `127.0.0.1:${address.port}`,
    Origin: extensionOrigin
  });
  if (allowedOrigin.headers['access-control-allow-origin'] !== extensionOrigin) {
    throw new Error('Chrome extension Origin was not allowed.');
  }

  const rejectedHost = await requestServer(address.port, {
    Host: 'untrusted.example',
    Origin: extensionOrigin
  });
  if (rejectedHost.statusCode !== 403) throw new Error(`Untrusted Host received status ${rejectedHost.statusCode}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  exitCode = 1;
} finally {
  await Promise.race([
    server.close().catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 500))
  ]);
}

process.exit(exitCode);
