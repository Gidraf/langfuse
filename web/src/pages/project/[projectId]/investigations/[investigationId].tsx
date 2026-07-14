import Page from "@/src/components/layouts/page";
import { Button } from "@/src/components/ui/button";
import { api } from "@/src/utils/api";
import { useRouter } from "next/router";
import { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Clock,
  Layers,
  Database,
  GitBranch,
  Terminal,
  Send,
  CheckCircle,
  Copy,
  AlertCircle,
  FileText,
  GitPullRequest,
} from "lucide-react";
import Spinner from "@/src/components/design-system/Spinner/Spinner";
import { toast } from "sonner";

export default function InvestigationDetailPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const id = router.query.investigationId as string;

  const [activeTab, setActiveTab] = useState<
    "summary" | "timeline" | "evidence" | "similar" | "chat"
  >("summary");
  const [evidenceSubTab, setEvidenceSubTab] = useState<string>("LOG");
  const [chatMessage, setChatMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch investigation details, poll every 2s while in progress
  const { data: investigation, refetch } = api.investigations.get.useQuery(
    { projectId, id },
    {
      enabled: !!projectId && !!id,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "DETECTED" || status === "RUNNING" ? 2000 : false;
      },
    },
  );

  const sendMessageMutation = api.investigations.sendMessage.useMutation({
    onSuccess: () => {
      setChatMessage("");
      refetch();
    },
  });

  const handleSendMessage = (textToSend?: string) => {
    const msg = textToSend || chatMessage;
    if (!msg.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({
      projectId,
      investigationId: id,
      message: msg,
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [investigation?.messages]);

  if (!investigation) {
    return (
      <Page headerProps={{ title: "Investigation Report" }}>
        <div className="flex h-full items-center justify-center py-20">
          <Spinner size="xl" variant="muted" />
        </div>
      </Page>
    );
  }

  const report = investigation.report as any;

  return (
    <Page
      headerProps={{
        title: investigation.title,
        breadcrumb: [
          { name: "Dashboard" },
          {
            name: "Investigations",
            url: `/project/${projectId}/investigations`,
          },
          { name: investigation.title },
        ],
      }}
    >
      <div className="mx-auto flex h-[calc(100vh-140px)] max-w-7xl flex-col gap-6 p-6 lg:flex-row">
        {/* Main Content Pane */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
          {/* Header Card */}
          <div className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-950 p-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                    investigation.severity === "CRITICAL"
                      ? "border-rose-800 bg-rose-950/60 text-rose-400"
                      : investigation.severity === "HIGH"
                        ? "border-amber-800 bg-amber-950/60 text-amber-400"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  {investigation.severity}
                </span>
                <h2 className="text-lg font-bold text-slate-100">
                  {investigation.title}
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Incident Triggered:{" "}
                {new Date(investigation.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5">
              {investigation.status === "RUNNING" && (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-400">
                    ANALYSIS IN PROGRESS
                  </span>
                </>
              )}
              {investigation.status === "COMPLETED" && (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">
                    COMPLETED
                  </span>
                </>
              )}
              {investigation.status === "FAILED" && (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  <span className="text-xs font-semibold text-rose-500">
                    ANALYSIS FAILED
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-slate-800">
            {[
              { id: "summary", label: "Summary & Report", icon: FileText },
              { id: "timeline", label: "Timeline & Reasoning", icon: Clock },
              { id: "evidence", label: "Collected Evidence", icon: Database },
              { id: "similar", label: "Similar Incidents", icon: Layers },
              { id: "chat", label: "AI Investigation Chat", icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-slate-200"
                      : "border-transparent text-slate-500 hover:border-slate-800 hover:text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex flex-1 flex-col gap-4">
            {/* 1. Summary & Report Tab */}
            {activeTab === "summary" && (
              <div className="flex flex-col gap-5">
                {investigation.status !== "COMPLETED" ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-10 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
                    <h3 className="font-semibold text-slate-200">
                      AI Agent is generating report...
                    </h3>
                    <p className="max-w-sm text-xs text-slate-400">
                      We are running Git diff scanning and tracing correlation
                      to build your root-cause analysis report.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Executive Summary Card */}
                    <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 p-5">
                      <h3 className="text-sm font-semibold text-indigo-400">
                        EXECUTIVE SUMMARY
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-300">
                        {report?.executiveSummary}
                      </p>
                    </div>

                    {/* Stats Metric Panel */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950 p-4">
                        <span className="text-xs font-semibold text-slate-500">
                          AFFECTED USERS
                        </span>
                        <span className="text-lg font-bold text-slate-200">
                          {report?.impact?.affectedUsers} Users
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950 p-4">
                        <span className="text-xs font-semibold text-slate-500">
                          FAILURE RATE
                        </span>
                        <span className="text-lg font-bold text-slate-200">
                          {report?.impact?.failureRate}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950 p-4">
                        <span className="text-xs font-semibold text-slate-500">
                          LATENCY CHANGE
                        </span>
                        <span className="text-lg font-bold text-rose-400">
                          {report?.impact?.latencyIncrease}
                        </span>
                      </div>
                    </div>

                    {/* Root Cause Card */}
                    <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950 p-5">
                      <h3 className="text-sm font-semibold text-indigo-400">
                        IDENTIFIED ROOT CAUSE
                      </h3>
                      <div className="flex items-start gap-2.5 rounded-md border border-rose-900/60 bg-rose-950/20 p-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-400" />
                        <span className="font-mono text-sm leading-relaxed text-slate-200">
                          {report?.rootCause}
                        </span>
                      </div>
                    </div>

                    {/* Ranked Recommendations */}
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-semibold text-slate-400">
                        AI RECOMMENDATIONS
                      </h3>
                      {report?.recommendations?.map((rec: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 p-5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                  rec.priority === "Critical"
                                    ? "border border-rose-800 bg-rose-950/60 text-rose-400"
                                    : "border border-indigo-900 bg-indigo-950 text-indigo-300"
                                }`}
                              >
                                {rec.priority}
                              </span>
                              <h4 className="text-sm font-semibold text-slate-200">
                                {rec.title}
                              </h4>
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-400">
                            {rec.description}
                          </p>

                          {rec.codeSuggestion && (
                            <div className="relative overflow-x-auto rounded-md border border-slate-800 bg-slate-900/90 p-3.5 font-mono text-xs text-slate-300">
                              <button
                                onClick={() =>
                                  handleCopyCode(rec.codeSuggestion)
                                }
                                className="absolute top-2 right-2 rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                title="Copy Code"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <pre>{rec.codeSuggestion}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pull Request Draft */}
                    {report?.pullRequest && (
                      <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950 p-5">
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                          <GitPullRequest className="h-5 w-5 text-indigo-400" />
                          <h3 className="text-sm font-semibold text-slate-200">
                            PULL REQUEST DRAFT
                          </h3>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-500">
                            TITLE
                          </span>
                          <div className="rounded border border-slate-800 bg-slate-900 p-2.5 font-mono text-sm text-slate-200">
                            {report.pullRequest.title}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-500">
                            DESCRIPTION
                          </span>
                          <div className="rounded border border-slate-800 bg-slate-900 p-3 text-xs leading-relaxed whitespace-pre-line text-slate-300">
                            {report.pullRequest.description}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-500">
                              TESTING PLAN
                            </span>
                            <div className="rounded border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                              {report.pullRequest.testingPlan}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-500">
                              ROLLBACK PLAN
                            </span>
                            <div className="rounded border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                              {report.pullRequest.rollbackPlan}
                            </div>
                          </div>
                        </div>

                        <Button className="flex items-center gap-2 self-start bg-emerald-600 text-xs text-slate-100 hover:bg-emerald-700">
                          <GitBranch className="h-4 w-4" />
                          <span>Create Pull Request</span>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 2. Timeline & Reasoning Tab */}
            {activeTab === "timeline" && (
              <div className="flex flex-col gap-6">
                {/* Visual Graph/Architecture Section */}
                <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 p-5">
                  <h3 className="text-sm font-semibold text-slate-400">
                    INCIDENT ROOT CAUSE FLOW
                  </h3>
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-slate-800 bg-slate-900/60 p-4 py-3">
                    <div className="flex flex-col items-center gap-1 rounded border border-rose-900 bg-rose-950/20 p-2 text-center">
                      <span className="text-xs font-semibold text-rose-400">
                        ALERT
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Trigger Alert
                      </span>
                    </div>
                    <div className="text-slate-600">→</div>
                    <div className="flex flex-col items-center gap-1 rounded border border-indigo-900 bg-indigo-950/20 p-2 text-center">
                      <span className="text-xs font-semibold text-indigo-400">
                        LOGS / TRACES
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Telemetry Gathered
                      </span>
                    </div>
                    <div className="text-slate-600">→</div>
                    <div className="flex flex-col items-center gap-1 rounded border border-indigo-900 bg-indigo-950/20 p-2 text-center">
                      <span className="text-xs font-semibold text-indigo-400">
                        GIT DIFFS
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Scan code changes
                      </span>
                    </div>
                    <div className="text-slate-600">→</div>
                    <div className="flex flex-col items-center gap-1 rounded border border-amber-900 bg-amber-950/20 p-2 text-center">
                      <span className="text-xs font-semibold text-amber-400">
                        AI AGENT
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Reasoning Engine
                      </span>
                    </div>
                    <div className="text-slate-600">→</div>
                    <div className="flex flex-col items-center gap-1 rounded border border-emerald-900 bg-emerald-950/20 p-2 text-center">
                      <span className="text-xs font-semibold text-emerald-400">
                        ROOT CAUSE
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Actionable Fix
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Steps Timeline */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-slate-400">
                    INVESTIGATION STEPS TIMELINE
                  </h3>
                  <div className="relative ml-3 flex flex-col gap-4 border-l border-slate-800 pl-6">
                    {investigation.steps.map((step) => (
                      <div
                        key={step.id}
                        className="relative flex flex-col gap-1.5"
                      >
                        {/* Bullet point indicator */}
                        <div className="absolute top-1 left-[-31px] rounded-full border border-slate-800 bg-slate-950 p-1">
                          {step.status === "SUCCESS" ? (
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                          ) : step.status === "RUNNING" ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-slate-800" />
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-200">
                            {step.title}
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            {new Date(step.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="rounded border border-slate-800 bg-slate-950/70 p-3 font-mono text-xs leading-relaxed whitespace-pre-line text-slate-400">
                          {step.output}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Collected Evidence Tab */}
            {activeTab === "evidence" && (
              <div className="flex flex-col gap-4">
                <div className="flex gap-2 border-b border-slate-800 pb-2">
                  {["LOG", "TRACE", "COMMIT", "METRIC", "K8S_EVENT"].map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => setEvidenceSubTab(type)}
                        className={`rounded px-3 py-1.5 text-xs font-semibold ${
                          evidenceSubTab === type
                            ? "bg-indigo-600 text-slate-100"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {type}S
                      </button>
                    ),
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {investigation.evidence.filter(
                    (e) => e.type === evidenceSubTab,
                  ).length > 0 ? (
                    investigation.evidence
                      .filter((e) => e.type === evidenceSubTab)
                      .map((ev) => (
                        <div
                          key={ev.id}
                          className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 p-5"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h4 className="text-sm font-semibold text-slate-200">
                              {ev.title}
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              Collected{" "}
                              {new Date(ev.createdAt).toLocaleTimeString()}
                            </span>
                          </div>

                          <pre className="max-h-96 overflow-x-auto rounded bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-300">
                            {JSON.stringify(ev.data, null, 2)}
                          </pre>
                        </div>
                      ))
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-500">
                      No evidence of type {evidenceSubTab} found in this
                      investigation.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Similar Incidents Tab */}
            {activeTab === "similar" && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-400">
                  SEMANTIC INCIDENT MATCHMAKING
                </h3>

                <div className="flex flex-col gap-3">
                  {[
                    {
                      title:
                        "Stripe endpoint timeouts leading to thread blocks",
                      similarity: 92,
                      previousFix:
                        "Reverted Stripe client timeout constraints and restored axios global connection pool sizes.",
                      resolutionTime: "12m",
                      service: "payment-api",
                    },
                    {
                      title: "Node heap limit exceeded in log consumer",
                      similarity: 78,
                      previousFix:
                        "Modified database trace select calls to query in chunk batches of 500.",
                      resolutionTime: "24m",
                      service: "worker-service",
                    },
                  ].map((inc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-5 transition-colors hover:border-slate-800"
                    >
                      <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-medium text-slate-200">
                          {inc.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>
                            Service:{" "}
                            <strong className="text-slate-400">
                              {inc.service}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>Time to Resolve: {inc.resolutionTime}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          Previous Fix Applied:{" "}
                          <span className="font-mono text-indigo-300">
                            {inc.previousFix}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className="rounded border border-indigo-900 bg-indigo-950 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                          {inc.similarity}% SIMILARITY
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Chat Tab (Fallback for mobile screens) */}
            {activeTab === "chat" && (
              <div className="flex h-[500px] flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <ChatPanel
                  messages={investigation.messages}
                  onSendMessage={handleSendMessage}
                  isPending={sendMessageMutation.isPending}
                />
              </div>
            )}
          </div>
        </div>

        {/* AI Agent Chat Sidebar (Desktop Only) */}
        {activeTab !== "chat" && (
          <div className="hidden w-80 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950 lg:flex">
            <ChatPanel
              messages={investigation.messages}
              onSendMessage={handleSendMessage}
              isPending={sendMessageMutation.isPending}
            />
          </div>
        )}
      </div>
    </Page>
  );
}

interface ChatPanelProps {
  messages: any[];
  onSendMessage: (text?: string) => void;
  isPending: boolean;
}

function ChatPanel({ messages, onSendMessage, isPending }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    onSendMessage(input);
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-1 flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 p-4">
        <Terminal className="h-4 w-4 text-indigo-400" />
        <h4 className="text-xs font-bold tracking-wider text-slate-200">
          AI AGENT CHAT
        </h4>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 text-xs">
        {messages.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            Ask me questions about this incident. (e.g. Explain this stack
            trace, What commits changed recently?)
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg p-3 leading-relaxed ${
                m.role === "USER"
                  ? "self-end border border-indigo-900 bg-indigo-950 text-indigo-200"
                  : "self-start border border-slate-800 bg-slate-900 text-slate-300"
              }`}
            >
              <strong>{m.role === "USER" ? "Developer" : "Agent"}:</strong>
              <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
            </div>
          ))
        )}
        {isPending && (
          <div className="flex items-center gap-2 self-start text-slate-500">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>AI agent is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-1.5 border-t border-slate-800 p-2">
        {[
          {
            label: "Why did this happen?",
            text: "Why did this incident happen?",
          },
          {
            label: "Recommended fix",
            text: "What is the recommended fix for this incident?",
          },
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(chip.text)}
            className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-slate-800 p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI agent..."
          className="flex-1 rounded border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isPending}
          className="rounded bg-indigo-600 p-2 text-slate-200 transition-all hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
