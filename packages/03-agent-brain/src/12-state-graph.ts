/**
 * [INPUT]: @langchain/langgraph (StateGraph, END), @langchain/openai (ChatOpenAI), zod
 * [OUTPUT]: runAgent() - 演示 LangGraph 基础：Node、Edge、State
 * [POS]: M3 第一章，StateGraph 入门，理解图结构驱动的 Agent
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/* ========================================================================
 * 📚 本文件核心学习要点
 * ========================================================================
 * 1. LangGraph 三要素：
 *    - State: 使用 Annotation.Root 定义状态，reducer 模式累积消息
 *    - Node:  agentNode (LLM 决策) + toolNode (工具执行)
 *    - Edge:  普通边 (addEdge) + 条件边 (addConditionalEdges)
 *
 * 2. ReAct 循环模式：
 *    START → agent → [需要工具?] → tools → agent → ... → END
 *                   ↘ [不需要] → END
 *
 * 3. 工具绑定：model.bindTools(tools) 让 LLM 知道可调用的工具
 *
 * 4. 条件路由：shouldContinue() 根据 tool_calls 决定下一步
 *
 * 5. 图编译：graph.compile() 生成可执行的 app
 * ======================================================================== */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 从项目根目录加载 .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

/* ========================================================================
 * SECTION 1: State Definition
 * - Annotation.Root 定义状态结构
 * - messages 使用 reducer 模式累积消息
 * ======================================================================== */

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

type AgentStateType = typeof AgentState.State;

/* ========================================================================
 * SECTION 2: Tools Definition
 * - 使用 @langchain/core/tools 的 tool() 函数
 * - 每个工具有 name、description、schema、func
 * ======================================================================== */

const calculatorTool = tool(
  async ({ a, b, operation }) => {
    switch (operation) {
      case "add":
        return `${a} + ${b} = ${a + b}`;
      case "subtract":
        return `${a} - ${b} = ${a - b}`;
      case "multiply":
        return `${a} × ${b} = ${a * b}`;
      case "divide":
        return b !== 0 ? `${a} ÷ ${b} = ${a / b}` : "Error: Division by zero";
      default:
        return "Unknown operation";
    }
  },
  {
    name: "calculator",
    description: "Perform basic arithmetic operations",
    schema: z.object({
      a: z.number().describe("First operand"),
      b: z.number().describe("Second operand"),
      operation: z
        .enum(["add", "subtract", "multiply", "divide"])
        .describe("The operation to perform"),
    }),
  },
);

const weatherTool = tool(
  async ({ city }) => {
    // Mock weather data
    const mockWeather: Record<string, string> = {
      beijing: "Beijing: 15°C, Sunny",
      shanghai: "Shanghai: 18°C, Cloudy",
      shenzhen: "Shenzhen: 25°C, Humid",
    };
    const key = city.toLowerCase();
    return mockWeather[key] || `${city}: 20°C, Clear (mock data)`;
  },
  {
    name: "get_weather",
    description: "Get the current weather for a city",
    schema: z.object({
      city: z.string().describe("The city name to get weather for"),
    }),
  },
);

const tools = [calculatorTool, weatherTool];

// Type-safe tool executor
async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (name === "calculator") {
    return await calculatorTool.invoke(
      args as {
        a: number;
        b: number;
        operation: "add" | "subtract" | "multiply" | "divide";
      },
    );
  }
  if (name === "get_weather") {
    return await weatherTool.invoke(args as { city: string });
  }
  return `Error: Unknown tool "${name}"`;
}

/* ========================================================================
 * SECTION 3: LLM Configuration
 * - 绑定工具到模型
 * - bindTools() 让模型知道可以调用哪些工具
 * ======================================================================== */

const model = new ChatOpenAI({
  model: process.env.CHAT_MODEL || "glm-4-flash",
  temperature: 0,
}).bindTools(tools);

/* ========================================================================
 * SECTION 4: Node Definitions
 * - agentNode: 调用 LLM，决定是否使用工具
 * - toolNode: 执行工具调用，返回结果
 * ======================================================================== */

async function agentNode(state: AgentStateType) {
  console.log("\n🤖 [Agent 节点] 思考中...");

  const response = await model.invoke(state.messages);

  // Debug output
  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log(
      `   → 决定调用: ${response.tool_calls.map((t) => t.name).join(", ")}`,
    );
  } else {
    console.log("   → 决定直接回复");
  }

  return { messages: [response] };
}

async function toolNode(state: AgentStateType) {
  console.log("\n🔧 [工具节点] 执行工具...");

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];

  const results: ToolMessage[] = [];

  for (const call of toolCalls) {
    console.log(`   → 运行: ${call.name}(${JSON.stringify(call.args)})`);

    const result = await executeTool(
      call.name,
      call.args as Record<string, unknown>,
    );
    console.log(`   ← 结果: ${result}`);

    results.push(
      new ToolMessage({
        tool_call_id: call.id!,
        content: String(result),
      }),
    );
  }

  return { messages: results };
}

/* ========================================================================
 * SECTION 5: Router Function
 * - 检查最后一条消息是否包含 tool_calls
 * - 有 → 路由到 tools 节点
 * - 无 → 路由到 END
 * ======================================================================== */

function shouldContinue(state: AgentStateType): "tools" | typeof END {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return END;
}

/* ========================================================================
 * SECTION 6: Graph Construction
 * - START → agent → (conditional) → tools → agent → ... → END
 * - 形成 ReAct 循环
 * ======================================================================== */

const graph = new StateGraph(AgentState)
  // Add nodes
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)

  // Entry point: START → agent
  .addEdge(START, "agent")

  // Conditional edge: agent → tools OR END
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    [END]: END,
  })

  // Loop back: tools → agent
  .addEdge("tools", "agent");

// Compile to executable
const app = graph.compile();

/* ========================================================================
 * SECTION 7: Runner
 * - 演示交互式对话
 * ======================================================================== */

async function runAgent(query: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`📝 查询: ${query}`);
  console.log("=".repeat(60));

  const result = await app.invoke({
    messages: [new HumanMessage(query)],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  console.log("\n" + "-".repeat(60));
  console.log(`✅ 最终答案: ${lastMessage.content}`);
  console.log("-".repeat(60));

  return lastMessage.content;
}

/* ========================================================================
 * SECTION 8: Demo
 * ======================================================================== */

async function main() {
  console.log("🧠 LangGraph 状态图演示");
  console.log("=" + "=".repeat(59));

  // 测试 1: 工具调用 (计算器)
  await runAgent("42 乘以 17 等于多少？");

  // 测试 2: 工具调用 (天气)
  await runAgent("北京今天天气怎么样？");

  // 测试 3: 直接回复 (无需工具)
  await runAgent("用英文说你好");

  // 测试 4: 多工具推理
  await runAgent("100 除以 4 等于多少？另外上海天气如何？");
}

main().catch(console.error);
