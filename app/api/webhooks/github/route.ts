import { after, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { verifySignature } from "@/lib/webhook";
import { getProjectByRepo } from "@/lib/projects";
import { refreshCi, syncProject } from "@/lib/sync";
import { projectTag } from "@/lib/data";

export const runtime = "nodejs";

interface Payload {
  ref?: string;
  action?: string;
  repository?: { full_name: string; default_branch: string };
}

const invalidate = (slug: string) => {
  revalidateTag(projectTag(slug), { expire: 0 });
  revalidateTag("projects", { expire: 0 });
};

export async function POST(req: Request) {
  const body = await req.text();
  if (!verifySignature(body, req.headers.get("x-hub-signature-256"), process.env.GITHUB_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body) as Payload;
  if (event === "ping") return NextResponse.json({ ok: true });

  const repo = payload.repository;
  const project = repo ? getProjectByRepo(repo.full_name) : undefined;
  if (!repo || !project) return NextResponse.json({ ignored: "unknown repository" }, { status: 202 });

  if (event === "push" && payload.ref === `refs/heads/${repo.default_branch}`) {
    after(async () => {
      await syncProject(project);
      invalidate(project.slug);
    });
    return NextResponse.json({ accepted: "sync", project: project.slug }, { status: 202 });
  }

  if (event === "workflow_run" && payload.action === "completed") {
    after(async () => {
      await refreshCi(project);
      invalidate(project.slug);
    });
    return NextResponse.json({ accepted: "ci", project: project.slug }, { status: 202 });
  }

  return NextResponse.json({ ignored: event }, { status: 202 });
}
