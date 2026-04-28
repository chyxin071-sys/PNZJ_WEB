# Claude AI 使用指南

> 本文档记录如何使用 Claude AI 辅助开发，包括 Skills 推荐、使用技巧、省 Token 方法等。

---

## 📋 为什么用 Claude？

**优势**：
- **代码能力强**：理解复杂业务逻辑，生成高质量代码
- **上下文长**：可以一次性处理大量代码文件
- **工具丰富**：内置文件读写、搜索、执行命令等工具
- **Skills 扩展**：通过 Skills 增强特定场景能力
- **中文友好**：理解中文需求，生成中文注释

**适用场景**：
- 快速搭建项目框架
- 编写重复性代码（CRUD、API）
- 代码重构和优化
- Bug 调试和修复
- 文档编写
- 技术方案设计

---

## 🛠️ 推荐的 Skills

### 1. brainstorming（头脑风暴）

**功能**：在开始写代码前，帮你理清需求、设计方案

**使用场景**：
- 要做一个新功能，但不知道怎么设计
- 需要技术选型建议
- 想要评估方案的优缺点

**触发方式**：
```
/brainstorming

或者直接说：
"我想做一个客户管理功能，帮我设计一下"
```

**优点**：
- 避免直接写代码导致返工
- 提供多个方案对比
- 考虑边界情况和潜在问题

**示例**：
```
你：我想做一个工地进度分享功能，业主可以查看工地照片和进度
Claude：让我帮你梳理一下需求...
  1. 业主如何访问？（二维码/链接）
  2. 需要验证身份吗？（手机号验证）
  3. 可以看到哪些信息？（照片/进度/不能看报价）
  4. 员工如何管理权限？（审批机制）
  ...
```

**安装方式**：
- 内置 Skill，无需安装
- 链接：https://github.com/cline/cline/tree/main/skills/brainstorming

---

### 2. systematic-debugging（系统化调试）

**功能**：遇到 Bug 时，系统化地排查问题

**使用场景**：
- 代码报错，不知道原因
- 功能不符合预期
- 数据显示异常

**触发方式**：
```
/systematic-debugging

或者直接说：
"跟进记录排序乱了，帮我查一下"
```

**优点**：
- 不会盲目猜测，而是系统化排查
- 检查日志、数据、代码逻辑
- 给出根本原因和解决方案

**示例**：
```
你：小程序端跟进记录排序乱了
Claude：让我系统化排查...
  1. 先看数据库中的 createdAt 字段格式
  2. 检查排序代码逻辑
  3. 发现问题：createdAt 有三种格式，字符串比较失效
  4. 解决方案：统一解析为时间戳再排序
```

**安装方式**：
- 内置 Skill，无需安装

---

### 3. verification-before-completion（完成前验证）

**功能**：在声称"完成"之前，强制验证功能是否真的可用

**使用场景**：
- 修复 Bug 后，确认真的修好了
- 开发新功能后，确认能正常运行
- 避免"看起来对，实际不行"的情况

**触发方式**：
```
/verification-before-completion

或者 Claude 会自动在完成任务前触发
```

**优点**：
- 减少返工
- 确保代码可以直接运行
- 发现潜在问题

**示例**：
```
Claude：我已经修复了跟进记录排序问题
  → 触发 verification-before-completion
  → 检查代码语法
  → 模拟数据测试排序逻辑
  → 确认修复成功
```

**安装方式**：
- 内置 Skill，无需安装

---

### 4. react-best-practices（React 最佳实践）

**功能**：编写 React/Next.js 代码时，自动应用最佳实践

**使用场景**：
- 写 Web 端页面
- 优化性能
- 代码重构

**触发方式**：
- 自动触发（当你写 React 代码时）

**优点**：
- 避免常见错误（如 useEffect 依赖问题）
- 性能优化（useMemo、useCallback）
- 代码更规范

**安装方式**：
- 内置 Skill，无需安装

---

### 5. planning-with-files（文件化计划）

**功能**：把复杂任务拆解成多个步骤，记录在文件中，逐步执行

**使用场景**：
- 大型功能开发（如"做一个完整的客户管理模块"）
- 多文件修改
- 需要分阶段完成的任务

**触发方式**：
```
/planning-with-files

或者直接说：
"帮我规划一下如何实现设计工作流功能"
```

**优点**：
- 任务清晰，不会遗漏
- 可以随时暂停和恢复
- 记录进度和发现

