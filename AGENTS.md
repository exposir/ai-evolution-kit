<!--
- [INPUT]: 依赖 /CLAUDE.md 的模块定位与索引
- [OUTPUT]: 输出本文件内容
- [POS]: 位于 项目根目录 的文档
- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# Repository Guidelines

<!--
本文件用于所有协作者（人类或 AI 代理）的贡献指南，描述项目结构、工作流程与质量
要求。请保持内容简洁、可执行，并与仓库实际实践保持一致。
-->

## 项目结构与模块组织

这是一个以文档为主的 AI/LLM 知识库项目。核心内容位于 `notes/`，按主题组织（例如
`notes/ai-fundamentals/`、`notes/architecture/`、`notes/claude-code/`）。VitePress站点配置与主题在
`docs/.vitepress/`，静态文档文件在 `docs/`。支持材料存放于 `library/` 与
`prompts/`，对话归档在 `sessions/`。

## 构建、测试与开发命令

- `npm run docs:dev`: 启动 VitePress 开发服务器。
- `npm run docs:build`: 构建生产静态站点。
- `npm run docs:preview`: 预览生产构建结果。
- `npx prettier --write .`: 格式化 Markdown 与配置文件。
- `npx prettier --check .`: 仅检查格式，不写入。

## 编码风格与命名规范

- Markdown 以 80 字符换行，使用单引号；见 `.prettierrc`。
- 目录与 Markdown 文件使用 `kebab-case`（例如
  `notes/ai-fundamentals/prompt-engineering.md`）。
- 目录入口统一使用 `README.md`（大写），其余文件保持小写与短横线。
- VitePress 使用 `README.md` 作为入口页时，导航/侧边栏链接写成
  `/dir/README`；如需 `/dir/` 根路径，新增 `index.md` 或配置 `rewrites`。
- 标题层级清晰，代码块必须标注语言。

## 测试指南

当前没有自动化测试套件，`npm test` 会故意报错退出。请使用 `npm run docs:dev`
进行本地检查，重点验证链接与页面布局。

## 提交与 PR 指南

近期提交信息使用简短的约定式主题，如 `docs: update ...` 或
`docs(telegram): ...`。请保持祈使句和必要的范围标注。PR 需包含：

- 变更内容与原因的简要说明。
- 关联笔记或 Issue 的链接（如有）。
- VitePress 布局变化的截图或短录屏。

## 文档工作流程

- 新增或重命名文档时同步更新 `notes/guide/index.md` 与 `README.md`。
- 避免新增应用代码或运行时配置文件；这是文档项目。
- 详细规范见 `notes/project-meta/project-standards.md`。

## Agent 专用说明

- **通用规范**: 以本文件为准。
- **Claude Code**: 专用指引参考 [CLAUDE.md](./CLAUDE.md)。
- **Antigravity**: 专用规则参考
  [.antigravity/rules.md](./.antigravity/rules.md)。
- **Codex**: 专用指令参考 [CODEX.md](./CODEX.md)。
- **Gemini**: 上下文规则参考 [GEMINI.md](./GEMINI.md)。

> 未经允许禁止在根目录创建新配置文件。
