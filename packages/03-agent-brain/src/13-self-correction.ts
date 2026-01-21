/**
 * [INPUT]: @langchain/langgraph (StateGraph, END), @langchain/openai (ChatOpenAI), zod
 * [OUTPUT]: runSelfCorrectingAgent() - 自我修复回路，失败自动重试
 * [POS]: M3 第二章，Conditional Edges + Retry Logic，错误驱动的循环
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 从项目根目录加载 .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

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
    console.log(`   [调用 #${callCount}] 执行代码...`);

    // Simulate flaky behavior: first 2 calls fail
    if (callCount <= 2) {
      const errors = [
        "SyntaxError: unexpected token at line 3",
        "RuntimeError: division by zero",
      ];
      const error = errors[callCount - 1];
      console.log(`   ❌ 错误: ${error}`);
      return `Error: ${error}`;
    }

    // Third call succeeds
    console.log("   ✅ 代码执行成功");
    return `成功: 输出为 42。代码执行无错误。`;
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
  console.log(`\n🤖 [Agent 节点] 尝试 #${state.retryCount + 1}`);

  // If there was a previous error, inject it as context
  let messagesWithContext = [...state.messages];

  if (state.lastError && state.retryCount > 0) {
    console.log(`   → 上次错误: ${state.lastError}`);
    console.log("   → Agent 将尝试修复代码...");

    // Add error feedback to help the model correct itself
    messagesWithContext.push(
      new SystemMessage(
        `你的上次代码失败了: "${state.lastError}"。` +
          `请分析错误并使用修正后的代码重试。` +
          `尝试 ${state.retryCount + 1}/${MAX_RETRIES}。`
      )
    );
  }

  const response = await model.invoke(messagesWithContext);

  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log(
      `   → 调用: ${response.tool_calls.map((t) => t.name).join(", ")}`
    );
  } else {
    console.log("   → 直接回复 (无工具调用)");
  }

  return { messages: [response] };
}

async function toolNode(state: AgentStateType) {
  console.log("\n🔧 [工具节点] 执行中...");

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
        `\n⛔ [路由器] 已达最大重试次数 (${MAX_RETRIES})。放弃。`
      );
      return END;
    }
    console.log(
      `\n🔄 [路由器] 检测到错误，重试中... (${state.retryCount}/${MAX_RETRIES})`
    );
    return "agent";
  }

  // Success - no error
  console.log("\n✅ [路由器] 成功！结束循环。");
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
  console.log("🔄 自我修复 Agent 演示");
  console.log("=".repeat(60));
  console.log("此 Agent 将在代码执行失败时自动重试最多 3 次。\n");

  // Reset call counter for demo
  callCount = 0;

  const result = await app.invoke({
    messages: [
      new HumanMessage(
        "写一个计算 6 的阶乘的 Python 函数，然后运行它。"
      ),
    ],
  });

  console.log("\n" + "=".repeat(60));
  console.log("📊 最终状态:");
  console.log(`   重试次数: ${result.retryCount}`);
  console.log(`   最后错误: ${result.lastError || "无"}`);

  const lastMessage = result.messages[result.messages.length - 1];
  console.log(`   最终消息: ${lastMessage.content}`);
  console.log("=".repeat(60));
}

main().catch(console.error);
