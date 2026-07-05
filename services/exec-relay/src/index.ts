import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';

const PISTON_URL = process.env.PISTON_URL || 'http://piston:2000';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = Fastify({ logger: true });

await app.register(rateLimit, {
  global: true,
  max: 30,
  timeWindow: '1 minute',
  keyGenerator: (req) => (req.headers['x-install-id'] as string) || req.ip,
  errorResponseBuilder: () => ({ error: 'Rate limit exceeded. Try again later.' })
});

const activeRuns = new Set<string>();

app.post('/run', async (request, reply) => {
  const installId = request.headers['x-install-id'] as string;
  if (!installId) {
    return reply.code(400).send({ error: 'Missing X-Install-Id header' });
  }

  if (activeRuns.has(installId)) {
    return reply.code(429).send({ error: 'A run is already in progress for this session.' });
  }

  const { code, stdin } = request.body as { code: string; stdin: string };

  if (!code) {
    return reply.code(400).send({ error: 'Missing code payload' });
  }

  activeRuns.add(installId);

  try {
    const pistonResponse = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'c++',
        version: '10.2.0',
        files: [{ name: 'main.cpp', content: code }],
        stdin: stdin,
        compile_timeout: 10000,
        run_timeout: 5000,
        compile_memory_limit: -1,
        run_memory_limit: 268435456
      })
    });

    if (!pistonResponse.ok) {
      const errText = await pistonResponse.text();
      request.log.error(`Piston error: ${errText}`);
      return reply.code(502).send({ error: 'Execution engine failed', details: errText });
    }

    const result = await pistonResponse.json() as any;
    
    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    let wallTime = 0;
    let peakMemory = null;

    if (result.compile && result.compile.code !== 0) {
      stdout = result.compile.output;
      stderr = result.compile.stderr;
      exitCode = result.compile.code;
      wallTime = result.compile.time;
    } else if (result.run) {
      stdout = result.run.output;
      stderr = result.run.stderr;
      exitCode = result.run.code;
      wallTime = result.run.time;
      peakMemory = result.run.memory;
    }

    return {
      stdout,
      stderr,
      exitCode,
      wallTime: parseFloat(wallTime),
      peakMemory
    };

  } catch (err: any) {
    request.log.error(err, 'Execution relay failed');
    return reply.code(500).send({ error: 'Internal relay error' });
  } finally {
    activeRuns.delete(installId);
  }
});

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Execution Relay listening on ${address}`);
});
