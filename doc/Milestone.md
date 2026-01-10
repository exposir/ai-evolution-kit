这份细化文档是为了让你在 Milestone 1 开发时，能够把每一行代码都写得明明白白。我们将这 8 个章节拆解为可执行的“开发工单”。
在开始之前，请确保你的 packages/01-runtime-lab 目录已经准备好。

---

🏁 Milestone 1: The Runtime (AI 的手与眼)
核心目标：脱离 Web 框架，在纯 Node.js 环境中彻底搞懂 "Prompt"、"Tools" 和 "Embeddings" 的底层原理。
📄 Chapter 1: Bare Metal Chat (你好，LLM)

- 目标：建立与 OpenAI API 的第一条通信链路，并维持对话上下文。
- User Story：
- 作为开发者，我想在终端输入文字，让 AI 回复我。并且当我进行第二轮对话时，AI 还能记得我第一轮说过的话（上下文记忆）。
- 详细需求：
  1. 使用 dotenv 加载 .env 中的 OPENAI_API_KEY。
  2. 使用 Node.js 原生 readline 模块处理终端输入输出。
  3. 维护一个 messages 数组，将用户的 input 和 AI 的 output 不断 push 进去。
- 核心代码点：
  - openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [...] })
  - 数组操作：messages.push({ role: 'user', content: input })
- 预期行为：
- Plaintext
  You: 我叫 Gemini。
  AI: 你好 Gemini！有什么我可以帮你？
  You: 我叫什么名字？
  AI: 你刚才告诉我你叫 Gemini。
  📄 Chapter 2: Tool Definition (赋予能力)
- 目标：教会 AI “看懂”工具的说明书（Schema），但不真正执行。
- User Story：
- 我希望定义一个 add(a, b) 的工具，当我问“1 加 1 等于几”时，AI 不是直接回答 2，而是返回一个特殊的请求：“请帮我调用 add 工具，参数是 a=1, b=2”。
- 详细需求：
  1. 引入 zod 库。
  2. 使用 Zod 定义 CalculatorSchema。
  3. 使用 zod-to-json-schema (或手动转换) 将其转为 OpenAI 兼容的 JSON Schema。
  4. 在 API 请求中加入 tools 参数。
- 核心代码点：
  - Zod 定义：z.object({ a: z.number(), b: z.number() })
  - API 响应解析：检查 response.choices[0].message.tool_calls 是否存在。
- 关键点：理解 AI 不会 帮你算数，它只会 生成 调用参数。
  📄 Chapter 3: The Loop (Agent 原型)
- 目标：实现“模型思考 -> 调用本地函数 -> 结果回传 -> 模型回答”的闭环。
- User Story：
- 当 AI 想要调用 add 工具时，我的程序应该自动拦截这个请求，在本地运行加法函数，把结果“3”告诉 AI，然后 AI 再用自然语言回复我：“答案是 3”。
- 详细需求：
  1. 编写一个 runTool(name, args) 函数，包含真正的加法逻辑。
  2. 实现 while(true) 循环或递归函数。
  3. 关键逻辑：如果 finish_reason === 'tool_calls'，则执行工具 -> 构造一个 role: 'tool' 的消息 -> 追加到历史记录 -> 再次调用 LLM。
- 核心代码点：
  - 消息构建：{ role: 'tool', tool_call_id: '...', content: '3' }
  - 递归/循环控制：只有当 finish_reason === 'stop' 时才打印最终回复并跳出循环。
    📄 Chapter 4: System Interface (赋予实权)
- 目标：让 AI 突破沙盒，操作真实的文件系统。
- User Story：
- 我想让 AI 帮我“列出当前目录下的所有文件”，或者“读取 package.json 的内容”。
- 详细需求：
  1. 定义新工具：list_files (无参数) 和 read_file (参数: path)。
  2. 在工具实现层，调用 Node.js 的 fs.readdir 和 fs.readFileSync。
  3. 安全警告：在执行前打印日志，让你知道 AI 正在读你的硬盘。
- 核心代码点：
  - import fs from 'node:fs'
  - process.cwd() 获取当前路径。
    📄 Chapter 05-06: MCP Client (通用协议模拟)
