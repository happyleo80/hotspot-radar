# Hot Topic Radar 现有开发说明文档

更新时间：2026-05-20  
项目定位：Trustwin 君信品牌管理的 AI Native Marketing OS 原型。当前阶段以「热点雷达 + AI营销知识底座 + 用户权限与积分系统」为核心，但长期目标是构建从 Brief、策略、热点、内容、媒介、Campaign 执行到复盘沉淀的 AI 原生营销操作系统。

说明：本文件保留为当前综合说明。后续团队协作建议优先阅读：

- `docs/01_PRODUCT_ARCHITECTURE.md`：产品架构、OS 定位、知识飞轮、业务系统调用规划。
- `docs/02_DEVELOPMENT_GUIDE.md`：开发结构、模型、接口、环境变量、验证命令。

## 1. 产品定位

本项目不是爬虫系统，而是面向营销策划的热点洞察与案例知识调用系统。

当前目标是：

- 聚合微博、抖音、小红书、知乎、B站热点。
- 识别跨平台共振、上升热点、高营销价值话题和高风险话题。
- 基于 AI 营销知识库，为单个热点生成营销建议。
- 把营销案例转化为可被 AI 调用的知识资产。
- 通过飞书登录和本地权限系统控制不同用户的访问、编辑、审核和入库权限。
- 所有登录后页面叠加用户水印，降低截图外泄和知识产权损失风险。

## 2. 技术栈

前端：

- Next.js App Router
- TypeScript
- Tailwind CSS
- lucide-react 图标
- 自定义轻量 UI 组件：`Button`、`Card`

后端：

- Python FastAPI
- SQLAlchemy
- SQLite 本地开发数据库，保留 PostgreSQL 部署兼容思路
- Deepseek API，用于案例结构化和热点营销建议
- Rebang / TopHub / mock 数据源组合

认证：

- 飞书 OAuth 登录
- 本地 `AUTH_REQUIRED=false` 时使用开发用户
- 用户角色和权限由 `/admin` 管理

## 3. 目录结构

```text
hotspot-radar/
  backend/
    app/
      main.py
      config.py
      database.py
      models/
        topic.py
        marketing.py
      collectors/
        api_clients.py
        mock_data.py
      routers/
        auth.py
        topics.py
        jobs.py
        ai.py
        cases.py
        users.py
        extension.py
        import_export.py
    services/
        topic_service.py
        topic_policy.py
        case_service.py
        user_service.py
        auth_service.py
        ai_service.py
        deepseek_service.py
        settings_service.py
  frontend/
    app/
      page.tsx
      admin/page.tsx
      cases-admin/page.tsx
      cases-admin/[id]/page.tsx
      topics/[id]/page.tsx
      topics-library/page.tsx
      records/page.tsx
      usage/page.tsx
      settings/page.tsx
    components/
      dashboard.tsx
      workspace-shell.tsx
      auth-gate.tsx
      user-watermark.tsx
      recommendation-preview.tsx
    lib/
      api.ts
      topic-policy.ts
  extension/
  docker-compose.yml
  README.md
```

## 4. 当前主要页面

### 4.1 首页工作台 `/`

文件：`frontend/components/dashboard.tsx`

功能：

- 五个平台热点 Tab：全网、微博、抖音、小红书、知乎、B站。
- 最近热点话题列表，最多展示 50 条。
- 跨平台共振话题。
- 高营销价值话题。
- 高风险话题。
- 最近生成内容。
- AI 推荐结果。
- 生成每日简报。
- 刷新页面数据。
- 政治/外交/公共事务等话题显示为“不可分析”，不能触发 AI 营销建议。

刷新逻辑：

- 点击“刷新页面数据”会先调用 `POST /api/jobs/collect`。
- 采集完成后重新加载 `/api/topics`、`/api/topics/resonance`、`/api/topics/rising`、`/api/topics/high-value`、`/api/topics/high-risk`。
- 如果账号没有采集权限，会退回为重新加载最近缓存，并在页面提示。

当前数据排序策略：

- 热点列表只使用最近采集窗口内的数据，避免历史高热话题长期占据榜首。
- 单个平台 Tab 按 `rank` 优先排序。
- 全网 Tab 在最近采集窗口内按热度排序。

### 4.2 AI 营销知识工作台 `/cases-admin`

文件：`frontend/app/cases-admin/page.tsx`

定位：

- 不是 CMS 后台，而是 AI 营销知识资产总览。
- 展示案例如何从原始素材变成可被热点、图文、Campaign、PPT 系统调用的知识资产。

主要模块：

