# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

FavGrove 是面向 Chrome/Edge 的本地优先书签管理扩展，采用 Manifest V3 架构。当前版本 v0.2.0 beta，核心目标是处理大型书签库（数千条）的管理、扫描、去重、链接检查、导入导出和本地备份。

**技术栈**：React 18 + TypeScript 5 + Vite 5 + CRXJS + Zustand + React Router + Tailwind CSS + Vitest + Playwright

## 核心架构

### 分层职责

```
React 组件 → 渲染 UI，调用 store actions
Zustand stores → 管理功能状态，调用 services
Services → 封装 Chrome APIs、存储、扫描、导入导出、备份
Workers → 处理昂贵的解析、扫描、链接调度工作
Background → 处理 MV3 service worker 和消息路由
Shared → 跨功能的组件、hooks、类型、工具、i18n 资源
```

### 源码目录结构

```
src/
├── background/       # MV3 service worker，不可直接从组件调用
├── workers/          # Web Workers（scanner、import/export、AI preprocessing）
├── services/         # Chrome API 边界层，组件通过这里访问扩展 API
├── stores/           # Zustand 状态管理
├── shared/           # 共享资源
│   ├── components/   # UI 原语（使用 Tailwind + Lucide icons）
│   ├── hooks/
│   ├── i18n/         # 中英文资源（需保持同步）
│   ├── types/
│   └── utils/
├── features/         # 功能模块（dashboard、scanner、manager、import-export、settings）
└── router/           # HashRouter 路由（全屏 options 页面，无 popup）
```

## 开发命令

### 日常开发

```bash
npm run dev                    # Vite 开发服务器（输出到 .crx-dev/）
npm run typecheck              # TypeScript 严格检查
npm run test                   # Vitest 单元测试（112 个测试）
```

### 完整验证

```bash
npm run lint                   # ESLint（必须 0 errors 0 warnings）
npm run typecheck
npm run test
npm run build                  # Vite 生产构建（输出到 dist/）
```

### 扩展验证

```bash
npm run build:extension        # 构建 + 验证 + 权限审计
npm run validate:extension     # 验证 dist/ 的扩展结构
npm run audit:permissions      # 检查 manifest 和隐私文档的权限一致性
npm run package:release        # 生成 release/favgrove-v0.2.0.zip
```

### E2E 测试

```bash
npm run test:e2e               # Playwright E2E（12 个流程测试）
```

### 浏览器测试

手动加载扩展时，**必须**选择 `dist/` 目录：

```
D:\EvenFrank\Workspace\Plugins\Google\FavGrove\dist
```

**不要**加载项目根目录或 `.crx-dev/`（开发服务器输出）。

## Chrome 扩展规则

### 强制约束

1. **API 访问边界**：React 组件不能直接调用 `chrome.*` API，必须通过 `services/` 层
2. **隐私边界**：扩展不得上传书签数据到外部服务器
3. **权限变更**：任何 manifest 权限变更需要运行 `npm run audit:permissions` 并记录 release-review
4. **可选权限**：破损链接检查使用 optional host permission，用户确认后才发起网络请求
5. **MV3 生命周期**：service worker 可能随时休眠，不依赖长期内存

### 测试路径

- 开发测试：使用 Vitest + Playwright
- 手动测试：加载 `dist/` 到 `chrome://extensions` 或 `edge://extensions`
- 发布前：完整浏览器点击测试（见 `docs/release/browser-clickthrough.md`）

## 编码规范

### TypeScript

- 严格模式，避免 `any`（不可避免时必须注释说明原因）
- 公共函数必须类型化输入和输出
- Service 响应、Worker 消息必须类型化

### React

- 业务逻辑不放在 JSX 中，提取为 hook 或 utility
- 使用 Tailwind CSS 和现有 `shared/components/` UI 原语
- 使用 Lucide 图标
- 大列表必须虚拟化（如 manager 的书签列表）
- 搜索必须防抖（300ms）
- 事件监听器必须清理

### i18n

- 保持 `src/shared/i18n/locales/` 中英文资源同步
- 新增文案同时添加 `en.json` 和 `zh.json`

### 文件组织

- 功能代码留在对应的 `features/` 文件夹
- 避免重复接口、重复工具函数
- 清理死代码和临时文件

## 验证策略

### 开发中快速验证

```bash
npm run typecheck && npm run test
```

### 完成前完整验证

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

### Manifest/构建/打包变更

```bash
npm run build:extension && npm run audit:permissions && npm run package:release
```

### 用户流程变更

```bash
npm run test:e2e
```

## 代码审查检查清单

从 `code_review.md` 提取的关键检查点：

### 架构
- React + TypeScript + Manifest V3 不变
- 无 popup 模式引入
- Services 封装 Chrome APIs
- Workers 用于重任务

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
- 无外部数据上传
- 无不安全 HTML 渲染
- 用户输入验证

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

## 文档地图

- `DEVELOPMENT_GUIDE.md`：开发指南和产品目标
- `AGENTS.md`：Codex 操作指令和交接规则
- `SESSION.md`：当前工作上下文和下一步
- `PROGRESS.md`：项目整体进度和发布决策
- `TASKS.md`：长期路线图和功能审计
- `RELEASE_CHECKLIST.md`：商店和制品发布门禁
- `code_review.md`：代码审查规则
- `PRIVACY.md`：权限和网络详情
- `docs/decisions/`：架构决策记录（restore-strategy、ai-provider-boundary）

## 当前开发方向

v0.2.0 beta 发布准备阶段，近期优先级：

1. 运行并记录最终的 Chrome/Edge 浏览器点击测试（从 `dist/`）
2. 将验证的隐私政策和支持 URL 连同准备的提交字段复制到商店门户
3. 从 `docs/release/github-prerelease-v0.2.0.md` 创建 GitHub beta pre-release
4. 完整替换恢复功能延后，除非单独的安全设计获批
5. 发布门禁关闭后，选择下一个 post-beta 任务

开始新任务前，**务必**检查 `SESSION.md` 和 `PROGRESS.md`。