**示例**：
```
Claude：我会创建以下文件来管理任务：
  - task_plan.md：任务拆解和步骤
  - findings.md：开发过程中的发现
  - progress.md：完成进度

然后逐步执行每个步骤...
```

**安装方式**：
- 内置 Skill，无需安装

---

### 6. skill-creator（技能创建器）

**功能**：创建自定义 Skill，扩展 Claude 的能力

**使用场景**：
- 有重复性的工作流程，想自动化
- 想针对特定场景优化 Claude 的行为

**触发方式**：
```
/skill-creator

或者直接说：
"帮我创建一个 Skill，用于生成数据库迁移脚本"
```

**优点**：
- 高度定制化
- 可以分享给团队使用

**安装方式**：
- 内置 Skill，无需安装

---

## 💡 使用技巧

### 1. 明确描述需求

**❌ 不好的提问**：
```
"帮我改一下客户列表"
```

**✅ 好的提问**：
```
"客户列表页面（leads/page.tsx）需要加一个筛选功能：
1. 可以按状态筛选（待跟进/已报价/已签单）
2. 可以按负责人筛选
3. 筛选条件要保存到 URL，刷新页面不丢失"
```

### 2. 提供上下文

**❌ 不好的提问**：
```
"跟进记录排序有问题"
```

**✅ 好的提问**：
```
"小程序端客户详情页（leadDetail/index.js）的跟进记录排序有问题，
应该按时间倒序显示，但现在顺序是乱的。
数据库中 createdAt 字段可能有多种格式（对象/数字/字符串）。"
```

### 3. 分步骤执行

**❌ 一次性要求太多**：
```
"帮我做一个完整的客户管理系统，包括列表、详情、新增、编辑、删除、
跟进记录、状态变更、报价、签单、通知、权限控制..."
```

**✅ 分步骤**：
```
第一步："先帮我做客户列表页，显示姓名、电话、状态、负责人"
第二步："再做客户详情页，显示完整信息"
第三步："加上跟进记录功能"
...
```

### 4. 利用已有代码

**✅ 参考现有实现**：
```
"参考 leads/page.tsx 的实现，帮我做一个工地列表页（projects/page.tsx），
布局和功能类似，但数据来源是 projects 集合"
```

### 5. 及时反馈

**✅ 告诉 Claude 结果**：
```
你："帮我修复跟进记录排序问题"
Claude：[修改代码]
你："测试了，现在排序正常了，但是时间显示格式不对"
Claude：[继续修改]
```

---

## 🚀 省 Token 的方法

### 1. 使用 Grep 而不是 Read

**❌ 浪费 Token**：
```
"帮我读一下所有页面文件，找出哪里用了 localStorage"
→ Claude 会读取所有文件，消耗大量 Token
```

**✅ 高效搜索**：
```
"用 Grep 搜索项目中所有使用 localStorage 的地方"
→ Claude 只返回匹配的行，Token 消耗少
```

### 2. 明确指定文件

**❌ 让 Claude 猜**：
```
"帮我改一下客户列表的样式"
→ Claude 需要先搜索文件，再读取，再修改
```

**✅ 直接指定**：
```
"修改 web/src/app/leads/page.tsx，把客户卡片的背景色改为白色"
→ Claude 直接修改，省时省 Token
```

### 3. 使用 Edit 而不是 Write

**❌ 重写整个文件**：
```
"帮我修改 leads/page.tsx，加一个搜索框"
→ Claude 可能会重写整个文件
```

**✅ 只修改需要的部分**：
```
"在 leads/page.tsx 的第 50 行后面加一个搜索框组件"
→ Claude 使用 Edit 工具，只发送修改的部分
```

### 4. 批量操作

**❌ 一个个改**：
```
"帮我把 leads/page.tsx 的 localStorage 改成 pnzj_user"
"再帮我把 projects/page.tsx 的 localStorage 改成 pnzj_user"
"再帮我把 quotes/page.tsx 的..."
```

**✅ 一次性批量**：
```
"用 Grep 搜索所有使用 localStorage.getItem('user') 的地方，
然后批量替换为 localStorage.getItem('pnzj_user')"
```

### 5. 清理上下文

**✅ 定期清理**：
```
当对话很长时，可以用 /clear 清空上下文，
然后重新开始新的任务。

注意：清空后 Claude 会忘记之前的对话，
但项目文件和 MEMORY.md 中的记忆会保留。
```

---

## 📚 常见问题

### Q1：Claude 生成的代码有错误怎么办？

**A**：
1. 告诉 Claude 具体的错误信息（报错日志、截图）
2. 让 Claude 用 systematic-debugging 排查
3. 如果多次修复失败，换一个思路或手动修改