- 原始案例输入 → AI 提炼传播规律 → AI 识别情绪机制 → 人工校正与审核 → 策略标签化 → 知识入库 → 被业务系统调用。
- 知识资产概览。
- 传播模型分布。
- 高价值知识资产。
- 热门知识节点。
- 行业/平台分布。
- 原始素材库。
- AI 结构化工作台。
- 案例审核与修正。
- 知识库标签与规则。

权限：

- 最低权限用户 `viewer` 默认可以浏览。
- 上传、AI 结构化、编辑、审核、RAG 入库等按钮按权限显示。

### 4.3 案例详情页 `/cases-admin/[id]`

文件：`frontend/app/cases-admin/[id]/page.tsx`

定位：

- 展示 AI 对单个营销案例“理解到了什么”，而不是展示原始 JSON。

主要模块：

- 原始案例素材。
- 可被调用的系统。
- 知识资产生命周期。
- AI 核心传播洞察。
- AI 传播模型。
- 为什么成功。
- 情绪机制。
- 用户心理洞察。
- 内容结构模型。
- AI 可调用策略模板。
- 平台打法。
- 风险点。
- 适用/不适用行业。
- 相似案例。
- 可关联热点。
- 折叠的原始结构化 JSON。
- 折叠的人工编辑区。

### 4.4 管理后台 `/admin`

文件：`frontend/app/admin/page.tsx`

功能：

- 飞书用户管理。
- 用户角色分配。
- 案例知识库权限授权。
- 积分调整。
- DeepSeek 大模型配置。
- Embedding 向量模型配置。
- Embedding 连接测试。
- 批量向量化高价值案例。
- AI 使用记录。
- AI 按钮数据。
- 积分消耗趋势。

页面风格：

- 已统一为 AI OS 浅色蓝紫风格。
- 入口名称为“AI营销知识工作台”。

### 4.5 我的话题库 `/topics-library`

文件：

- `frontend/app/topics-library/page.tsx`
- `frontend/components/recommendation-preview.tsx`

定位：

- 用户自己的热点策略资产库。
- 展示用户点击 AI 建议后生成的话题策划结果。

当前能力：

- 卡片式展示全部 AI 话题策划记录。
- 卡片内容使用结构化预览，不直接显示 Markdown 原文。
- 每张卡片显示话题标题、案例引用数量、生成时间。
- 支持收藏 / 取消收藏。
- 支持“全部 / 已收藏”筛选。
- 收藏状态保存到后端 `TopicRecommendation.is_favorite`。
- 可点击进入对应话题详情页。

### 4.6 用量统计 `/usage`

文件：

- `frontend/app/usage/page.tsx`

定位：

- 用户侧查看自己分析过哪些话题，不是后台 AI 调用日志表。

当前展示：

- 当前积分。
- 累计消耗。
- AI 使用次数。
- 话题积分账单：话题标题、用途、生成时间、案例引用。

展示原则：

- 不直接展示 `topic_marketing_recommendation` 这类后台 action。
- 不展示 `topic #id` 作为主要对象。
- 不向普通用户显示底层模型名。
- 每次热点 AI 建议固定 10 积分，因此用户侧不单独展示积分列；管理后台仍可查看完整成本记录。

### 4.7 账户设置 `/settings`

文件：

- `frontend/app/settings/page.tsx`

当前展示：

- 飞书头像。
- 用户名。
- 邮箱。
- 权限角色。
- 当前积分。
- 累计消耗。
- Open ID。
- 最近访问时间。

飞书头像说明：

- 后端 `exchange_feishu_code()` 已读取并保存 `avatar_url`。
- 如果飞书后台权限或返回数据未包含头像，前端会显示姓名首字占位。

### 4.8 用户水印

文件：

- `frontend/components/auth-gate.tsx`
- `frontend/components/user-watermark.tsx`

说明：

- 登录校验通过后，`AuthGate` 会在所有业务页面叠加水印。
- 水印内容仅包含当前用户姓名和当天日期。
- 水印使用普通字重、较低密度和较大间距，避免在手机浏览模式中过度遮挡页面。
- 水印为全屏固定覆盖层，`pointer-events: none`，不影响页面操作。
- 登录页和未授权提示页不显示水印。
- 水印只是截图追溯和知识产权保护的辅助措施，不能替代后端权限校验。

### 4.9 用户权限与安全边界

- 前端根据权限隐藏按钮。
- 后端负责接口校验。
- 敏感配置 Key 只返回脱敏结果。
- 用户水印用于截图追溯。

## 5. 后端核心数据模型

### 5.1 Topic

文件：`backend/app/models/topic.py`

