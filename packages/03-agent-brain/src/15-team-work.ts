/**
 * [INPUT]: @langchain/langgraph (StateGraph, END), @langchain/openai
 * [OUTPUT]: runTeam() - Supervisor 模式多 Agent 协作
 * [POS]: M3 第四章，多智能体编排，主管分发任务给专家
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import "dotenv/config";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";

/* ========================================================================
 * SECTION 1: State Definition
 * - messages: 共享对话历史
 * - currentWorker: 当前正在工作的专家
 * - workLog: 工作日志，记录每个专家的产出
 * ======================================================================== */

const TeamState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  currentWorker: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  workLog: Annotation<Record<string, string>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
});

type TeamStateType = typeof TeamState.State;

/* ========================================================================
 * SECTION 2: Worker Tools
 * - Researcher: 搜索和分析信息
 * - Writer: 撰写内容
 * ======================================================================== */

// 研究员工具
const searchWebTool = tool(
  async ({ query }) => {
    console.log(`   🔍 搜索中: "${query}"`);
    // 模拟搜索结果
    const mockResults: Record<string, string> = {
      "ai trends 2024": `
2024 年 AI 关键趋势：
1. 多模态 AI - 能理解文本、图像和音频的模型
2. AI 智能体 - 能规划和执行任务的自主系统
3. 小型语言模型 - 面向边缘设备的高效专用模型
4. AI 监管 - 新法规和治理框架陆续出台
5. 医疗 AI - 诊断工具和药物研发加速
      `,
      default: `"${query}" 的搜索结果：找到了关于 AI 发展和行业趋势的相关信息。`,
    };
    const key = query.toLowerCase().includes("ai trends") ? "ai trends 2024" : "default";
    return mockResults[key];
  },
  {
    name: "search_web",
    description: "Search the web for information on a topic",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

const analyzeTool = tool(
  async ({ topic, data }) => {
    console.log(`   📊 分析中: "${topic}"`);
    return `${topic} 分析结果：数据显示增长潜力强劲。关键洞察：${data.slice(0, 100)}...`;
  },
  {
    name: "analyze_data",
    description: "Analyze collected data and extract insights",
    schema: z.object({
      topic: z.string().describe("Topic being analyzed"),
      data: z.string().describe("Data to analyze"),
    }),
  }
);

// 写手工具
const draftArticleTool = tool(
  async ({ title, outline, keyPoints }) => {
    console.log(`   ✍️  撰写中: "${title}"`);
    const article = `
# ${title}

${outline}

## 核心要点
${keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}

## 总结
基于我们的研究，这些趋势将在未来几年塑造 AI 领域的格局。
    `;
    return article;
  },
  {
    name: "draft_article",
    description: "Draft a blog article based on research",
    schema: z.object({
      title: z.string().describe("Article title"),
      outline: z.string().describe("Article outline/structure"),
      keyPoints: z.array(z.string()).describe("Key points to cover"),
    }),
  }
);

const editContentTool = tool(
  async ({ content, instructions }) => {
    console.log(`   ✂️  编辑中...`);
    return `[已编辑] ${content}\n\n(应用的修改: ${instructions})`;
  },
  {
    name: "edit_content",
    description: "Edit and refine written content",
    schema: z.object({
      content: z.string().describe("Content to edit"),
      instructions: z.string().describe("Editing instructions"),
    }),
  }
);

const researcherTools = [searchWebTool, analyzeTool];
const writerTools = [draftArticleTool, editContentTool];

// Type-safe tool executors
async function executeResearcherTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "search_web") {
    return await searchWebTool.invoke(args as { query: string });
  }
  if (name === "analyze_data") {
    return await analyzeTool.invoke(args as { topic: string; data: string });
  }
  return `Error: Unknown tool "${name}"`;
}

async function executeWriterTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "draft_article") {
    return await draftArticleTool.invoke(args as { title: string; outline: string; keyPoints: string[] });
  }
  if (name === "edit_content") {
    return await editContentTool.invoke(args as { content: string; instructions: string });
  }
  return `Error: Unknown tool "${name}"`;
}

