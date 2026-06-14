import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('CLI smoke', () => {
  it('prints help', () => {
    execFileSync('npm', ['run', 'build'], { stdio: 'ignore' });
    const output = execFileSync('node', ['dist/index.js', '--help'], { encoding: 'utf8' });

    expect(output).toContain('api:catalog');
    expect(output).toContain('doctor');
  }, 30000);

  it('describes an endpoint', () => {
    execFileSync('npm', ['run', 'build'], { stdio: 'ignore' });
    const output = execFileSync('node', ['dist/index.js', 'api:describe', 'listPosts'], {
      encoding: 'utf8',
    });

    expect(JSON.parse(output)).toMatchObject({
      operationId: 'listPosts',
      method: 'GET',
      path: '/v1/posts',
    });
  }, 30000);

  it('exits non-zero when doctor connection fails', () => {
    execFileSync('npm', ['run', 'build'], { stdio: 'ignore' });

    try {
      execFileSync('node', ['dist/index.js', 'doctor', '--connection'], {
        encoding: 'utf8',
        env: {
          ...process.env,
          ZERNIO_API_KEY: 'invalid_for_review',
          ZERNIO_CLI_LOAD_ENV: '0',
        },
      });
      throw new Error('Expected doctor --connection to fail');
    } catch (err) {
      const error = err as { status?: number; stdout?: string };
      expect(error.status).toBe(1);
      expect(JSON.parse(error.stdout || '{}')).toMatchObject({
        connection: {
          ok: false,
          status: 401,
        },
      });
    }
  }, 30000);
});