- 目标：模拟 Model Context Protocol (MCP) 架构，理解 Client/Server 分离。
- User Story：
- 我想模拟一个“高德地图服务”。
- Server 端 (05)：一个独立的类，不仅有 getLocation 工具，还能通过标准格式描述自己的能力。
- Client 端 (06)：一个通用的连接器，它不知道对面是地图还是天气，但它能通过“握手”获取工具列表，并进行调用。
- 详细需求：
  1. Chapter 05 (Server): 定义一个 MapServer 类，包含 tools 定义和 call 方法。
  2. Chapter 06 (Client): 实例化 Server，通过模拟的 JSON-RPC 格式调用它。
  - 注：这里不需要建立真正的 HTTP/WebSocket 连接，通过函数调用模拟协议交互即可。
- 核心代码点：
  - 协议模拟：interface MCPRequest { method: string, params: any }
  - 解耦：Client 代码中不能出现 if (tool === 'map') 这样的硬编码，必须动态读取 Server 的 listTools()。
    📄 Chapter 07-08: Basic RAG (手工向量机)
- 目标：不使用向量数据库，手动实现 RAG (检索增强生成) 的全过程。
- User Story：
- 我有一个 knowledge.txt 文件，里面写着“AI-Evolution-Kit 是一个全栈脚手架”。
- 当我问“这个项目叫什么？”时，LLM 原本不知道，但我希望脚本能先把文本切片、算向量、找出最相关的那句话，喂给 LLM，让它回答正确。
- 详细需求：
  1. Chapter 07 (Embedding):
  - 读取 txt 文件。
  - 调用 openai.embeddings.create (模型: text-embedding-3-small)。
  - 将文本和对应的向量 (1536 维数组) 存入一个内存对象 Database 中。
  2. Chapter 08 (Search & Chat):
  - 将用户的 query 也转为向量。
  - 手写数学公式：编写一个 cosineSimilarity(vecA, vecB) 函数。
  - 计算 query 向量与库中所有向量的相似度，取 Top 1。
  - 构造 Prompt：Based on context: {content}, answer: {query}。
- 核心代码点：
  - 余弦相似度公式：(A . B) / (||A|| \* ||B||)
  - Prompt 注入技巧 (Context Injection)。

---

💡 准备工作
在开始 Chapter 1 之前，请确保你的 packages/01-runtime-lab 目录下安装了必要的依赖：
Bash

# 在 packages/01-runtime-lab 目录下

pnpm init
pnpm add openai zod dotenv
pnpm add -D typescript @types/node tsx
并且创建 .env 文件：
代码段
OPENAI_API_KEY=sk-proj-xxxx...
准备好开始 Chapter 1 的代码编写了吗？

好的，这是 Milestone 2: Data Foundation (记忆宫殿) 的详细开发工单。
在这一阶段，我们将离开“阅后即焚”的内存操作，构建一个真实的企业级知识库管道。我们将学习如何处理非结构化数据，并将其存入 PostgreSQL 数据库。
在开始之前，请确保你的 packages/02-data-forge 目录已经建立。

---

🏁 Milestone 2: Data Foundation (记忆宫殿)
核心目标：构建 ETL (Extract, Transform, Load) 管道，让 AI 拥有持久化的外部知识库。
📄 Chapter 9: Doc Cleaner (脏数据清洗工)

- 目标：解决 "Garbage In, Garbage Out" 问题。将复杂的 PDF 或 Markdown 转换为 AI 易读的纯文本块。
- User Story：
- 作为开发者，我有一份排版混乱的 PDF 手册。我希望脚本能自动提取其中的文字，去掉页眉页脚、多余的空行，并把它切分成每块 500 字的小段落（Chunks），以便后续处理。
- 详细需求：
  1. Extract (提取): 使用 pdf-parse 读取本地 PDF 文件，或者使用 fs 读取 Markdown。
  2. Clean (清洗):
  - 使用正则表达式去除连续的空格和换行符 (Normalize Whitespace)。
  - 去除不可见字符。
  3. Split (切分):
  - 实现一个简单的 RecursiveCharacterTextSplitter 逻辑。
  - 策略：优先在段落 (\n\n) 切分，其次在句子 (. ) 切分，最后强制在字符切分。保留一定的 chunkOverlap (重叠区，如 50 字符) 以防止上下文在切分处丢失。
