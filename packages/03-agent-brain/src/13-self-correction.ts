/**
 * [INPUT]: @langchain/langgraph (StateGraph, END), @langchain/openai (ChatOpenAI), zod
 * [OUTPUT]: runSelfCorrectingAgent() - 自我修复回路，失败自动重试
 * [POS]: M3 第二章，Conditional Edges + Retry Logic，错误驱动的循环
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import "dotenv/config";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

/* ========================================================================
 * SECTION 1: State Definition
 * - messages: 对话历史
 * - retryCount: 重试计数器，防止死循环
 * - lastError: 最近一次错误信息
 * ======================================================================== */

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  retryCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
  lastError: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});

type AgentStateType = typeof AgentState.State;

const MAX_RETRIES = 3;

/* ========================================================================
 * SECTION 2: Flaky Tool (故意不稳定的工具)
 * - 模拟真实世界的不稳定 API
 * - 前几次调用有概率失败，迫使 Agent 重试
 * ======================================================================== */

let callCount = 0; // Track calls for deterministic demo

const runCodeTool = tool(
  async ({ code }) => {
    callCount++;
    console.log(`   [Call #${callCount}] Executing code...`);

    // Simulate flaky behavior: first 2 calls fail
    if (callCount <= 2) {
      const errors = [
        "SyntaxError: unexpected token at line 3",
        "RuntimeError: division by zero",
      ];
      const error = errors[callCount - 1];
      console.log(`   ❌ Error: ${error}`);
      return `Error: ${error}`;
    }

    // Third call succeeds
    console.log("   ✅ Code executed successfully");
    return `Success: Output is 42. Code executed without errors.`;
  },
  {
    name: "run_code",
    description:
      "Execute Python code and return the result. May fail due to syntax or runtime errors.",
    schema: z.object({
      code: z.string().describe("The Python code to execute"),
    }),
  }
);

const tools = [runCodeTool];

// Type-safe tool executor
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "run_code") {
    return await runCodeTool.invoke(args as { code: string });
  }
  return `Error: Unknown tool "${name}"`;
}

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
  console.log(`\n🤖 [Agent Node] Attempt #${state.retryCount + 1}`);

  // If there was a previous error, inject it as context
  let messagesWithContext = [...state.messages];

  if (state.lastError && state.retryCount > 0) {
    console.log(`   → Previous error: ${state.lastError}`);
    console.log("   → Agent will try to fix the code...");

    // Add error feedback to help the model correct itself
    messagesWithContext.push(
      new SystemMessage(
        `Your previous code failed with: "${state.lastError}". ` +
          `Please analyze the error and try again with corrected code. ` +
          `Attempt ${state.retryCount + 1} of ${MAX_RETRIES}.`
      )
    );
  }

  const response = await model.invoke(messagesWithContext);

  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log(
      `   → Calling: ${response.tool_calls.map((t) => t.name).join(", ")}`
    );
  } else {
    console.log("   → Responding directly (no tool call)");
  }

  return { messages: [response] };
}

async function toolNode(state: AgentStateType) {
  console.log("\n🔧 [Tool Node] Executing...");

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];

  const results: ToolMessage[] = [];
  let errorMessage: string | null = null;

  for (const call of toolCalls) {
    const result = await executeTool(call.name, call.args as Record<string, unknown>);
    const resultStr = String(result);

    results.push(
      new ToolMessage({ tool_call_id: call.id!, content: resultStr })
    );

    // Detect error in result (check prefix, not substring to avoid false positives)
    if (resultStr.startsWith("Error:")) {
      errorMessage = resultStr;
    }
  }

  return {
    messages: results,
    lastError: errorMessage,
    retryCount: errorMessage ? state.retryCount + 1 : state.retryCount,
  };
}

/* ========================================================================
 * SECTION 5: Router Functions
 * - shouldContinue: agent → tools OR END
 * - shouldRetry: tools → agent (retry) OR END (success/max retries)
 * ======================================================================== */

function shouldContinue(state: AgentStateType): "tools" | typeof END {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return END;
}

function shouldRetry(state: AgentStateType): "agent" | typeof END {
  // Check if there was an error
  if (state.lastError) {
    // Check retry limit
    if (state.retryCount >= MAX_RETRIES) {
      console.log(
        `\n⛔ [Router] Max retries (${MAX_RETRIES}) reached. Giving up.`
      );
      return END;
    }
    console.log(
      `\n🔄 [Router] Error detected, retrying... (${state.retryCount}/${MAX_RETRIES})`
    );
    return "agent";
  }

  // Success - no error
  console.log("\n✅ [Router] Success! Ending loop.");
  return END;
}

/* ========================================================================
 * SECTION 6: Graph Construction
 * - Key difference from Ch12: tools has conditional edge back to agent
 * - Creates a self-correcting loop
 * ======================================================================== */

const graph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)

  // START → agent
  .addEdge(START, "agent")

  // agent → tools OR END
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    [END]: END,
  })

  // tools → agent (retry) OR END (success/give up)
  .addConditionalEdges("tools", shouldRetry, {
    agent: "agent",
    [END]: END,
  });

const app = graph.compile();

/* ========================================================================
 * SECTION 7: Demo
 * ======================================================================== */

async function main() {
  console.log("🔄 Self-Correcting Agent Demo");
  console.log("=".repeat(60));
  console.log("This agent will retry failed code execution up to 3 times.\n");

  // Reset call counter for demo
  callCount = 0;

  const result = await app.invoke({
    messages: [
      new HumanMessage(
        "Write a Python function to calculate the factorial of 6, then run it."
      ),
    ],
  });

  console.log("\n" + "=".repeat(60));
  console.log("📊 Final State:");
  console.log(`   Retry count: ${result.retryCount}`);
  console.log(`   Last error: ${result.lastError || "None"}`);

  const lastMessage = result.messages[result.messages.length - 1];
  console.log(`   Final message: ${lastMessage.content}`);
  console.log("=".repeat(60));
}

main().catch(console.error);
