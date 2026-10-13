# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

FavGrove 是面向 Chrome/Edge 的本地优先书签管理扩展，采用 Manifest V3 架构。当前版本 **v0.3.0 beta**（多供应商 AI 分析里程碑），核心目标是处理大型书签库（10,000+ 条）的管理、扫描、去重、链接检查、导入导出和本地备份。

**技术栈**：React 19 + TypeScript 5 严格模式 + Vite 7 + CRXJS + Zustand + React Router v8（HashRouter）+ Tailwind CSS + shadcn 风格本地 UI 原语 + Lucide React + react-i18next + Vitest + Testing Library + Playwright

**技术栈已锁定**：未经用户批准，不得引入 Redux、MobX、Angular、Vue、Webpack、jQuery、popup 页面或新的 UI 组件库。

版本号必须在 `package.json`、`manifest.json`、UI footer、release ZIP 文件名之间保持同步（见 `VERSIONING.md`），发布脚本会强制校验。

## 核心架构

### 分层职责

```
React 组件 → 渲染 UI，调用 store actions
Zustand stores → 管理功能状态，调用 services
Services → 封装 Chrome APIs、存储、扫描、导入导出、备份、AI 编排
Workers → 处理昂贵的解析、扫描、链接调度、AI 预处理
Background → MV3 service worker：消息路由、alarms、更新生命周期、特权 fetch
Shared → 跨功能的组件、hooks、类型、工具、常量、i18n 资源
```

### 源码目录结构

```
src/
├── App.tsx           # 真正的路由表（HashRouter + lazy 分包），新增页面在这里挂载
├── main.tsx
├── background/       # MV3 service worker（background/messageRouter/alarms/updateLifecycle）
├── workers/          # Web Workers（scanner、linkChecker、importHtml、exportFile、aiPreprocess）
├── services/         # Chrome API 边界层，组件通过这里访问扩展 API
├── stores/           # Zustand 状态管理（bookmark/scan/settings/aiAnalysis）
├── shared/
│   ├── components/   # UI 原语（Tailwind + Lucide icons）+ AppLayout（左侧导航）
│   ├── constants/    # STORAGE_KEYS、schema 版本、默认值
│   ├── hooks/
│   ├── i18n/         # 中英文资源，按域拆分的 TS 模块
│   ├── types/        # index.ts（通用）+ ai.ts（AI 子系统）
│   └── utils/
├── features/         # dashboard、scanner、manager、import-export、ai-analysis、settings
├── router/           # routes.ts 中的 ROUTES 常量当前无任何引用，且缺 ai-analysis
├── styles/
└── test/setup.ts     # Vitest 全局 setup
```

路由的真实定义在 `src/App.tsx`（`lazy()` + `<Route>`），`src/router/routes.ts` 已与之脱节，改路由不要只改后者。

### 关键跨层模式

这些约定跨越多个文件，是理解代码流转的核心：

1. **后台网络桥接**：options 页面（扩展页）直接 `fetch` 外部 URL 会遭遇 CORS 与不安全来源限制。因此**所有特权网络请求**（破损链接检查、AI provider 调用）都通过 `chrome.runtime.sendMessage` 转发给 background service worker，由 `src/background/messageRouter.ts` 按消息 `type` 路由后执行真实 `fetch`。组件/Worker 不直接发起跨域请求。

   当前消息类型：`open-options`、`register-alarms`、`apply-extension-update`、`check-link` → `linkRequestService`、`run-ai-analysis` / `cancel-ai-analysis` → `aiProviderService`。新增异步消息必须在 listener 中 `return true`，否则 `sendResponse` 通道会提前关闭。

2. **`Result<T>` 约定**：service 层不抛异常，统一返回 `Result<T>`（`{ success: true, data }` 或 `{ success: false, error }`）。调用方先判 `success` 再取 `data`，错误消息全部走 i18n（`serviceErrors.*`）。

3. **环境降级探测**：service 用 `globalThis.chrome?.runtime?.id`（或 `chrome?.storage?.local`、`chrome?.permissions?.request`）判断是否在扩展运行时中。缺失时（单测/开发）自动降级为直接执行或内存实现。写测试时优先利用这个降级路径，而不是硬造 chrome mock。

4. **存储封装**：禁止直接调 `chrome.storage.local`。所有读写走 `storageService`，值会被包成 `StoredValue<T>`（`{ schemaVersion, data, updatedAt }`），因此读取是两层：`stored.data?.data`。所有 key 必须在 `shared/constants/storage.ts` 的 `STORAGE_KEYS` 注册。schema 变更走 `migrateSettings` / `migrateBackup` / `migrateCache` 三个钩子（目前均为直通，改数据形状时在这里补迁移）。