- 核心代码点：
  - 正则清洗：text.replace(/\s+/g, ' ').trim()
  - 切分算法：需要处理边界情况，不要切断单词。
    📄 Chapter 10: Vector DB (构建记忆库)
- 目标：配置 Supabase (PostgreSQL)，并让 Node.js 能够与向量扩展交互。
- User Story：
- 作为开发者，我已经把文本切好了。现在我需要把这些文本块变成向量（Embeddings），存入数据库。下次重启程序时，这些数据应该还在。
- 详细需求：
  1. Supabase Setup:
  - 在 Supabase 后台执行 SQL，启用 vector 扩展。
  - 创建 documents 表，字段包含：id (uuid), content (text), metadata (jsonb), embedding (vector(1536))。
  2. Embedding Generation:
  - 遍历 Chapter 9 生成的 Chunks。
  - 批量调用 OpenAI API 生成向量 (注意并发限制，不要触发 Rate Limit)。
  3. Load (入库):
  - 使用 supabase-js 客户端将 { content, embedding } 插入数据库。
- 核心代码点：
  - SQL 建表：CREATE EXTENSION IF NOT EXISTS vector;
  - Supabase Client：supabase.from('documents').insert(rows)
    📄 Chapter 11: Smart Search (混合检索机制)
- 目标：利用 PostgreSQL 的强大功能，实现“向量相似度”与“关键词匹配”的结合。
- User Story：
- 作为用户，当我搜索“AI 工具箱”时，系统应该找出数据库里最相关的内容。
  1. 向量检索：理解“AI 工具箱”和“人工智能脚手架”是相似的。
  2. 混合策略：如果向量搜不到，尝试用数据库的 ilike 进行模糊匹配。
- 详细需求：
  1. RPC Function (关键):
  - 在 Supabase SQL 编辑器中编写一个 PostgreSQL 函数 match_documents。
  - 该函数接收一个查询向量，计算与表中 embedding 字段的 余弦距离 (cosine distance)，并返回相似度最高的记录。
  2. Client 调用:
  - 在 Node.js 中调用 supabase.rpc('match_documents', { query_embedding: ... })。
  3. Rerank (简易版):
  - 如果返回结果过多，在代码层面根据 similarity 分数设置一个阈值 (Threshold，如 0.7)，低于此分数的丢弃。
- 核心代码点：
  - SQL 向量搜索函数：
  - SQL
    create or replace function match_documents (
    query_embedding vector(1536),
    match_threshold float,
    match_count int
    )
    returns table (
    id bigint,
    content text,
    similarity float
    )
    language plpgsql
    as $$
beginreturn query
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
  - RPC 调用：supabase.rpc(...)

---

💡 准备工作
在开始 Chapter 9 之前，请在 packages/02-data-forge 下安装依赖：
Bash

# 在 packages/02-data-forge 目录下

pnpm init
pnpm add @supabase/supabase-js pdf-parse openai dotenv
pnpm add -D typescript @types/node tsx
同时，你需要去 Supabase 官网注册一个免费账号，创建一个新项目，并获取：

1. Project URL
2. Service Role Key (注意：入库数据通常需要 Service Role 权限，或者配置 RLS 策略，学习阶段可用 Service Role，但在 .env 中要严格保密)
   准备好开始构建你的数据管道了吗？
   这是 Milestone 3: Agent Orchestration (逻辑大脑) 的详细开发工单。
   这一阶段是整个项目的分水岭。在前两个阶段，代码执行是线性的（A -> B -> C）。在这一阶段，我们将引入 LangGraph，让代码具有“循环”、“分支”和“记忆”能力，从而构建真正的 Agent。
   💡 核心思维转变：从 DAG (有向无环图) 转向 Cyclic Graph (有环图)。
   在开始之前，请确保你的 packages/03-agent-brain 目录已经建立。

---

🏁 Milestone 3: Agent Orchestration (逻辑大脑)
核心目标：从简单的“调用工具”进化为“解决复杂任务”。引入状态机 (State Machine) 概念来管理 AI 的决策过程。
📄 Chapter 12: State Graph (图的初体验)

