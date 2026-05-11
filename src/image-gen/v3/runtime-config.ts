type EnvironmentSource = Record<string, unknown>;

export type IonImageProviderKind = 'ion-native' | 'ion' | 'cloudflare-ai';

export interface IonImageV3RuntimeConfig {
  enabled: boolean;
  primaryProvider: IonImageProviderKind;
  fallbackProvider: IonImageProviderKind | null;
  fallbackOnIonDown: boolean;
  fallbackOnTimeout: boolean;
  fallbackModel: string;
}

function readText(source: EnvironmentSource, key: string, fallback: string): string {
  const value = String(source[key] ?? '').trim();
  return value || fallback;
}

function readBoolean(source: EnvironmentSource, key: string, fallback: boolean): boolean {
  const value = String(source[key] ?? '').trim().toLowerCase();
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value);
}

function readProviderKind(
  source: EnvironmentSource,
  key: string,
  fallback: IonImageProviderKind,
): IonImageProviderKind {
  const value = String(source[key] ?? '').trim().toLowerCase();
  if (value === 'ion-native' || value === 'ion' || value === 'cloudflare-ai') {
    return value;
  }

  return fallback;
}

function readOptionalProviderKind(source: EnvironmentSource, key: string): IonImageProviderKind | null {
  const value = String(source[key] ?? '').trim().toLowerCase();
  if (!value || value === 'none' || value === 'off') {
    return null;
  }

  if (value === 'ion-native' || value === 'ion' || value === 'cloudflare-ai') {
    return value;
  }

  return null;
}

function getDefaultSource(): EnvironmentSource {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as EnvironmentSource;
  }

  return {};
}

export function readIonImageV3RuntimeConfig(source: EnvironmentSource = getDefaultSource()): IonImageV3RuntimeConfig {
  const enabled = readBoolean(source, 'ION_IMAGE_PIPELINE_V3', true);
  const primaryProvider = readProviderKind(source, 'ION_IMAGE_PROVIDER_PRIMARY', 'cloudflare-ai');
  const fallbackProvider = readOptionalProviderKind(source, 'ION_IMAGE_PROVIDER_FALLBACK') ?? 'ion-native';

  return {
    enabled,
    primaryProvider,
    fallbackProvider,
    fallbackOnIonDown: readBoolean(source, 'ION_IMAGE_FALLBACK_ON_ion_DOWN', true),
    fallbackOnTimeout: readBoolean(source, 'ION_IMAGE_FALLBACK_ON_TIMEOUT', true),
    fallbackModel: readText(source, 'ION_IMAGE_FALLBACK_MODEL', '@cf/stabilityai/stable-diffusion-xl-base-1.0'),
  };
}
