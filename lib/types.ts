export type CiState = "success" | "failure" | "in_progress" | "queued" | "cancelled" | "unknown";

export interface CiRun {
  state: CiState;
  workflow: string;
  branch: string;
  durationSec: number | null;
  startedAt: string;
  url: string;
}

export interface Language {
  name: string;
  percent: number;
  color: string;
}

export type FileKind = "text" | "image" | "large";

export interface ManifestEntry {
  path: string;
  size: number;
  kind: FileKind;
}

export interface Commit {
  sha: string;
  message: string;
  date: string;
}

export interface ProjectData {
  slug: string;
  syncedAt: string;
  visibility: "public" | "private";
  codePublished: boolean;
  commit: Commit | null;
  languages: Language[];
  ci: CiRun | null;
  readmePath: string | null;
  manifest: ManifestEntry[];
}