- 目标：理解 LangGraph 的基础：Node (节点)、Edge (边) 和 State (状态)。
- 前端类比：这就像是后端的 XState 或 Redux。State 是全局 Store，Node 是 Reducer，Edge 是 Action 触发的路由逻辑。
- User Story：
- 我希望构建一个固定的工作流：接收问题 -> 调用搜索工具 -> 整理答案。但我不再使用硬编码的函数调用，而是定义一个图结构，让数据在节点之间流动。
- 详细需求：
  1. Define State: 定义一个 TypeScript 接口 AgentState，包含 messages 数组。
  2. Create Nodes:
  - agentNode: 调用 LLM，决定是否使用工具。
  - toolNode: 如果 LLM 决定调用工具，执行该工具（复用 M1 的逻辑或使用 LangChain 内置的 ToolNode）。
  3. Build Graph:
  - 初始化 StateGraph。
  - 添加节点：.addNode('agent', ...) 和 .addNode('tools', ...)。
  - 关键点：添加一条 Conditional Edge (条件边)。如果 agent 返回了 tool_calls，流向 tools 节点；否则流向 END。
  - 从 tools 节点必须有一条边指回 agent 节点（形成循环）。
- 核心代码点：
  - import { StateGraph, END } from '@langchain/langgraph'
  - graph.compile(): 将图定义编译为可执行的 Runnable。
    📄 Chapter 13: Self-Correction (自我修复回路)
- 目标：利用图的循环特性，让 AI 具备“顽强”的品质。
- User Story：
- 我让 AI 写一段 Python 代码并执行。如果代码报错了，AI 不应该直接把报错扔给我，而是应该看到报错信息，说“啊，我写错了”，然后自动重新生成代码，直到代码运行成功或达到最大重试次数。
- 详细需求：
  1. Mock Tool: 创建一个故意会偶尔报错的工具（例如 run_code，输入特定字符串时抛出 Error）。
  2. Validation Node: 增加一个节点（或在 ToolNode 后增加逻辑），检查工具输出是否包含 "Error"。
  3. Routing Logic:
  - 如果 Output 正常 -> Go to END。
  - 如果 Output 报错 -> Route back to agentNode，并将错误信息作为新的 prompt 上下文附加上去。
  4. Safety Net: 在 State 中增加一个 retry_count 字段，超过 3 次报错则强制终止，防止死循环。
- 核心代码点：
  - 条件边逻辑：
  - TypeScript
    const shouldContinue = (state: AgentState) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage.content.includes("Error")) return "agent"; // 重试 return END;
    };
    📄 Chapter 14: Human-in-the-loop (人机协作与鉴权)
- 目标：在全自动化的流程中插入“人工审核”断点。
- User Story：
- AI 想要执行“发送邮件”或“删除文件”等敏感操作。程序必须暂停，挂起状态，等待我在终端输入 "yes" 后，才能继续执行；如果输入 "no"，则取消操作或让 AI 修改方案。
- 详细需求：
  1. Checkpointer: 引入 MemorySaver，用于持久化保存图运行的快照 (Snapshot)。
  2. Interrupt: 在编译图时配置 interruptBefore: ['action_node']。
  3. Execution Flow:
  - 程序运行到敏感节点前自动停止。
  - 开发者审查 snapshot.values (查看 AI 打算干什么)。
  - 调用 graph.invoke(null, config) 继续执行。
- 核心代码点：
  - checkpointer: new MemorySaver()
  - graph.compile({ checkpointer, interruptBefore: ["tools"] })
    📄 Chapter 15: Team Work (多智能体协作)
- 目标：实现 Supervisor (主管) 模式。一个大脑指挥多个手下。
- 前端类比：这就像是一个 Parent Component 管理着多个 Child Components。Parent 负责分发 Props（任务），Children 负责渲染（执行），最后回调给 Parent。
- User Story：
- 我问：“帮我研究一下 2024 AI 趋势，并写一篇博客。”
- 系统里有一个 Supervisor (主管)。
  1. 主管先唤醒 Researcher (研究员)，它去搜索并总结信息。
  2. Researcher 完成后回复主管。
  3. 主管把信息转交给 Writer (作家)，让它写文章。
  4. Writer 完成后，主管验收并输出给用户。
