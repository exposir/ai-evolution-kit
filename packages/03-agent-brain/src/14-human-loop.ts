/**
 * [INPUT]: @langchain/langgraph (StateGraph, MemorySaver), @langchain/openai, readline
 * [OUTPUT]: runHumanInLoop() - 人机协作，敏感操作需人工审批
 * [POS]: M3 第三章，Interrupt/Resume 机制，安全断点
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import "dotenv/config";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import * as readline from "node:readline";

/* ========================================================================
 * SECTION 1: State Definition
 * ======================================================================== */

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

type AgentStateType = typeof AgentState.State;

/* ========================================================================
 * SECTION 2: Sensitive Tools (需要人工审批的操作)
 * ======================================================================== */

const sendEmailTool = tool(
  async ({ to, subject, body }) => {
    // Simulate sending email
    console.log("\n   📧 [MOCK] Email sent successfully!");
    console.log(`      To: ${to}`);
    console.log(`      Subject: ${subject}`);
    return `Email sent to ${to} with subject "${subject}"`;
  },
  {
    name: "send_email",
    description: "Send an email to a recipient. This is a sensitive operation.",
    schema: z.object({
      to: z.string().describe("Email recipient address"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body content"),
    }),
  }
);

const deleteFileTool = tool(
  async ({ path }) => {
    // Simulate file deletion
    console.log(`\n   🗑️ [MOCK] File deleted: ${path}`);
    return `File "${path}" has been deleted.`;
  },
  {
    name: "delete_file",
    description:
      "Delete a file from the filesystem. This is a destructive operation.",
    schema: z.object({
      path: z.string().describe("Path to the file to delete"),
    }),
  }
);

const getTimeTool = tool(
  async () => {
    return `Current time: ${new Date().toISOString()}`;
  },
  {
    name: "get_time",
    description: "Get the current time. This is a safe, read-only operation.",
    schema: z.object({}),
  }
);

const tools = [sendEmailTool, deleteFileTool, getTimeTool];

// Type-safe tool executor
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "send_email") {
    return await sendEmailTool.invoke(args as { to: string; subject: string; body: string });
  }
  if (name === "delete_file") {
    return await deleteFileTool.invoke(args as { path: string });
  }
  if (name === "get_time") {
    return await getTimeTool.invoke({});
  }
  return `Error: Unknown tool "${name}"`;
}

// Sensitive tools that require human approval
const SENSITIVE_TOOLS = new Set(["send_email", "delete_file"]);

/* ========================================================================
 * SECTION 3: LLM Configuration
 * ======================================================================== */

const model = new ChatOpenAI({
  model: "glm-4-flash",
  temperature: 0,
}).bindTools(tools);

/* ========================================================================
 * SECTION 4: Node Definitions
 * ======================================================================== */

async function agentNode(state: AgentStateType) {
  console.log("\n🤖 [Agent Node] Processing...");

  const response = await model.invoke(state.messages);

  if (response.tool_calls && response.tool_calls.length > 0) {
    const toolNames = response.tool_calls.map((t) => t.name);
    console.log(`   → Planning to call: ${toolNames.join(", ")}`);

    // Flag sensitive operations
    const sensitiveOps = toolNames.filter((n) => SENSITIVE_TOOLS.has(n));
    if (sensitiveOps.length > 0) {
      console.log(`   ⚠️  Sensitive operations detected: ${sensitiveOps.join(", ")}`);
    }
  }

  return { messages: [response] };
}

async function toolNode(state: AgentStateType) {
  console.log("\n🔧 [Tool Node] Executing approved operations...");

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];

  const results: ToolMessage[] = [];

  for (const call of toolCalls) {
    console.log(`   → Executing: ${call.name}`);

    const result = await executeTool(call.name, call.args as Record<string, unknown>);
    results.push(
      new ToolMessage({
        tool_call_id: call.id!,
        content: String(result),
      })
    );
  }

  return { messages: results };
}

/* ========================================================================
 * SECTION 5: Router
 * ======================================================================== */

function shouldContinue(state: AgentStateType): "tools" | typeof END {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return END;
}

