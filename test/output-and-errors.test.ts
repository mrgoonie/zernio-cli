import { afterEach, describe, expect, it, vi } from 'vitest';
import { LateApiError } from '@zernio/node';
import { handleError } from '../src/utils/errors.js';
import { output, outputError, outputWarning } from '../src/utils/output.js';

class ExitSignal extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super('process.exit');
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('output helpers', () => {
  it('prints compact and pretty JSON', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    output({ ok: true });
    output({ ok: true }, true);

    expect(log.mock.calls[0][0]).toBe('{"ok":true}');
    expect(log.mock.calls[1][0]).toContain('\n  "ok": true\n');
  });

  it('prints warnings to stderr', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    outputWarning('careful');

    expect(write).toHaveBeenCalledWith('careful\n');
  });

  it('prints structured errors and exits', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new ExitSignal(code);
    }) as typeof process.exit);

    expect(() => outputError('bad request', 400, { code: 'BAD' }, true)).toThrow(ExitSignal);
    expect(JSON.parse(String(error.mock.calls[0][0]))).toEqual({
      ok: false,
      error: true,
      message: 'bad request',
      code: 'BAD',
      status: 400,
    });
  });

  it('handles generic errors as structured output', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new ExitSignal(code);
    }) as typeof process.exit);

    expect(() => handleError(new Error('network down'))).toThrow(ExitSignal);
    expect(JSON.parse(String(error.mock.calls[0][0]))).toMatchObject({
      ok: false,
      error: true,
      message: 'network down',
    });
  });

  it('preserves status codes from Zernio API errors', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new ExitSignal(code);
    }) as typeof process.exit);

    expect(() => handleError(new LateApiError('rate limited', 429))).toThrow(ExitSignal);
    expect(JSON.parse(String(error.mock.calls[0][0]))).toMatchObject({
      ok: false,
      error: true,
      message: 'rate limited',
      status: 429,
    });
  });
});