核心字段：

- `platform`
- `source_type`
- `title`
- `normalized_title`
- `rank`
- `heat_score`
- `url`
- `category`
- `collected_at`
- `first_seen_at`
- `last_seen_at`

### 5.2 MarketingCase

文件：`backend/app/models/marketing.py`

营销知识资产核心字段：

- `title`
- `brand`
- `industry`
- `raw_text`
- `source_category`
- `platform`
- `pipeline_stage`
- `structure_status`
- `review_status`
- `reference_value`
- `knowledge_score`
- `structured_json`
- `ai_core_insight`
- `marketing_model`
- `marketing_model_definition`
- `sub_models`
- `emotional_mechanisms`
- `user_psychology_insights`
- `content_structure_model`
- `repeatable_patterns`
- `reusable_strategy_template`
- `platform_strategy`
- `risk_points`
- `suitable_industries`
- `unsuitable_industries`
- `embedding_status`
- `embedding_keywords`
- `embedding_vector`
- `embedding_error`
- `embedding_dimension`
- `rag_enabled`
- `callable_by_hotspot`
- `callable_by_content`
- `callable_by_campaign`
- `callable_by_ppt`

### 5.3 TopicRecommendation

文件：`backend/app/models/marketing.py`

保存用户对热点生成的 AI 营销建议。

核心字段：

- `user_id`
- `topic_id`
- `case_id`
- `prompt_topic`
- `recommendation`
- `points_used`
- `model`
- `is_favorite`
- `created_at`

说明：

- `recommendation` 仍保存 Markdown 原文，便于未来导出和复用。
- 前端通过 `RecommendationPreview` 解析为结构化卡片展示。
- `is_favorite` 支持“我的话题库”收藏筛选。

### 5.4 TopicRecommendationCaseRef

文件：`backend/app/models/marketing.py`

用于记录热点 AI 建议引用了哪些案例。

核心字段：

- `recommendation_id`
- `case_id`
- `match_score`
- `match_reason`
- `used_insight`
- `created_at`

### 5.5 UserAccount

文件：`backend/app/models/marketing.py`

核心字段：

- `open_id`
- `union_id`
- `name`
- `email`
- `avatar_url`
- `role`
- `permissions`
- `points_balance`
- `total_points_used`
- `last_seen_at`

## 6. 用户角色与权限

文件：`backend/app/services/user_service.py`

当前角色：

- `viewer`：普通用户，默认拥有 `case_view`，可以浏览 AI 营销知识。
- `analyst`：分析查看者。
- `contributor`：案例贡献者。
- `reviewer`：案例审核者。
- `admin`：管理员。
- `super_admin`：超级管理员。

当前权限：

- `admin_access`：进入管理后台。
- `user_manage`：用户与权限管理。
- `settings_manage`：系统与模型配置。
- `case_view`：查看案例知识库。
- `case_upload`：上传/导入原始案例。
- `case_structure`：触发 AI 结构化。
- `case_edit`：编辑 AI 结构化结果。
- `case_review`：审核案例入库。
- `case_embed`：加入 RAG / 热点策略库。
- `case_delete`：删除案例。
- `tag_manage`：管理标签规则。

权限控制原则：

- 前端负责按钮显示。
- 后端负责接口校验。
- 外部开发时不能只依赖前端隐藏按钮。

## 7. 热点数据链路

主要文件：

- `backend/app/collectors/api_clients.py`
- `backend/app/services/topic_service.py`
- `backend/app/routers/jobs.py`
- `backend/app/routers/topics.py`

数据源优先级：

1. Rebang API
2. TopHub 页面解析
3. mock 数据兜底

当前 Rebang 来源：

- 知乎：`https://rebang.today/?tab=zhihu`
- 小红书：`https://rebang.today/?tab=xiaohongshu`
- 微博：`https://rebang.today/?tab=weibo`
- B站：`https://rebang.today/?tab=bilibili`
- 抖音：`https://rebang.today/?tab=douyin`

采集接口：

- `POST /api/jobs/collect`
- `POST /api/jobs/collect/{platform}`

展示接口：

- `GET /api/topics`
- `GET /api/topics?platform=weibo`
- `GET /api/topics/resonance`
- `GET /api/topics/rising`
- `GET /api/topics/high-value`
- `GET /api/topics/high-risk`

重要实现说明：

- `list_topics()` 使用最近采集窗口，避免历史高热旧数据占据当前榜单。
- `resonance_topics()` 使用最近采集窗口做跨平台聚类。
- `rising_topics()`、`high_value_topics()`、`high_risk_topics()` 也已使用最近采集窗口。

