# A2B Market Design

## Goal

为 A2B 增加一个可通过 CLI 逐层浏览的“market”能力。market 本身不直接承载复杂执行逻辑，而是提供一个统一的目录索引，让 AI 可以从 GitHub 同步并浏览站点说明、外部工具链接、以及后续可扩展的 skill/recipe 条目。

首版目标是做一个 Demo：

- 市场源放在独立仓库 [`insogao/a2b-market`](https://github.com/insogao/a2b-market)
- A2B CLI 提供 market 浏览与更新命令
- 条目默认只展示说明和链接，不做执行 recipe
- 本地缓存 GitHub 索引，避免每次都在线抓取

## Product Layers

### Layer 1: A2B Core Guide

这一层是当前已经存在的通用使用说明：

- 如何连接 A2B
- 如何使用 `a2b status / tabs / goto / click / run-js`
- 如何恢复断连

它解决的是“怎么使用 A2B 这套桥接工具”。

### Layer 2: Market Index

这一层是后续新增的 market：

- 站点和工具的分类索引
- 每个条目的说明、适用任务、外部链接
- 可由 AI 通过 CLI 逐层浏览

它解决的是“面对具体网站/工具时，有没有现成的参考入口”。

这两层要保持分离。像“百度里 Enter 不稳、优先点搜索按钮”这种内容，不应该默认塞进核心 A2B guide，而更适合进入对应站点条目。

## Recommended Approach

推荐采用“索引仓库 + 本地缓存 + CLI 浏览”模式。

### Why this approach

- GitHub 是天然的开放协作入口，适合后续社区提交
- CLI 可以逐层浏览目录，降低低级 AI 的探索成本
- 本地缓存可以减少 GitHub 限流、波动、离线问题
- 外部项目可以作为条目被索引，而不需要全部镜像进 A2B 主仓库

## Repository Responsibilities

### `insogao/a2b-market`

作为市场源仓库，负责：

- 顶层分类
- 子分类索引
- 本地 markdown 条目
- 外部 GitHub/tool 条目元数据

### `insogao/a2b`

作为执行仓库，负责：

- `a2b market` CLI
- market 缓存
- GitHub 同步逻辑
- 本地浏览与搜索体验

## Market Content Model

首版建议采用“索引 + 条目文档”的简单结构。

### Top-level structure

```text
index.json
search/index.json
search/baidu.md
search/google.md
news/index.json
news/reuters.md
multimedia/index.json
multimedia/yt-dlp.md
```

### Entry metadata

首版条目元数据建议至少包含：

- `id`
- `title`
- `category`
- `summary`
- `sourceType`
- `sourceUrl`
- `tags`
- `updatedAt`

其中 `sourceType` 可以是：

- `local_doc`
- `external_github`
- `external_tool`

## CLI Surface

首版 CLI 只做浏览和更新，不做 recipe 执行。

### Proposed commands

- `a2b market update`
- `a2b market categories`
- `a2b market list <category>`
- `a2b market show <entry>`
- `a2b market search <keyword>`

### CLI behavior

- `market update`：从 `a2b-market` 拉取索引和允许缓存的文档
- `market categories`：返回一级分类
- `market list`：返回某分类下的条目摘要
- `market show`：展示单个条目的正文和外部链接
- `market search`：按标题、标签、摘要做本地搜索

## Local Cache

CLI 更新后的索引应缓存到本地，避免 AI 每次都在线抓 GitHub。

建议使用一个简单的本地目录，例如：

```text
~/.a2b/market/
```

缓存内容包括：

- 索引 json
- 本地 markdown 文档
- 基础元数据

缓存策略首版保持简单：

- 手动 `a2b market update`
- 后续再加定时更新或版本检查

## External Entries

market 条目允许指向外部项目，例如：

- `yt-dlp`
- 其他 GitHub skill 仓库
- 外部 CLI/tool 文档

这类条目首版默认只展示：

- 简要介绍
- 适用场景
- `fetch and use <url>` 风格的外链

不在首版里做“自动安装/自动执行”。

## Kimi Testbench Strategy

Kimi 不应该直接自由发挥地往 market 里写内容，而应该进入一个双层流程：

### Worker Kimi

负责：

- 按模板探索某个分类或站点
- 生成候选条目草稿
- 记录原始日志和不确定点

### Reviewer Kimi

负责：

- 读取 worker 的日志
- 检查条目草稿是否清晰、无歧义、符合模板
- 标出不可靠结论和需要人工复核的点

### Human gate

最终由主控 agent 做验收，只把质量合格的内容纳入 market。

## Demo Scope

首版 Demo 建议严格收敛：

- 分类只做 3 个：
  - `search`
  - `news`
  - `multimedia`
- 每类先放 1 到 2 个条目
- 条目默认只做说明与链接
- 不做自动 recipe 执行
- 不做社区提交系统，只先兼容未来 PR 工作流

## Risks

### Risk 1: 把 market 做成第二套复杂自动化平台

避免方式：

- 首版只做“索引与浏览”
- 不在 Demo 阶段做 recipe runtime

### Risk 2: 外部文档不稳定

避免方式：

- 条目中保留本地摘要
- 外部链接只作为补充，不作为唯一说明源

### Risk 3: Kimi 生成大量低质量条目

避免方式：

- 先有模板
- 先有 reviewer
- 最终人工验收

## Success Criteria

首版成功标准：

- `a2b market` CLI 能浏览本地缓存的 market 结构
- `a2b market update` 能从 `a2b-market` 拉取 Demo 内容
- AI 能通过 CLI 逐层定位到 `search / news / multimedia` 下的条目
- 至少有一轮 Kimi 双层探索流程，产出可验收的候选条目草稿