### Q2：Claude 理解错了我的需求怎么办？

**A**：
1. 用更明确的语言重新描述
2. 提供示例或参考
3. 使用 brainstorming 先对齐需求

### Q3：Claude 修改了不该改的文件怎么办？

**A**：
1. 用 Git 回退：`git checkout -- 文件路径`
2. 告诉 Claude 不要改这个文件
3. 下次提问时明确指定要修改的文件

### Q4：如何让 Claude 记住项目的特殊规则？

**A**：
1. 写在 `MEMORY.md` 中（自动加载到上下文）
2. 写在 `CLAUDE.md` 中（项目级配置）
3. 每次对话时重复强调

### Q5：Claude 生成的代码风格和项目不一致怎么办？

**A**：
1. 在 MEMORY.md 中记录项目的代码规范
2. 提供现有代码作为参考
3. 让 Claude 用 simplify 技能优化代码

---

## 🔗 推荐资源

### 官方文档
- Claude API 文档：https://docs.anthropic.com/
- Claude Code 文档：https://github.com/anthropics/claude-code

### Skills 仓库
- 官方 Skills：https://github.com/cline/cline/tree/main/skills
- 社区 Skills：https://github.com/topics/claude-skill

### 学习资源
- Prompt Engineering 指南：https://www.promptingguide.ai/
- Claude 最佳实践：https://docs.anthropic.com/claude/docs/prompt-engineering

---

## 📝 本项目使用的 Skills

### 已安装的 Skills

1. **brainstorming** - 需求分析和方案设计
2. **systematic-debugging** - Bug 排查
3. **verification-before-completion** - 完成前验证
4. **react-best-practices** - React 最佳实践
5. **planning-with-files** - 文件化计划
6. **skill-creator** - 创建自定义 Skill
7. **claude-api** - Claude API 开发
8. **frontend-slides** - 创建演示文稿
9. **executing-plans** - 执行计划
10. **simplify** - 代码简化和优化
11. **supabase-postgres-best-practices** - 数据库最佳实践
12. **webapp-testing** - Web 应用测试
13. **writing-plans** - 编写计划

### 推荐安装的 Skills

**如果你要做其他项目，可以考虑安装**：

1. **git-workflow** - Git 工作流自动化
   - 自动提交、推送、创建 PR
   - 链接：https://github.com/cline/cline/tree/main/skills/git-workflow

2. **api-documentation** - API 文档生成
   - 自动生成 OpenAPI/Swagger 文档
   - 链接：https://github.com/cline/cline/tree/main/skills/api-documentation

3. **database-migration** - 数据库迁移
   - 生成迁移脚本
   - 链接：https://github.com/cline/cline/tree/main/skills/database-migration

4. **testing-automation** - 测试自动化
   - 生成单元测试、集成测试
   - 链接：https://github.com/cline/cline/tree/main/skills/testing-automation

### 如何安装 Skills

**方法1：通过 Claude Code 安装**
```
你："帮我安装 git-workflow skill"
Claude：[自动下载并安装]
```

**方法2：手动安装**
```bash
# 1. 克隆 Skills 仓库
git clone https://github.com/cline/cline.git

# 2. 复制 Skill 到 Claude Code 的 skills 目录
cp -r cline/skills/git-workflow ~/.claude/skills/

# 3. 重启 Claude Code
```

**方法3：使用 skill-creator 创建自定义 Skill**
```
你："帮我创建一个 Skill，用于生成微信小程序页面模板"
Claude：[使用 skill-creator 创建]
```

---

## 💬 与 Claude 协作的最佳实践

### 1. 把 Claude 当成高级助手，不是魔法师

- Claude 很强，但不是万能的
- 复杂的业务逻辑需要你来设计
- Claude 负责实现和优化

### 2. 保持对话的连贯性

- 一个功能开发完再开始下一个
- 不要在一个对话中跳来跳去
- 如果要换主题，可以 /clear 重新开始

### 3. 及时记录重要信息

- 重要的决策写到 MEMORY.md
- 遇到的坑写到文档中
- 不要依赖 Claude 的记忆（会被清空）

### 4. 善用 Git

- 每完成一个功能就提交
- 方便回退和对比
- Claude 也可以帮你提交（但要检查）

### 5. 定期复盘

- 每周回顾一下开发进度
- 总结哪些地方 Claude 帮助很大
- 哪些地方需要改进

---

**最后更新**：2026-04-27
**维护者**：XIN