/* ========================================================================
 * SECTION 3: LLM Instances for Each Role
 * ======================================================================== */

const supervisorModel = new ChatOpenAI({ model: "glm-4-flash", temperature: 0 });
const researcherModel = new ChatOpenAI({ model: "glm-4-flash", temperature: 0 }).bindTools(researcherTools);
const writerModel = new ChatOpenAI({ model: "glm-4-flash", temperature: 0 }).bindTools(writerTools);

/* ========================================================================
 * SECTION 4: System Prompts
 * ======================================================================== */

const SUPERVISOR_PROMPT = `You are a team supervisor managing a task between specialized workers.

Available workers:
- RESEARCHER: Expert at searching, gathering, and analyzing information
- WRITER: Expert at writing blog posts, articles, and creative content

Your job is to:
1. Understand the user's request
2. Delegate to the appropriate worker
3. Review their output
4. Decide if more work is needed or if the task is complete

Respond with a JSON object:
{
  "next": "RESEARCHER" | "WRITER" | "FINISH",
  "instructions": "Specific instructions for the worker",
  "reason": "Why you made this decision"
}

When the task is fully complete, respond with next: "FINISH".`;

const RESEARCHER_PROMPT = `You are a research specialist. Your job is to:
1. Search for relevant information
2. Analyze and synthesize findings
3. Provide clear, factual summaries

Use your tools to gather comprehensive information. Be thorough and accurate.`;

const WRITER_PROMPT = `You are a professional content writer. Your job is to:
1. Create engaging, well-structured content
2. Transform research into readable articles
3. Maintain a professional yet accessible tone

Use your tools to draft and refine content. Focus on clarity and engagement.`;

/* ========================================================================
 * SECTION 5: Node Definitions
 * ======================================================================== */

async function supervisorNode(state: TeamStateType) {
  console.log("\n👔 [主管] 评估情况...");

  // Build context for supervisor
  const contextMessages = [
    new SystemMessage(SUPERVISOR_PROMPT),
    ...state.messages,
  ];

  // Add work log context if available
  if (Object.keys(state.workLog).length > 0) {
    const logSummary = Object.entries(state.workLog)
      .map(([worker, output]) => `${worker} output: ${output.slice(0, 200)}...`)
      .join("\n\n");
    contextMessages.push(
      new SystemMessage(`Work completed so far:\n${logSummary}`)
    );
  }

  const response = await supervisorModel.invoke(contextMessages);
  const content = response.content as string;

  // Parse supervisor decision
  let decision: { next: string; instructions: string; reason: string };
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    decision = jsonMatch ? JSON.parse(jsonMatch[0]) : { next: "FINISH", instructions: "", reason: "Could not parse response" };
  } catch {
    console.log("   ⚠️  无法解析决策，结束流程...");
    decision = { next: "FINISH", instructions: "", reason: "Parse error" };
  }

  console.log(`   → 决策: ${decision.next}`);
  console.log(`   → 原因: ${decision.reason}`);

  return {
    messages: [new AIMessage(`[Supervisor] ${JSON.stringify(decision)}`)],
    currentWorker: decision.next === "FINISH" ? null : decision.next,
  };
}

async function researcherNode(state: TeamStateType) {
  console.log("\n🔬 [研究员] 工作中...");

  // Get supervisor's instructions
  const lastMessage = state.messages[state.messages.length - 1];
  let instructions = "";
  try {
    const parsed = JSON.parse((lastMessage.content as string).replace("[Supervisor] ", ""));
    instructions = parsed.instructions;
  } catch {
    instructions = "Research the requested topic";
  }

  const messages = [
    new SystemMessage(RESEARCHER_PROMPT),
    new HumanMessage(instructions),
  ];

  // Tool execution loop
  let response = await researcherModel.invoke(messages);
  const allMessages: BaseMessage[] = [response];

  while (response.tool_calls && response.tool_calls.length > 0) {
    const toolResults: ToolMessage[] = [];
    for (const call of response.tool_calls) {
      const result = await executeResearcherTool(call.name, call.args as Record<string, unknown>);
      toolResults.push(
        new ToolMessage({ tool_call_id: call.id!, content: String(result) })
      );
    }
    allMessages.push(...toolResults);
    response = await researcherModel.invoke([...messages, ...allMessages]);
    allMessages.push(response);
  }

  const output = response.content as string;
  console.log(`   ✅ 研究完成: ${output.slice(0, 100)}...`);

  return {
    messages: [new AIMessage(`[Researcher] ${output}`)],
    workLog: { RESEARCHER: output },
    currentWorker: null,
  };
}

