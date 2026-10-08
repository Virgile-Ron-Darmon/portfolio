import { getAllProjects } from "@/lib/projects";
import { syncProject } from "@/lib/sync";
import { PORTFOLIO_HOME, isMock } from "@/lib/paths";

async function main() {
  const projects = getAllProjects();
  console.log(`sync: ${projects.length} projects, mode=${isMock ? "mock" : "live"}, home=${PORTFOLIO_HOME}`);

  let failed = 0;
  for (const project of projects) {
    const started = Date.now();
    try {
      const { data, warnings } = await syncProject(project);
      const sha = data.commit?.sha.slice(0, 7) ?? "-------";
      const ci = data.ci?.state ?? "no runs";
      console.log(`  ok   ${project.slug.padEnd(20)} ${sha}  ci=${ci}  files=${data.manifest.length}  ${Date.now() - started}ms`);
      for (const w of warnings) console.warn(`  warn ${project.slug}: ${w}`);
    } catch (err) {
      failed++;
      console.error(`  fail ${project.slug}: ${(err as Error).message}`);
    }
  }
  if (failed) process.exit(1);
}

main();
