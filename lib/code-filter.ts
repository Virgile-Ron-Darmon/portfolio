import picomatch from "picomatch";

/** Never published, whatever a project's config says. */
export const GLOBAL_DENY = [
  ".git/**",
  "**/.env",
  "**/.env.*",
  "**/*.pem",
  "**/*.key",
  "**/*.p12",
  "**/id_rsa*",
  "**/id_ed25519*",
  "**/*.tfstate",
  "**/*.tfstate.*",
  "**/.terraform/**",
  "**/secrets/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/vendor/**",
];

export const TEXT_SIZE_CAP = 1024 * 1024; // larger text files are listed but not displayed
export const IMAGE_SIZE_CAP = 5 * 1024 * 1024;

export const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export function createFilter(projectExcludes: string[]) {
  const isDenied = picomatch([...GLOBAL_DENY, ...projectExcludes], { dot: true });
  return (relPath: string) => !isDenied(relPath);
}