5. **Worker 编排**：service 用 `new Worker(new URL('../workers/xxx.worker.ts', import.meta.url), { type: 'module' })` 创建 Worker，通过 `postMessage`/`onmessage` 通信，完成或出错后 `terminate()`。`scanService` 把进度切成两段：结构扫描映射到 0–40%，链接检查映射到 40–100%。链接检查 Worker 负责调度与并发控制（全局默认 8，每 hostname 上限 2），但把每个 `fetch` 通过 `request-link` 消息**回递主线程**，再桥接到 background——Worker 本身不发网络请求。

6. **Background 常驻职责**：除消息路由外，service worker 还负责两件事。其一是自动扫描 alarm——alarm 名 `markora-auto-scan` 是**持久化标识，跨 rebrand 必须保持不变**，由 `registerAlarms()` 在 install/startup/设置变更时重建。其二是扩展更新生命周期（`updateLifecycle.ts` + `updateService.ts`），把可用更新写入 storage 供 UI 提示，用户确认后经 `apply-extension-update` 触发 `chrome.runtime.reload()`。

> AI 子系统同样遵循"后台网络桥接"模式，因其涉及敏感隐私边界，单列于下方 [AI 子系统](#ai-子系统敏感边界改动前必读) 章节。

## 开发命令

### 日常开发

| 命令 | 说明 |
|------|------|
| `npm run dev` | Vite 开发服务器，输出到 `.crx-dev/`，仅绑定 127.0.0.1 |
| `npm run typecheck` | TypeScript 严格检查 |
| `npm run test` | Vitest 单元测试（全量） |
| `npx vitest run src/services/scanService.test.ts` | 运行单个测试文件 |
| `npx vitest run -t "关键字"` | 按用例名过滤 |
| `npx vitest src/services/scanService.test.ts` | watch 模式 |
| `npm run benchmark:performance` | 10,000 书签结构扫描 + 拼音搜索基准 |

### 完整验证

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`lint` 使用 `--max-warnings 0`，必须 0 errors 0 warnings；`build` 输出到 `dist/`。

### 扩展与发布

| 命令 | 说明 |
|------|------|
| `npm run build:extension` | build + validate:extension + audit:permissions |
| `npm run validate:extension` | 验证 `dist/` 的扩展结构与版本一致性 |
| `npm run audit:permissions` | 检查 manifest 与隐私文档的权限一致性 |
| `npm run package:release` | 生成 `release/favgrove-v<version>.zip`（含 `.sha256`，确定性打包） |
| `npm run audit:dependencies` | 通过官方 npm registry 审计依赖，生产依赖必须干净 |
| `npm run check:browsers` | 在隔离 profile 中安装 `dist/` 到 Chrome/Edge 并验证 |
| `npm run check:browser-data-safety` | 校验安装过程未触碰真实浏览器用户数据 |
| `npm run check:browsers:visible -- chrome` | 可见浏览器逐一点击测试（也可传 `edge`） |
| `npm run capture:store-screenshots` | 生成商店 1280x800 截图 |

### E2E 测试

```bash
npm run test:e2e
```

**Windows 注意**：必须用 `npm run test:e2e`，它通过 `scripts/run-e2e.mjs` 干净地启停 Vite。直接跑 `playwright test` 会让本地 web server 挂起。

### 浏览器测试

手动加载扩展时，**必须**选择 `dist/` 目录：

```
D:\EvenFrank\Workspace\Plugins\Google\FavGrove\dist
```

**不要**加载项目根目录或 `.crx-dev/`（开发服务器输出）。

## Chrome 扩展规则

### 强制约束

1. **API 访问边界**：React 组件不能直接调用 `chrome.*` API，必须通过 `services/` 层
2. **隐私边界**：扩展不得上传书签数据到外部服务器（AI 子系统是唯一例外，且需用户显式配置 + 授权）
3. **权限变更**：任何 manifest 权限变更需要运行 `npm run audit:permissions` 并同步更新 `PRIVACY.md`
4. **可选权限**：破损链接检查与 AI endpoint 使用 optional host permission，用户确认后才发起网络请求
5. **MV3 生命周期**：service worker 可能随时休眠，不依赖长期内存（模块级变量只能作缓存，不能作唯一真相）

当前 manifest 权限基线：`permissions: ["alarms", "bookmarks", "storage"]`、`optional_host_permissions: ["<all_urls>"]`、全屏 `options_ui`（`open_in_tab: true`）、**无 popup、无 content script**。

## AI 子系统（敏感边界，改动前必读）

AI 书签分析是**可选、默认关闭、只读**的功能，改动前务必阅读 `docs/decisions/ai-provider-boundary.md` 和 `docs/roadmap/post-beta-ai.md`。

### 不可违反的约束

1. **只读**：AI 仅分析书签库元数据并给出建议，绝不自动执行任何破坏性操作或写入书签
2. **本地优先 + 用户自备凭据**：扩展内置的只是各家**官方 endpoint 与协议适配**，不内置任何 API key、不代理任何请求、不提供任何托管服务
3. **凭据不持久化**：API key 只在内存中随请求传递，绝不写入 storage（`aiSettings` 只存 provider/endpoint/model/隐私模式）
4. **独立权限边界**：每个 AI endpoint 需按 origin 单独申请 host permission（`chrome.permissions.request({ origins: ['<origin>/*'] })`），用户确认后才发起请求
5. **隐私模式**：支持 domain-only / redacted 元数据模式，本地预处理在 Worker 中剥离 URL query/fragment，样本上限 `MAX_ITEM_SAMPLE = 200`

### 多供应商适配（0.3.0）

供应商定义集中在 `services/aiProviderConfig.ts`，HTTP 请求体与响应解析集中在 `services/aiProviderAdapters.ts`：

| provider | protocol | endpoint 模式 |
|------|------|------|
| `openai` | `openai-chat-completions` | fixed |
| `anthropic` | `anthropic-messages` | fixed |
| `gemini` | `gemini-generate-content` | fixed，需拼 `models/<model>:generateContent` |
| `xai` | `openai-chat-completions` | fixed |
| `openai-compatible` | `openai-chat-completions` | custom，`parseOpenAiCompatibleEndpoint` 归一化路径并拒绝带凭据的 URL |

**新增一个 provider 需要同时改**：`aiProviderConfig.ts`（definition + 模型建议）、`aiProviderAdapters.ts`（请求构造 + 响应取文）、`shared/types/ai.ts`（`AiProvider` 联合类型）、`en-ai.ts` / `zh-CN-ai.ts` 文案。复用已有 protocol 时通常无需新增 adapter 分支。

### 数据流

```
组件 → aiAnalysisStore → aiAnalysisService.prepare()
  → aiPreprocess.worker.ts（本地脱敏/采样/聚合，支持 10000+ 书签）
  → 生成 payload 预览（含精确请求预览、解析后 endpoint 与估算 token）
aiAnalysisService.run() → chrome.permissions.request（按 endpoint origin）
  → chrome.runtime.sendMessage → messageRouter → aiProviderService.run()（在 background 中 fetch）
  → 严格结构化校验 + evidence 校验
```

**evidence 校验是反幻觉的核心**：模型返回的每条 `evidence` 必须精确匹配请求中真实存在的 hostname / folder 聚合值 / item ref（大小写不敏感匹配后回填原值），否则该 topic/suggestion 被丢弃；`topic.count` 不得超过实际书签总数。若所有结果都被过滤掉，返回结构化错误而非空结果。改这段逻辑时务必同步更新 `aiProviderService.test.ts`。

关键文件：`services/aiAnalysisService.ts`（客户端编排与权限申请）、`services/aiProviderService.ts`（后台 fetch、prompt、校验）、`services/aiProviderConfig.ts`、`services/aiProviderAdapters.ts`、`services/aiSettingsService.ts`、`stores/aiAnalysisStore.ts`、`workers/aiPreprocess.worker.ts`、`shared/utils/aiPreprocess.ts`、`shared/utils/aiResponse.ts`、`shared/types/ai.ts`。

供应商兼容性问题排查见 `docs/diagnostics/`，含案例记录与 `template-ai-provider-compatibility.md` 模板。

## 编码规范

### TypeScript

- 严格模式，避免 `any`（不可避免时必须注释说明原因）
- 公共函数必须类型化输入和输出
- Service 响应、Worker 消息必须类型化；Worker 消息优先用 `satisfies` 约束发送侧

### React

- 业务逻辑不放在 JSX 中，提取为 hook 或 utility
- 使用 Tailwind CSS 和现有 `shared/components/` UI 原语（shadcn 风格本地原语）
- 使用 Lucide 图标
- 大列表必须虚拟化（如 manager 的书签列表）
- 搜索必须防抖（300ms）
- 事件监听器必须清理
- 新页面走 `App.tsx` 的 `lazy()` 分包 + `AppLayout` 导航项

### i18n

- locale 是**按域拆分的 TypeScript 模块**，不是 JSON：`en.ts`/`zh-CN.ts`（主）、`en-ai.ts`/`zh-CN-ai.ts`（AI）、`en-release.ts`/`zh-CN-release.ts`（发布），在 `resources.ts` 合并
- 新增文案必须同时更新对应域的 `en-*` 和 `zh-CN-*` 文件
- 中英文 key 对等由 `locales.test.ts` 单测强制校验
- `uiCopy.test.ts` 用 TypeScript AST 扫描所有生产 `.tsx`，禁止 JSX 文本或 `alt`/`aria-label`/`label`/`placeholder`/`title` 属性出现静态英文。这类断言失败时应补 i18n key，而不是改测试

### 文件组织

- 功能代码留在对应的 `features/` 文件夹
- 避免重复接口、重复工具函数
- 清理死代码和临时文件

## 验证策略

开发中快速验证：

```bash
npm run typecheck && npm run test
```

完成前完整验证：

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Manifest / 构建 / 打包变更：

```bash
npm run build:extension && npm run audit:permissions && npm run package:release
```

用户流程变更：

```bash
npm run test:e2e
```

### CI 门禁

`.github/workflows/quality.yml`（windows-latest + Node 24）在 push/PR 上按序执行，本地改动应能通过同样的顺序：

```
audit:dependencies → lint → typecheck → test → benchmark:performance
→ build:extension → check:browsers → check:browser-data-safety
→ test:e2e → package:release
```

## 代码审查检查清单

### 架构
- React + TypeScript + Manifest V3 不变
- 无 popup 模式引入
- Services 封装 Chrome APIs
- Workers 用于重任务

### 可维护性
- 无重复接口、无重复工具函数
- 无死代码、无临时文件
- 无含义不清的文件名
- 功能代码留在对应的 feature 目录内

### 类型安全
- 无不必要的 `any`
- 公共函数有类型
- Service 响应和 Worker 消息已类型化

### 性能
- 大列表虚拟化
- 搜索防抖
- 昂贵计算 memoized
- 事件监听器清理
- Workers 安全终止或复用

### 安全和隐私
- 无分析、无遥测
- 无外部数据上传（AI 子系统除外，且须满足上述五条约束）
- 无不安全 HTML 渲染
- 用户输入验证

### 数据安全
破坏性操作前必须先创建备份：批量删除、导入、文件夹合并、备份恢复。

### Chrome 扩展合规
- Manifest V3 兼容
- 权限最小化
- Service worker 生命周期考虑
- 无长期 background 内存假设

### 测试
- 新逻辑有单元测试
- UI 行为有组件测试
- 关键流程有 E2E（如适用）
- Build 和 typecheck 通过

### 审查输出格式

```txt
Review result:
- Approved / Needs changes

Critical issues:
- ...

Suggestions:
- ...

Test status:
- ...
```

## 文档地图

本文件是架构、命令、编码规范、审查清单的**唯一事实源**。其余文档各司其职，不重复本文件内容：

- `README.md`：面向用户的产品介绍与安装说明
- `AGENTS.md`：Codex 会话的交接流程与收尾清单
- `SESSION.md`：当前工作上下文和下一步
- `PROGRESS.md`：项目整体进度和发布决策
- `TASKS.md`：长期路线图和功能审计
- `RELEASE_CHECKLIST.md`：商店和制品发布门禁
- `VERSIONING.md` / `CHANGELOG.md`：版本阶段规则与变更记录
- `PRIVACY.md`：权限和网络详情，改权限时必须同步
- `docs/decisions/`：架构决策记录（restore-strategy、ai-provider-boundary）
- `docs/diagnostics/`：疑难问题案例与排查模板（AI provider 兼容性、导出主线程卡顿）
- `docs/release/`：浏览器点击测试清单、GitHub pre-release 稿
- `docs/security/dependency-audit.md`：依赖审计策略与历史公告处置记录
- `store/`：商店提交文案、截图与宣传素材

### 其他 agent 的规则文件

`.cursorrules` 和 `.github/copilot-instructions.md` 已改为指向本文件的指针，不再承载内容——**不要**再把规则正文复制进去，否则又会漂移。`AGENTS.md` 只保留 Codex 独有的交接流程，架构与命令同样引用本文件。

## 当前开发方向

v0.3.0 多供应商 AI beta 候选，近期优先级（详见 `SESSION.md` 的 Next Step）：

1. 在可见 Chrome/Edge 中加载重建的 `dist/`，完成点击测试清单（含 AI 关闭/预览/取消状态）
2. 用用户自有凭据做一次性 live provider 兼容性验证，且不持久化该 key
3. 将验证过的隐私政策与支持 URL 连同准备好的提交字段复制到商店门户
4. 现有门禁通过后创建 `0.3.0` GitHub beta pre-release，并上传验证过的 release ZIP
5. 完整替换恢复功能延后，除非单独的安全设计获批

开始新任务前，**务必**检查 `SESSION.md` 和 `PROGRESS.md`。