## 8. AI 营销建议链路

入口：

- 首页热点列表里的“AI建议”按钮。

前端调用：

- `frontend/components/dashboard.tsx`
- `api.recommend(topic.id)`

后端接口：

- `POST /api/ai/recommend/topic/{topic_id}`

后端链路：

```text
AI建议按钮
→ /api/ai/recommend/topic/{topic_id}
→ recommend_for_topic()
→ search_relevant_cases()
→ 召回 AI 营销知识库案例
→ 拼接热点 + 案例上下文
→ 调用 Deepseek
→ 生成营销建议
→ 保存到 TopicRecommendation
→ 扣除用户积分
```

当前已确认：

- AI 建议已经调用 AI 营销知识库。
- 首页和话题详情页会显示是否调用 AI 营销知识库，以及引用案例数量。
- 话题详情页不再直接显示 Markdown 黑底，而是使用结构化建议卡片。
- 用户界面不强调底层模型名；管理后台和日志仍保留模型字段。
- 当前可被热点调用的案例数量较少，建议后续批量将高价值案例加入 RAG/热点策略库。

政治/公共事务拦截：

- 前端：`frontend/lib/topic-policy.ts`
- 后端：`backend/app/services/topic_policy.py`
- 后端接口：`POST /api/ai/analyze/topic/{topic_id}`、`POST /api/ai/recommend/topic/{topic_id}`
- 涉及政治、外交、公共治理、执法司法、军事冲突、国际关系等话题时，系统返回不可分析，不生成营销建议。

## 9. 案例知识库生产链路

主要文件：

- `backend/app/services/case_service.py`
- `backend/app/routers/cases.py`
- `frontend/app/cases-admin/page.tsx`
- `frontend/app/cases-admin/[id]/page.tsx`

状态流：

```text
raw
→ ai_structured
→ human_reviewed
→ approved
→ embedded
→ active
```

页面表达：

```text
原始案例输入
→ AI提炼传播规律
→ AI识别情绪机制
→ 人工校正与审核
→ 策略标签化
→ 知识入库
→ 被业务系统调用
```

关键动作：

- 新增原始素材：`POST /api/cases/raw-materials`
- AI 结构化：`POST /api/cases/{case_id}/structure`
- 审核通过：`POST /api/cases/{case_id}/approve`
- 退回重跑：`POST /api/cases/{case_id}/rerun`
- 加入热点策略库：`POST /api/cases/{case_id}/embed`
- 相似案例：`GET /api/cases/{case_id}/similar`
- 可关联热点：`GET /api/cases/{case_id}/related-topics`

## 10. Deepseek 配置

管理入口：

- `/admin`

接口：

- `GET /api/users/admin/settings`
- `POST /api/users/admin/settings`
- `POST /api/users/admin/settings/embedding/test`
- `POST /api/cases/embed-all`
- `POST /api/cases/{case_id}/embed`

说明：

- DeepSeek Key 存储在后端设置表中。
- Embedding Key、Provider、Base URL、模型、维度和启用状态也存储在后端设置表中。
- 管理后台只显示脱敏 Key。
- 输入新 Key 后保存即可覆盖。
- DeepSeek 是“大脑”，负责案例结构化和策略生成；Embedding 是“记忆索引”，负责案例向量化和未来语义召回。

## 11. 环境变量

示例：

```env
AUTH_REQUIRED=true
AUTH_SESSION_SECRET=一段长随机字符串
FEISHU_APP_ID=你的飞书 app id
FEISHU_APP_SECRET=你的飞书 app secret
FEISHU_REDIRECT_URI=http://你的域名或IP:8000/api/auth/feishu/callback
FRONTEND_URL=http://你的域名或IP:3000
CORS_ORIGINS=http://你的域名或IP:3000,http://localhost:3000,http://127.0.0.1:3000
DATABASE_URL=sqlite:///./hotspot_radar.db
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o-mini
LLM_PROVIDER=deepseek
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
EMBEDDING_PROVIDER=mock
EMBEDDING_API_KEY=
EMBEDDING_BASE_URL=https://open.bigmodel.cn/api/paas/v4/embeddings
EMBEDDING_MODEL=embedding-3
EMBEDDING_DIMENSION=1024
EMBEDDING_ENABLED=false
TIANAPI_KEY=
ALAPI_KEY=
TOPHUB_API_KEY=
```

本地开发时可使用：

```env
AUTH_REQUIRED=false
DATABASE_URL=sqlite:///./hotspot_radar.db
```

注意：

- 不要把真实 `.env` 提交到 Git。
- `.env.example` 只保留占位符。