- 详细需求：
  1. Define Roles:
  - Supervisor: 一个 LLM，它的 tools 只有两个选项：delegate_to_researcher 和 delegate_to_writer，以及 FINISH。
  - Workers: 独立的 Node，各自拥有专属的 system prompt 和 tools。
  2. Router Node: 实现一个 Supervisor Node，解析它的输出，决定下一个接棒的是哪个 Worker Node。
  3. Shared State: 所有 Agent 共享一份对话历史，或者通过 scratchpad 传递中间成果。
- 核心代码点：
  - System Prompt 技巧："You are a supervisor tasked with managing a conversation between the following workers: [Researcher, Writer]. Given the user request, respond with the worker to act next."

---

💡 准备工作
在开始 Chapter 12 之前，请在 packages/03-agent-brain 下安装依赖：
Bash

# 在 packages/03-agent-brain 目录下

pnpm init
pnpm add @langchain/langgraph @langchain/core @langchain/openai zod dotenv
pnpm add -D typescript @types/node tsx
⚠️ 特别提示：LangGraph 的概念比较抽象，在开始写代码前，强烈建议你先拿纸笔画一下 Chapter 12 的状态流转图（State Diagram）。
准备好开始构建你的第一个智能体网络了吗？
这是 Milestone 4: AI UX Engineering (交互界面) 的详细开发工单。
这一阶段我们将从“黑客的终端”跨越到“普通用户的浏览器”。我们将构建一个基于 Next.js 的全栈应用，并深度使用 Vercel AI SDK。这不是简单的套壳，而是要掌握 AI 工程中最前沿的 GenUI (生成式 UI) 和 Streaming (流式传输) 技术。
在开始之前，请确保你的 packages/04-next-client 目录已经建立。

---

🏁 Milestone 4: AI UX Engineering (交互界面)
核心目标：提供类似 ChatGPT 的丝滑体验，并超越纯文本，实现“根据意图动态渲染组件”。
📄 Chapter 16: Hook Integration (现代化的状态管理)

- 目标：抛弃手写的 fetch 和复杂的 messages 数组拼接，使用行业标准的 SDK 管理对话状态。
- 前端类比：这就像是用 React Query 或 SWR 替代了原生的 XMLHttpRequest。你只管调用 hooks，状态更新自动完成。
- User Story：
- 我希望在输入框输入内容并回车后，输入框自动清空，新的消息自动追加到聊天列表底部，并且有一个 isLoading 状态让我能显示“正在思考...”。
- 详细需求：
  1. Backend Route: 创建一个 Next.js Route Handler (app/api/chat/route.ts)。
  2. Frontend Hook: 在页面组件中使用 useChat。
  3. UI Binding:
  - 将 messages 映射渲染为聊天气泡。
  - 将 input 和 handleInputChange 绑定到 <input> 元素。
  - 将 handleSubmit 绑定到 <form>。
- 核心代码点：
  - Client: const { messages, input, handleInputChange, handleSubmit } = useChat();
  - Server: 暂时只返回简单的 echo 文本，确保链路打通。
    📄 Chapter 17: Streaming UI (打字机效果)
- 目标：极大降低用户的感知延迟 (Perceived Latency)。
- User Story：
- 当 AI 回复长篇大论时，我不想等 5 秒钟看它一次性蹦出来。我希望它像真人打字一样，一个字一个字地往外吐 (Token Streaming)。
- 详细需求：
  1. AI SDK Core: 在后端引入 streamText 函数。
  2. Edge/Node Runtime: 配置 Route Handler 以支持流式传输。
  3. Protocol: 理解 Server-Sent Events (SSE) 的基本原理。AI 每生成一个 token，后端就 yield 一个数据块，前端自动拼接。
- 核心代码点：
  - Backend (route.ts):
  - TypeScript
    import { streamText } from 'ai';
    import { openai } from '@ai-sdk/openai';

const result = await streamText({
model: openai('gpt-4o'),
messages,
});
return result.toDataStreamResponse();
📄 Chapter 18: GenUI (Generative UI / Server Components)