/* ========================================================================
 * SECTION 6: Graph with Checkpointer & Interrupt
 * - MemorySaver: 保存执行快照，支持暂停/恢复
 * - interruptBefore: 在指定节点前暂停，等待人工审批
 * ======================================================================== */

const checkpointer = new MemorySaver();

const graph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", "agent");

// Compile with interrupt before tools node
const app = graph.compile({
  checkpointer,
  interruptBefore: ["tools"], // Pause before executing any tool
});

/* ========================================================================
 * SECTION 7: Human Approval Interface
 * ======================================================================== */

async function askHuman(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function formatToolCallsForReview(messages: BaseMessage[]): string {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    return "No pending tool calls.";
  }

  return lastMessage.tool_calls
    .map((call, i) => {
      const isSensitive = SENSITIVE_TOOLS.has(call.name);
      const badge = isSensitive ? "🔴 SENSITIVE" : "🟢 SAFE";
      return `  ${i + 1}. [${badge}] ${call.name}\n     Args: ${JSON.stringify(call.args, null, 2).replace(/\n/g, "\n     ")}`;
    })
    .join("\n\n");
}

/* ========================================================================
 * SECTION 8: Main Loop with Human-in-the-Loop
 * ======================================================================== */

async function runHumanInLoop(query: string) {
  console.log("\n" + "=".repeat(60));
  console.log("🧑‍💼 Human-in-the-Loop Agent");
  console.log("=".repeat(60));
  console.log(`\n📝 Query: ${query}\n`);

  // Unique thread ID for this conversation
  const config = {
    configurable: {
      thread_id: `thread-${Date.now()}`,
    },
  };

  // Initial invocation - will pause before tools
  let result = await app.invoke(
    { messages: [new HumanMessage(query)] },
    config
  );

  // Loop: check for interrupts, get approval, resume
  while (true) {
    // Get current state snapshot
    const snapshot = await app.getState(config);

    // Check if we're at an interrupt point
    if (snapshot.next.length === 0) {
      // No more nodes to execute - we're done
      console.log("\n✅ Execution complete.");
      break;
    }

    // We're paused before a node (tools)
    console.log("\n" + "-".repeat(60));
    console.log("⏸️  PAUSED - Human approval required");
    console.log("-".repeat(60));
    console.log("\n📋 Pending operations:\n");
    console.log(formatToolCallsForReview(result.messages));

    // Ask for human approval
    const answer = await askHuman(
      "\n👤 Approve these operations? (yes/no/skip): "
    );

    if (answer === "yes" || answer === "y") {
      console.log("\n✅ Approved! Continuing execution...");
      // Resume execution from where we left off
      result = await app.invoke(null, config);
    } else if (answer === "skip" || answer === "s") {
      console.log("\n⏭️  Skipping tool execution...");
      // Inject a message saying tools were skipped
      const lastMessage = result.messages[result.messages.length - 1] as AIMessage;
      const skipMessages: ToolMessage[] = (lastMessage.tool_calls || []).map(
        (call) =>
          new ToolMessage({
            tool_call_id: call.id!,
            content: "SKIPPED: Human declined to execute this operation.",
          })
      );
      // Update state with skip messages and resume
      await app.updateState(config, { messages: skipMessages });
      result = await app.invoke(null, config);
    } else {
      console.log("\n❌ Rejected. Aborting execution.");
      break;
    }
  }

  // Final output
  const lastMessage = result.messages[result.messages.length - 1];
  console.log("\n" + "=".repeat(60));
  console.log("📤 Final Response:");
  console.log(lastMessage.content);
  console.log("=".repeat(60));
}

/* ========================================================================
 * SECTION 9: Demo
 * ======================================================================== */

async function main() {
  console.log("🧑‍💼 Human-in-the-Loop Demo");
  console.log("=" + "=".repeat(59));
  console.log(
    "This demo shows how to pause for human approval before sensitive operations.\n"
  );

  // Test case: sensitive operation (send email)
  await runHumanInLoop(
    "Please send an email to boss@company.com about the project status. Subject: Weekly Update"
  );
}

main().catch(console.error);
