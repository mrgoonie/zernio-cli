import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/commands/api.ts',
        'src/commands/doctor.ts',
        'src/commands/platforms.ts',
        'src/utils/api-request.ts',
        'src/utils/argument-parsing.ts',
        'src/utils/config.ts',
        'src/utils/errors.ts',
        'src/utils/openapi-catalog.ts',
        'src/utils/output.ts',
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
