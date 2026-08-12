import { findApplication, publicApp } from "../../../../../lib/applications";

export async function GET(request: Request, context: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await context.params;
  const row = await findApplication(applicationId.toUpperCase());
  if (!row) return Response.json({ error: "Application not found. Check both IDs and try again." }, { status: 404 });
  const reference = new URL(request.url).searchParams.get("reference");
  if (reference && row.reference_id !== reference.toUpperCase()) return Response.json({ error: "Application not found. Check both IDs and try again." }, { status: 404 });
  return Response.json(publicApp(row));
}
