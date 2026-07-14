import Page from "@/src/components/layouts/page";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { api } from "@/src/utils/api";
import { ShieldAlert, Plus, ShieldCheck, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";
import Spinner from "@/src/components/design-system/Spinner/Spinner";

const INCIDENT_TYPES = [
  {
    value: "PAYMENT_API_LATENCY",
    name: "Payment API Latency Spike",
    description: "Simulate a Stripe gateway socket timeout causing connection pool starvation.",
  },
  {
    value: "K8S_CRASHLOOP",
    name: "Kubernetes CrashLoopBackOff",
    description: "Simulate a worker-service container crashing due to Node.js heap OOM.",
  },
  {
    value: "REDIS_OUTAGE",
    name: "Redis Outage on Port 6380",
    description: "Simulate persistent volume mount locks causing container connection refused errors.",
  },
  {
    value: "LLM_HALLUCINATION",
    name: "LLM Hallucination Spike",
    description: "Simulate a prompt regression where safety instructions were deleted.",
  },
  {
    value: "DB_CONNECTION_FAIL",
    name: "Database Connection Timeouts",
    description: "Simulate Postgres connection pool exhaustion due to Prisma client leaks.",
  },
];

export default function InvestigationsDashboard() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("PAYMENT_API_LATENCY");

  const utils = api.useUtils();
  const { data: investigations, isLoading } = api.investigations.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const createMutation = api.investigations.create.useMutation({
    onSuccess: (data) => {
      setIsDialogOpen(false);
      utils.investigations.list.invalidate();
      router.push(`/project/${projectId}/investigations/${data.id}`);
    },
  });

  const handleStartSimulatedIncident = () => {
    const template = INCIDENT_TYPES.find((t) => t.value === selectedTemplate);
    if (!template) return;
    createMutation.mutate({
      projectId,
      title: `Simulated Incident: ${template.name}`,
      template: selectedTemplate as any,
    });
  };

  if (isLoading || !projectId) {
    return (
      <Page headerProps={{ title: "Production Investigations" }}>
        <div className="flex h-full items-center justify-center py-20">
          <Spinner size="xl" variant="muted" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      headerProps={{
        title: "Production Investigations",
        breadcrumb: [{ name: "Dashboard" }, { name: "Investigations" }],
      }}
    >
      <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
        {/* Banner header */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-sm">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-indigo-400" />
              <h2 className="text-xl font-semibold text-slate-100">Production Investigations</h2>
              <span className="bg-indigo-950 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full border border-indigo-800">Beta</span>
            </div>
            <p className="text-slate-400 text-sm max-w-xl">
              AI Incident Investigation Agent. Automatically collect trace metrics, Loki logs, deployments, and source files to run root-cause analysis and code generation.
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-slate-100 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Simulate Incident</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border border-slate-800 text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-slate-100">Simulate Production Incident</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Select a template to trigger a mock production incident. The AI Agent will walk through context collection, git diagnostics, and root-cause analysis.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400">INCIDENT TYPE</label>
                  <select
                    className="bg-slate-900 border border-slate-800 p-2.5 rounded-md text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-md text-sm text-slate-400">
                  {INCIDENT_TYPES.find((t) => t.value === selectedTemplate)?.description}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400">
                  Cancel
                </Button>
                <Button
                  onClick={handleStartSimulatedIncident}
                  disabled={createMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-slate-100"
                >
                  {createMutation.isPending ? "Starting..." : "Start Investigation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* List of active/past investigations */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-400 tracking-wider">ALL INVESTIGATIONS</h3>

          {investigations && investigations.length > 0 ? (
            <div className="flex flex-col gap-3">
              {investigations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-5 flex justify-between items-center hover:border-slate-800 transition-all cursor-pointer group"
                  onClick={() => router.push(`/project/${projectId}/investigations/${inv.id}`)}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${
                        inv.severity === "CRITICAL"
                          ? "bg-rose-950/60 text-rose-400 border-rose-800"
                          : inv.severity === "HIGH"
                          ? "bg-amber-950/60 text-amber-400 border-amber-800"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}>
                        {inv.severity}
                      </span>
                      <h4 className="text-base font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">
                        {inv.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>ID: {inv.id}</span>
                      <span>•</span>
                      <span>Triggered {new Date(inv.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        {inv.status === "RUNNING" && (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                            <span className="text-xs text-indigo-400 font-medium">RUNNING</span>
                          </>
                        )}
                        {inv.status === "COMPLETED" && (
                          <>
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">COMPLETED</span>
                          </>
                        )}
                        {inv.status === "FAILED" && (
                          <>
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                            <span className="text-xs text-rose-500 font-medium">FAILED</span>
                          </>
                        )}
                      </div>
                      
                      {inv.status === "COMPLETED" && (
                        <span className="text-xs text-slate-400">
                          AI Confidence: <strong className="text-slate-200 font-semibold">{inv.confidence}%</strong>
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-950 border border-slate-800 rounded-lg text-center p-6">
              <ShieldAlert className="h-12 w-12 text-slate-600 mb-4" />
              <h4 className="text-base font-semibold text-slate-300">No active incidents detected</h4>
              <p className="text-slate-500 text-sm max-w-sm mt-1 mb-6">
                Create a simulated production incident to watch the multi-agent AI reasoning pipelines and root-cause fix generators in action.
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-slate-100 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Simulate Incident</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
