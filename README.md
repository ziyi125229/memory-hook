# Memory Hook

> 你只管说，我帮你记。

一个通过自然语言记录、结构化理解和智能检索，帮助用户管理日常物品与生活事件记忆的 **AI Memory Assistant**。

让用户拥有一个随时可调用的个人记忆层。

**Latest Release:** [v1.6.2](https://github.com/ziyi125229/memory-hook/releases/tag/v1.6.2)

## Demo

用浏览器打开 `memory-plugin-demo.html`。

语音输入建议使用 Chrome / Edge；若麦克风受限，可本地启动静态服务：

```bash
python3 -m http.server
```

---

## 背景与产品洞察

人们经常遇到：找不到钥匙、忘了东西借给谁、临时信息事后找不回。

备忘录要主动整理，拍照难检索，音箱又难理解「茶几下面第二个抽屉」这类位置关系。

**洞察：**

> 记录动作必须足够轻。用户只说一句话，系统帮他形成可查询的个人记忆。

Memory Hook 要解决的不是「再做一个笔记」，而是：

> **说得出 → 记得住 → 找得到。**

---

## 核心能力

### 1. Natural Language Memory Capture

用户不需要填表，直接说：

> “我把红色钥匙扔到客厅茶几下面抽屉里了。”

系统反馈：

> “好的，我记住了。”

并结构化保存物品、位置、时间、事件。

### 2. Memory State Resolution

同一物品可以有多条历史，但**当前状态只有一个**。

```text
钥匙 → 茶几
钥匙 → 玄关柜

Current: 钥匙 → 玄关柜
History: 钥匙 → 茶几
```

问「现在在哪」时，优先返回 Current State，而不是任意相关记录。

### 3. Reliable Retrieval

支持自然语言提问，例如：

- 「我的钥匙在哪？」→ Current
- 「钥匙以前放哪？」→ History
- 「充电宝借给谁了？」→ Lending

回答基于已保存 Memory，并展示证据；没有可靠记忆时不编造位置。

### 4. Uncertainty Guard

不确定信息不进入 Current State。

> “我把它放电视柜里了。”

→ 「你说的『它』是指哪件东西？」

原则：

> **不确定时，宁可不答，也不伪装成确定事实。**

---

## 产品迭代

| 版本 | 目标 | 关键进展 |
| --- | --- | --- |
| **V1.0** | 验证记录闭环 | 文本 / 语音记录、时间轴、关键词搜索 |
| **V1.5** | 从记录工具到 Memory System | Schema、持久化、自然语言检索、State Resolution |
| **V1.6.1** | AI Memory Assistant 体验 | 「好的，我记住了」、confidence、Uncertainty Guard、Current/History 查询 |
| **V1.6.2** | Memory Reliability 封板 | Showcase UI、Voice Draft/Confirm、possession_transfer、Clarify 防重入、Entity Resolution |

---

## Evaluation

用 **20 条真实生活语料** 做基线回归，并扩展可靠性用例（Voice / Possession / Clarify / Entity）。

测试集来自真实生活表达场景，用于验证 AI Memory 理解能力和可靠性。

| 版本 | 结果 | Pass Rate |
| --- | --- | --- |
| V1.5 | 13 / 20 | **65%** |
| V1.6.1 | 20 / 20 | **100%** |
| V1.6.2 | 38 / 38（含基线 20 + 可靠性 18） | **100%** |

覆盖：复杂位置、同义词、状态更新、借出/归还、历史查询、不确定信息不胡答、多实体与属性区分、语音确认、possession transfer、实体消歧。

---

## Architecture

当前为纯前端实现：

```text
User Input（文本 / 语音）
        ↓
Memory Understanding
  ├─ AI Parser Interface（reserved）
  └─ Rule Parser（current implementation）
        ↓
Validation（confidence / uncertain）
        ↓
State Resolution（Current + History）
        ↓
Memory Store（localStorage）
        ↓
Retrieval & Answer
```

说明：

- **未接入真实 LLM**；AI Parser Interface 为预留层
- 当前理解能力来自 **Rule Parser + Validation + State Resolution + Retrieval**
- 未来可在 Understanding Layer 接入 LLM Structured Output，不改变整体架构

---

## Tech Stack

| 层 | 技术 |
| --- | --- |
| Frontend | HTML / CSS / JavaScript（`memory-plugin-demo.html`） |
| Storage | localStorage |
| Speech | Web Speech API |
| Understanding | Rule Parser + Validation（LLM 接口预留） |
| Version Control | Git / GitHub |

---

## Roadmap

**Future（未完成）：**

- **V1.7** — LLM Memory Understanding：Structured Output + 规则 fallback
- **V2** — Personal Memory Agent：提醒、跨设备同步、更长期个人知识库

原则不变：先可靠，再智能。

---

## Project

- GitHub: https://github.com/ziyi125229/memory-hook
- Demo: https://memory-hook.vercel.app
- Release: [Memory Hook v1.6.2](https://github.com/ziyi125229/memory-hook/releases/tag/v1.6.2)