- 目标：打破“AI 只能输出文本”的限制。这是目前 AI 工程最酷的特性。
- 前端类比：这就像是 Remote Rendering。AI 决定渲染哪个组件，服务器生成组件树 (RSC Payload)，前端只负责展示。
- User Story：
- 当我问“苹果现在的股价是多少？”时，AI 不仅仅是说“150 美元”，而是直接在聊天窗口里渲染一个交互式的 股票 K 线图卡片。
- 详细需求：
  1. Component Registry: 准备好一个 React 组件，例如 <StockCard symbol="AAPL" price={150} />。
  2. Tool Definition: 在后端定义一个名为 get_stock_price 的工具。
  3. Stream UI: 使用 streamUI (或 createStreamableUI，视 SDK 版本定)。当 LLM 决定调用工具时，不返回文本，而是 yield 一个 React 组件。
  4. Client Handling: 前端需要能够渲染从后端流过来的 React Node。
- 核心代码点：
  - Backend:
  - TypeScript
    // 伪代码示意 const result = await streamUI({
    model: openai('gpt-4o'),
    tools: {
    checkStock: {
    parameters: z.object({ symbol: z.string() }),
    generate: async ({ symbol }) => <StockCard symbol={symbol} />
    }
    }
    });
    📄 Chapter 19: Structured Output (结构化数据流)
- 目标：不仅仅是聊天，而是生产数据。让 AI 逐步填充复杂的 JSON 对象。
- User Story：
- 我想做一个“旅行计划生成器”。AI 不是给我一段文本，而是实时填写一个包含“目的地”、“预算”、“每日行程(数组)”的表单。我希望能看到表单项被一个个填满的过程。
- 详细需求：
  1. Schema Definition: 使用 Zod 定义复杂的 ItinerarySchema。
  2. Frontend Hook: 使用 useObject hook (Vercel AI SDK 新特性)。
  3. Real-time Rendering: 将 object 对象绑定到 UI 的 Input 或 Textarea 上。你会看到 JSON 字段在实时增长。
- 核心代码点：
  - Client: const { object, submit } = useObject({ schema: ItinerarySchema });
  - Backend: 使用 streamObject 替代 streamText。

---

💡 准备工作
在开始 Chapter 16 之前，你需要初始化 Next.js 环境。

1. 创建项目 (在 packages 目录下):
2. Bash
   cd packages
   npx create-next-app@latest 04-next-client --typescript --tailwind --eslint

# 按照提示选择默认配置

1. 安装 AI SDK:
2. Bash
   cd 04-next-client
   pnpm add ai @ai-sdk/openai zod
3. 配置环境变量:
4. 在 04-next-client 根目录创建 .env.local，填入 OPENAI_API_KEY。
   准备好让你的 AI 应用“活”过来了吗？这个阶段完成后，你将拥有一个可以拿去向朋友炫耀的真实产品原型。
   这是 Milestone 5: Production (生产环境) 的详细开发工单。
   恭喜你！这是“AI-Evolution-Kit”的最后一个阶段。在前四个阶段，你已经掌握了 AI 的所有核心能力。现在，我们要像真正的架构师一样思考：如何让这个系统在真实世界中稳定运行，而不是仅仅作为一个 Demo。
   我们将引入 NestJS —— Node.js 领域的 Spring Boot，来接管所有的后端逻辑。
   在开始之前，请确保你的 packages/05-server-core 目录即将建立。

---

🏁 Milestone 5: Production (生产环境)
核心目标：解耦前后端，构建一个高并发、可扩展、安全的 AI 接口服务。
[图片]
📄 Chapter 20: The Fortress (NestJS 架构重构)

- 目标：将原本散落在 Next.js API Routes 里的逻辑，迁移到标准的 Controller-Service 架构中。
- 前端类比：
  - Controller ≈ 路由组件 (Page/Route)，只负责接收请求和返回结果。
  - Service ≈ 业务逻辑 Hook (useService)，负责真正的“干活”。
  - Module ≈ Context Provider，负责依赖注入 (DI)。
- User Story：
- 我希望把 AI 的核心逻辑（LangGraph、RAG、Tools）封装成一个独立的微服务。这样以后无论我用 Web、App 还是小程序接入，都能复用同一套逻辑。
- 详细需求：
  1. Module Setup: 创建 ChatModule, AgentModule, RAGModule。
  2. Controller: 编写 ChatController，定义 POST /chat 接口。
  3. Service: 将 Milestone 3 (LangGraph) 和 Milestone 4 (Streaming) 的代码移植到 ChatService 中。
  4. Adapter: 由于 NestJS 的 Response 对象和 Next.js 不同，需要适配 Vercel AI SDK 的 PipeString 到 NestJS 的 Response 流中。