async function writerNode(state: TeamStateType) {
  console.log("\n✍️  [写手] 工作中...");

  // Get supervisor's instructions and research context
  const lastMessage = state.messages[state.messages.length - 1];
  let instructions = "";
  try {
    const parsed = JSON.parse((lastMessage.content as string).replace("[Supervisor] ", ""));
    instructions = parsed.instructions;
  } catch {
    instructions = "Write content based on the research";
  }

  // Include research in context
  const researchContext = state.workLog.RESEARCHER || "No research available";

  const messages = [
    new SystemMessage(WRITER_PROMPT),
    new SystemMessage(`Research findings:\n${researchContext}`),
    new HumanMessage(instructions),
  ];

  // Tool execution loop
  let response = await writerModel.invoke(messages);
  const allMessages: BaseMessage[] = [response];

  while (response.tool_calls && response.tool_calls.length > 0) {
    const toolResults: ToolMessage[] = [];
    for (const call of response.tool_calls) {
      const result = await executeWriterTool(call.name, call.args as Record<string, unknown>);
      toolResults.push(
        new ToolMessage({ tool_call_id: call.id!, content: String(result) })
      );
    }
    allMessages.push(...toolResults);
    response = await writerModel.invoke([...messages, ...allMessages]);
    allMessages.push(response);
  }

  const output = response.content as string;
  console.log(`   ✅ 写作完成: ${output.slice(0, 100)}...`);

  return {
    messages: [new AIMessage(`[Writer] ${output}`)],
    workLog: { WRITER: output },
    currentWorker: null,
  };
}

/* ========================================================================
 * SECTION 6: Router Function
 * ======================================================================== */

function routeFromSupervisor(
  state: TeamStateType
): "researcher" | "writer" | typeof END {
  const worker = state.currentWorker;

  if (!worker || worker === "FINISH") {
    console.log("\n🏁 [路由器] 任务完成!");
    return END;
  }

  if (worker === "RESEARCHER") {
    return "researcher";
  }
  if (worker === "WRITER") {
    return "writer";
  }

  return END;
}

/* ========================================================================
 * SECTION 7: Graph Construction
 * - Supervisor → (conditional) → Researcher/Writer/END
 * - Workers → Supervisor (loop back for review)
 * ======================================================================== */

const graph = new StateGraph(TeamState)
  .addNode("supervisor", supervisorNode)
  .addNode("researcher", researcherNode)
  .addNode("writer", writerNode)

  // Entry: START → supervisor
  .addEdge(START, "supervisor")

  // Supervisor routes to workers or END
  .addConditionalEdges("supervisor", routeFromSupervisor, {
    researcher: "researcher",
    writer: "writer",
    [END]: END,
  })

  // Workers report back to supervisor
  .addEdge("researcher", "supervisor")
  .addEdge("writer", "supervisor");

const app = graph.compile();

/* ========================================================================
 * SECTION 8: Demo
 * ======================================================================== */

async function main() {
  console.log("👥 多 Agent 团队协作演示");
  console.log("=".repeat(60));
  console.log("主管将任务分发给研究员和写手\n");

  const query =
    "研究 2024 年 AI 的主要趋势，并撰写一篇简短的博客文章。";

  console.log(`📝 用户请求: ${query}`);
  console.log("=".repeat(60));

  const result = await app.invoke({
    messages: [new HumanMessage(query)],
  });

  console.log("\n" + "=".repeat(60));
  console.log("📊 最终工作日志:");
  console.log("-".repeat(60));

  for (const [worker, output] of Object.entries(result.workLog)) {
    console.log(`\n[${worker}]:`);
    console.log(output);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ 任务完成!");
  console.log("=".repeat(60));
}

main().catch(console.error);
