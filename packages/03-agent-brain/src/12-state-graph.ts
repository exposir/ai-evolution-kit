/**
 * [INPUT]: @langchain/langgraph (StateGraph, END), @langchain/openai (ChatOpenAI), zod
 * [OUTPUT]: runAgent() - 演示 LangGraph 基础：Node、Edge、State
 * [POS]: M3 第一章，StateGraph 入门，理解图结构驱动的 Agent
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import "dotenv/config";
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
  }
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
  }
);

const tools = [calculatorTool, weatherTool];

// Type-safe tool executor
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "calculator") {
    return await calculatorTool.invoke(args as { a: number; b: number; operation: "add" | "subtract" | "multiply" | "divide" });
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
  model: "glm-4-flash",
  temperature: 0,
}).bindTools(tools);

/* ========================================================================
 * SECTION 4: Node Definitions
 * - agentNode: 调用 LLM，决定是否使用工具
 * - toolNode: 执行工具调用，返回结果
 * ======================================================================== */

async function agentNode(state: AgentStateType) {
  console.log("\n🤖 [Agent Node] Thinking...");

  const response = await model.invoke(state.messages);

  // Debug output
  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log(
      `   → Decided to call: ${response.tool_calls.map((t) => t.name).join(", ")}`
    );
  } else {
    console.log("   → Decided to respond directly");
  }

  return { messages: [response] };
}

async function toolNode(state: AgentStateType) {
  console.log("\n🔧 [Tool Node] Executing tools...");

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];

  const results: ToolMessage[] = [];

  for (const call of toolCalls) {
    console.log(`   → Running: ${call.name}(${JSON.stringify(call.args)})`);

    const result = await executeTool(call.name, call.args as Record<string, unknown>);
    console.log(`   ← Result: ${result}`);

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
  console.log(`📝 Query: ${query}`);
  console.log("=".repeat(60));

  const result = await app.invoke({
    messages: [new HumanMessage(query)],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  console.log("\n" + "-".repeat(60));
  console.log(`✅ Final Answer: ${lastMessage.content}`);
  console.log("-".repeat(60));

  return lastMessage.content;
}

/* ========================================================================
 * SECTION 8: Demo
 * ======================================================================== */

async function main() {
  console.log("🧠 LangGraph State Graph Demo");
  console.log("=" + "=".repeat(59));

  // Test 1: Tool usage (calculator)
  await runAgent("What is 42 multiplied by 17?");

  // Test 2: Tool usage (weather)
  await runAgent("What's the weather like in Beijing?");

  // Test 3: Direct response (no tool needed)
  await runAgent("Say hello in Chinese");

  // Test 4: Multi-tool reasoning
  await runAgent(
    "What's 100 divided by 4, and also tell me the weather in Shanghai?"
  );
}

main().catch(console.error);
