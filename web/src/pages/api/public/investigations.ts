import { ApiAuthService } from "@/src/features/public-api/server/apiAuth";
import { cors, runMiddleware } from "@/src/features/public-api/server/cors";
import { prisma } from "@langfuse/shared/src/db";
import { redis, traceException } from "@langfuse/shared/src/server";
import { UnauthorizedError, ForbiddenError } from "@langfuse/shared";
import { type NextApiRequest, type NextApiResponse } from "next";
import {
  runInvestigation,
  type IncidentTemplate,
} from "@/src/features/production-investigations/server/runner";
import { z } from "zod";

const CreateInvestigationSchema = z.object({
  title: z.string(),
  template: z.enum([
    "PAYMENT_API_LATENCY",
    "K8S_CRASHLOOP",
    "REDIS_OUTAGE",
    "LLM_HALLUCINATION",
    "DB_CONNECTION_FAIL",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await runMiddleware(req, res, cors);

  try {
    // 1. Auth check
    const authCheck = await new ApiAuthService(
      prisma,
      redis,
    ).verifyAuthHeaderAndReturnScope(req.headers.authorization);

    if (!authCheck.validKey) throw new UnauthorizedError(authCheck.error);
    if (
      authCheck.scope.accessLevel !== "project" ||
      !authCheck.scope.projectId
    ) {
      throw new ForbiddenError(
        "Access denied: Bearer auth and org api keys are not allowed to access",
      );
    }

    const projectId = authCheck.scope.projectId;

    // 2. GET Method: List or Get details
    if (req.method === "GET") {
      const { id } = req.query;
      if (id && typeof id === "string") {
        const item = await prisma.investigation.findUnique({
          where: { id, projectId },
          include: {
            steps: { orderBy: { createdAt: "asc" } },
            evidence: { orderBy: { createdAt: "asc" } },
            messages: { orderBy: { createdAt: "asc" } },
          },
        });
        if (!item) {
          return res.status(404).json({ message: "Investigation not found" });
        }
        return res.status(200).json(item);
      }

      const list = await prisma.investigation.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(list);
    }

    // 3. POST Method: Trigger an investigation
    if (req.method === "POST") {
      const body = CreateInvestigationSchema.parse(req.body);

      const investigation = await prisma.investigation.create({
        data: {
          projectId,
          title: body.title,
          status: "RUNNING",
          severity:
            body.severity ??
            (body.template === "K8S_CRASHLOOP"
              ? "CRITICAL"
              : body.template === "PAYMENT_API_LATENCY" ||
                  body.template === "REDIS_OUTAGE" ||
                  body.template === "DB_CONNECTION_FAIL"
                ? "HIGH"
                : "MEDIUM"),
        },
      });

      // Execute reasoning runner in the background
      runInvestigation(
        projectId,
        investigation.id,
        body.template as IncidentTemplate,
      ).catch((err) => {
        console.error(
          "Error executing background investigation from API:",
          err,
        );
      });

      return res.status(201).json(investigation);
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (err: any) {
    traceException(err);
    if (err instanceof UnauthorizedError) {
      return res.status(401).json({ message: err.message });
    }
    if (err instanceof ForbiddenError) {
      return res.status(403).json({ message: err.message });
    }
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid payload parameters", errors: err.errors });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}
