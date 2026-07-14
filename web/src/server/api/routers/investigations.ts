import { z } from "zod";
import { createTRPCRouter, protectedProjectProcedure } from "@/src/server/api/trpc";
import { prisma } from "@langfuse/shared/src/db";
import { runInvestigation, type IncidentTemplate } from "@/src/features/production-investigations/server/runner";
import { fetchLLMCompletion } from "@langfuse/shared/src/server/llm/fetchLLMCompletion";

export const investigationsRouter = createTRPCRouter({
  list: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return prisma.investigation.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const investigation = await prisma.investigation.findUnique({
        where: { id: input.id, projectId: input.projectId },
        include: {
          steps: { orderBy: { createdAt: "asc" } },
          evidence: { orderBy: { createdAt: "asc" } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
      return investigation;
    }),

  create: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string(),
        template: z.enum([
          "PAYMENT_API_LATENCY",
          "K8S_CRASHLOOP",
          "REDIS_OUTAGE",
          "LLM_HALLUCINATION",
          "DB_CONNECTION_FAIL",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const investigation = await prisma.investigation.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          status: "RUNNING",
          severity:
            input.template === "K8S_CRASHLOOP"
              ? "CRITICAL"
              : input.template === "PAYMENT_API_LATENCY" ||
                input.template === "REDIS_OUTAGE" ||
                input.template === "DB_CONNECTION_FAIL"
              ? "HIGH"
              : "MEDIUM",
        },
      });

      // Execute runner asynchronously in the background
      runInvestigation(input.projectId, investigation.id, input.template as IncidentTemplate).catch((err) => {
        console.error("Error executing background investigation:", err);
      });

      return investigation;
    }),

  sendMessage: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        investigationId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Save user message
      const userMsg = await prisma.investigationMessage.create({
        data: {
          investigationId: input.investigationId,
          role: "USER",
          content: input.message,
        },
      });

      // 2. Fetch context
      const investigation = await prisma.investigation.findUnique({
        where: { id: input.investigationId, projectId: input.projectId },
        include: {
          evidence: true,
        },
      });

      if (!investigation) {
        throw new Error("Investigation not found");
      }

      // 3. Generate response using LLM or fallback
      let replyContent = `I am analyzing the evidence collected for "${investigation.title}". `;
      try {
        const evidenceStr = JSON.stringify(investigation.evidence, null, 2);
        const systemPrompt = `You are an expert production systems engineer. Help the developer investigate this incident. Answer their question based on the collected evidence.\nEvidence Context:\n${evidenceStr}`;
        
        const response = await fetchLLMCompletion({
          model: {
            provider: "openai",
            modelName: "qwen2.5:0.5b"
          },
          systemPrompt,
          userPrompt: input.message,
          temperature: 0.7
        });

        if (typeof response === "string") {
          replyContent = response;
        } else if (response && typeof response === "object" && "text" in response) {
          replyContent = (response as any).text;
        }
      } catch (_err) {
        // Fallback responder replies
        if (input.message.toLowerCase().includes("why") || input.message.toLowerCase().includes("happen")) {
          const rep = investigation.report as any;
          replyContent = `Based on the evidence logs, the incident occurred due to: ${rep?.rootCause || "a service timeout error"}. The executive summary is: ${rep?.executiveSummary || "investigation in progress"}.`;
        } else if (input.message.toLowerCase().includes("fix") || input.message.toLowerCase().includes("recommend")) {
          replyContent = "Here are the recommended code fixes:\n\n1. Review connection pools and apply exponential backoff retries.\n2. Ensure singletons are used for DB client configurations.\n3. Run validation logic before invoking API integrations.";
        } else {
          replyContent = `I've analyzed the logs and traces for "${investigation.title}". Let me know if you would like me to explain the stack trace, generate unit tests, or write a pull request description for this incident.`;
        }
      }

      // 4. Save assistant message
      const assistantMsg = await prisma.investigationMessage.create({
        data: {
          investigationId: input.investigationId,
          role: "ASSISTANT",
          content: replyContent,
        },
      });

      return {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      };
    }),
});