## 12. 本地启动

后端：

```bash
cd "/Users/leochenair/Documents/New project 2/hotspot-radar/backend"
. ../.venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

前端：

```bash
cd "/Users/leochenair/Documents/New project 2/hotspot-radar/frontend"
NEXT_PUBLIC_API_BASE=http://localhost:8000 npm run dev -- -H 0.0.0.0 -p 3000
```

访问：

- 前端：`http://localhost:3000`
- 后端文档：`http://localhost:8000/docs`

## 13. 常用验证命令

后端编译：

```bash
cd "/Users/leochenair/Documents/New project 2/hotspot-radar"
python3 -m compileall backend/app
```

前端构建：

```bash
cd "/Users/leochenair/Documents/New project 2/hotspot-radar/frontend"
npm run build
```

采集热点：

```bash
curl -X POST http://localhost:8000/api/jobs/collect
```

查看各平台热点：

```bash
curl http://localhost:8000/api/topics
curl "http://localhost:8000/api/topics?platform=douyin"
curl "http://localhost:8000/api/topics?platform=bilibili"
```

查看跨平台共振：

```bash
curl http://localhost:8000/api/topics/resonance
```

查看用户权限：

```bash
curl http://localhost:8000/api/users/me/permissions
```

查看我的话题库：

```bash
curl http://localhost:8000/api/users/me/recommendations
```

收藏 / 取消收藏某条 AI 建议：

```bash
curl -X PATCH http://localhost:8000/api/users/me/recommendations/9/favorite \
  -H 'Content-Type: application/json' \
  -d '{"is_favorite":true}'
```

查看案例知识库：

```bash
curl http://localhost:8000/api/cases
```

测试 Embedding：

```bash
curl -X POST http://localhost:8000/api/users/admin/settings/embedding/test -H 'Content-Type: application/json' -d '{"text":"测试向量模型连接"}'
curl -X POST http://localhost:8000/api/cases/embed-all
```

## 14. 当前已知限制

1. RAG 的配置和向量化链路已经具备最小能力，但相似案例/热点匹配仍主要是关键词和规则召回，还没有迁移到 pgvector 语义召回。
2. 当前可被热点调用的案例数量较少，需要批量审核并加入热点策略库。
3. Rebang / TopHub 属于第三方数据来源，稳定性依赖对方接口。
4. 小红书、抖音、B站部分数据仍建议通过授权 API 或用户主动 Chrome 插件补采。
5. SQLite 适合本地开发，正式多人使用建议迁移 PostgreSQL。
6. 权限系统已经建立，但还没有完整操作审计日志。
7. 管理后台可配置 Deepseek，但还没有模型调用成本的精细价格配置。
8. Chrome 插件是补充采集，不应做自动登录、Cookie 上传、验证码绕过或高频请求。
9. 政治/公共事务拦截当前主要基于关键词规则，后续可升级为可配置的品牌安全策略规则库。
10. “我的话题库”收藏已支持，但还没有收藏夹分组、标签和批量导出。

## 15. 建议下一阶段迭代

优先级一：

- 批量把高价值案例加入 RAG / 热点策略库。
- 将当前 embedding 文本存储迁移到 PostgreSQL + pgvector，并让相似案例/热点匹配优先走向量召回。
- 在 AI 建议结果中明确展示“引用了哪些案例”。
- 给每次 AI 建议保存召回案例列表和匹配原因。
- 增加操作日志：谁上传、谁结构化、谁审核、谁入库。
- 为“我的话题库”增加收藏夹分组、标签和导出。

优先级二：

- 将数据库迁移到 PostgreSQL。
- 增加 APScheduler 定时采集，每 30 分钟刷新一次热点。
- 增加企业部署脚本和反向代理配置。
- 完善 Chrome 插件采集预览和上传链路。
- 增加案例知识节点详情页。

优先级三：

- 接入图文生产系统。
- 接入 Campaign 执行系统。
- 接入 PPT 提案系统。
- 建立真正的 AI Marketing Knowledge Graph。

## 16. 给外部开发团队的注意事项

- 不要把该系统改成爬虫平台。
- 不要实现绕过平台登录、验证码、Cookie 上传、Token 上传。
- 优先复用授权 API、第三方数据服务和用户主动采集。
- 前端按钮隐藏不是权限安全，后端必须保留权限校验。
- AI 营销知识库是核心资产，不是普通案例 CMS。
- 所有 AI 输出应保留人工审核入口，正式进入知识库前需要人工判断。
- 热点营销建议必须考虑品牌安全和政治/公共议题风险。
