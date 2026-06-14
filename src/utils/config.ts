import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { config as loadDotenv } from 'dotenv';

/**
 * Config stored at ~/.zernio/config.json.
 * Env vars ZERNIO_API_KEY and ZERNIO_API_URL take precedence over file values.
 * Legacy env vars LATE_API_KEY / LATE_API_URL and ~/.late/config.json are still
 * supported as fallbacks for backwards compatibility.
 */
export interface ZernioConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface ResolvedConfig {
  config: ZernioConfig;
  sources: {
    apiKey?: string;
    baseUrl?: string;
  };
}

const CONFIG_DIR = join(homedir(), '.zernio');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/** Legacy config path for backwards compatibility */
const LEGACY_CONFIG_FILE = join(homedir(), '.late', 'config.json');

let dotenvLoaded = false;

function loadDotenvFiles(): void {
  if (dotenvLoaded) return;
  dotenvLoaded = true;

  if (process.env.ZERNIO_CLI_LOAD_ENV !== '1') return;

  const fileNames = process.env.ZERNIO_CLI_ENV_FILE
    ? [process.env.ZERNIO_CLI_ENV_FILE]
    : ['.env.local', `.env.${process.env.NODE_ENV || 'development'}`, '.env'];

  for (const fileName of fileNames) {
    if (existsSync(fileName)) loadDotenv({ path: fileName, override: false, quiet: true });
  }
}

/** Read config from a JSON file. Returns empty object if file doesn't exist. */
function readJsonConfig(filePath: string): ZernioConfig {
  try {
    if (!existsSync(filePath)) return {};
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ZernioConfig;
  } catch {
    return {};
  }
}

/**
 * Read config from disk. Checks ~/.zernio/config.json first,
 * falls back to ~/.late/config.json for backwards compatibility.
 */
function readConfigFile(): ZernioConfig {
  const config = readJsonConfig(CONFIG_FILE);
  if (config.apiKey) return config;

  // Fallback to legacy config
  return readJsonConfig(LEGACY_CONFIG_FILE);
}

/** Write config to disk, merging with existing values. */
export function writeConfig(updates: Partial<ZernioConfig>): void {
  const existing = readJsonConfig(CONFIG_FILE);
  const merged = { ...existing, ...updates };

  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  } else {
    chmodSync(CONFIG_DIR, 0o700);
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + '\n', { encoding: 'utf-8', mode: 0o600 });
  chmodSync(CONFIG_FILE, 0o600);
}

/**
 * Get resolved config. Env vars override file values.
 * Priority: ZERNIO_* env var > LATE_* env var (legacy) > config file > default.
 */
export function getConfig(): ZernioConfig {
  return resolveConfig().config;
}

export function resolveConfig(): ResolvedConfig {
  loadDotenvFiles();
  const file = readConfigFile();
  const apiKey =
    process.env.ZERNIO_API_KEY ||
    process.env.LATE_API_KEY ||
    file.apiKey;
  const baseUrl =
    process.env.ZERNIO_API_URL ||
    process.env.LATE_API_URL ||
    file.baseUrl;

  return {
    config: {
      apiKey,
      baseUrl,
    },
    sources: {
      apiKey: process.env.ZERNIO_API_KEY
        ? 'env:ZERNIO_API_KEY'
        : process.env.LATE_API_KEY
          ? 'env:LATE_API_KEY'
          : file.apiKey
            ? 'config-file'
            : undefined,
      baseUrl: process.env.ZERNIO_API_URL
        ? 'env:ZERNIO_API_URL'
        : process.env.LATE_API_URL
          ? 'env:LATE_API_URL'
          : file.baseUrl
            ? 'config-file'
            : undefined,
    },
  };
}

/** Get API key or exit with error. */
export function requireApiKey(): string {
  const { apiKey } = getConfig();
  if (!apiKey) {
    console.error(JSON.stringify({
      ok: false,
      error: true,
      message: 'No API key configured. Run "zernio auth:set" or set ZERNIO_API_KEY env var.',
    }));
    process.exit(1);
  }
  return apiKey;
}