- 核心代码点：
  - 依赖注入: constructor(private readonly chatService: ChatService) {}
  - 流式响应:
    @Post('stream')
    async chat(@Res() res: Response, @Body() body: ChatDto) {
    const stream = await this.chatService.createStream(body);
    stream.pipe(res); // 将 AI 流管道接入 HTTP 响应
    }
    📄 Chapter 21: Redis Memory & Caching (高速缓存)
- 目标：引入 Redis 作为“短期记忆”和“缓存层”，减少数据库读写和 API 消耗。
- User Story：

1. 缓存 (Cache): 如果我问了一个完全一样的问题，且系统判断不需要实时搜索，直接返回 5 分钟内的缓存结果，省钱又快。
2. 对话历史 (History): Agent 的对话历史（State）不要存内存（重启就没了），也不要每次都存 Postgres（太慢），而是存 Redis。

- 详细需求：
  1. Redis Module: 集成 ioredis 或 NestJS 自带的 CacheManager。
  2. Checkpointer Implementation: 重写 LangGraph 的 Checkpointer，使其后端存储为 Redis。
  3. Cache Interceptor: 实现一个拦截器，对特定 GET 请求（如“获取热门 Prompt”）进行自动缓存。
- 核心代码点：
  - Redis Checkpointer:
  - TypeScript
    // 伪代码：保存 Agent 状态到 Redis
    async put(config: RunnableConfig, checkpoint: Checkpoint) {
    await redis.set(`thread:${config.thread_id}`, JSON.stringify(checkpoint));
    }
    📄 Chapter 22: Guardrails (卫兵与限流)
- 目标：保护你的 API 不被滥用，确保系统稳定性。
- User Story：
- 我要把这个产品发给朋友用，但我怕他们写个脚本死循环调用我的接口，把我的 Token 刷爆。我要限制每个 IP 每分钟只能发 10 条消息。同时，必须携带合法的 JWT 才能访问。
- 详细需求：
  1. Throttler (限流): 使用 @nestjs/throttler。
  - 配置全局守卫，限制 ttl: 60, limit: 10。
  2. Auth Guard: 实现一个 SupabaseAuthGuard。
  - 解析 Request Header 里的 Authorization: Bearer <token>。
  - 调用 Supabase Client 验证 Token 有效性。
  - 如果无效，直接抛出 401 Unauthorized，根本不进入 Service 层。
- 核心代码点：
  - Decorator: @UseGuards(AuthGuard, ThrottlerGuard)
  - Guard Logic:
  - TypeScript
    async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractToken(request);
    const user = await supabase.auth.getUser(token);
    if (!user) throw new UnauthorizedException();
    request.user = user; // 把用户信息挂载到请求对象上 return true;
    }

---

💡 准备工作与最终整合

1. 初始化 NestJS (在 packages 目录下):
2. Bash
   cd packages
   npm i -g @nestjs/cli
   nest new 05-server-core

# 选择 pnpm 作为包管理器

1. 安装核心依赖:
2. Bash
   cd 05-server-core
   pnpm add @nestjs/config @nestjs/throttler ioredis @supabase/supabase-js class-validator class-transformer
3. 联调 (Integration):

- 这是整个项目的最后一步。你需要回到 Milestone 4 的 Next.js 项目，修改 .env，将 API Base URL 指向 http://localhost:3000 (NestJS 的端口)，而不是 Next.js 自己的 API Routes。

---

🎉 全剧终：你完成了什么？
当你完成 Milestone 5 时，你拥有的不再是一堆脚本，而是一套工业级的 AI 基础设施：

1. Runtime Lab: 你理解了 LLM 的原始协议。
2. Data Forge: 你掌握了非结构化数据的 ETL 和向量化。
3. Agent Brain: 你学会了用图论（Graph）编排复杂的思维链。
4. Next Client: 你构建了现代化的生成式 UI。
5. Server Core: 你打造了安全、高并发的后端堡垒。
   Master Step (最终一步): 如果你准备好开始这最后的挑战，请回复：
   "初始化 NestJS 环境"
   我会协助你搭建后端脚手架，并开始 Chapter 20 的代码迁移。
