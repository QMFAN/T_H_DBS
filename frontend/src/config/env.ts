interface AppConfig {
  apiBaseUrl: string;
  importsBaseUrl: string;
}

const stripTrailingSlash = (value: string): string => value.replace(/\/$/, '');

const resolveApiBase = (): string => {
  return '/api';
};

const resolveImportsBase = (apiBaseUrl: string): string => {
  const raw = import.meta.env.VITE_IMPORTS_BASE_URL;

  const toAbsolute = (value: string): string => {
    if (/^https?:\/\//i.test(value)) {
      return stripTrailingSlash(value);
    }

    try {
      const apiUrl = new URL(apiBaseUrl);
      if (value.startsWith('/')) {
        return stripTrailingSlash(`${apiUrl.origin}${value}`);
      }
      return stripTrailingSlash(new URL(value, apiUrl.origin).toString());
    } catch (error) {
      return stripTrailingSlash(value);
    }
  };

  if (raw && raw.trim()) {
    return toAbsolute(raw.trim());
  }

  try {
    const apiUrl = new URL(apiBaseUrl);
    return `${apiUrl.origin}/imports`;
  } catch (error) {
    return 'http://localhost:3005/imports';
  }
};

const apiBaseUrl = resolveApiBase();
const importsBaseUrl = resolveImportsBase(apiBaseUrl);

const config: AppConfig = {
  apiBaseUrl,
  importsBaseUrl,
};

export default config;
