# AI Native Marketing OS 开发指南

更新时间：2026-05-20

## 1. 技术栈

前端：

- Next.js App Router
- TypeScript
- Tailwind CSS
- lucide-react

后端：

- FastAPI
- SQLAlchemy
- SQLite 本地开发
- PostgreSQL + pgvector 作为下一阶段目标
- DeepSeek OpenAI-compatible API

认证：

- 飞书 OAuth
- 本地开发可设置 `AUTH_REQUIRED=false`

## 2. 关键目录

```text
backend/app/models/topic.py
backend/app/models/marketing.py
backend/app/services/topic_service.py
backend/app/services/case_service.py
backend/app/services/user_service.py
backend/app/routers/topics.py
backend/app/routers/cases.py
backend/app/routers/users.py
backend/app/routers/ai.py
frontend/components/dashboard.tsx
frontend/components/auth-gate.tsx
frontend/components/user-watermark.tsx
frontend/components/workspace-shell.tsx
frontend/components/recommendation-preview.tsx
frontend/app/admin/page.tsx
frontend/app/cases-admin/page.tsx
frontend/app/cases-admin/[id]/page.tsx
frontend/app/topics/[id]/page.tsx
frontend/app/topics-library/page.tsx
frontend/app/usage/page.tsx
frontend/app/settings/page.tsx
frontend/lib/api.ts
frontend/lib/topic-policy.ts
backend/app/services/topic_policy.py
```

## 3. LLM 环境变量

DeepSeek 使用 OpenAI-compatible API 格式。为避免语义混乱，下一阶段推荐统一使用 `LLM_*` 命名。

推荐：

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

当前兼容：

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=
```

后端读取优先级：

```text
系统设置表 DeepSeek 配置
→ LLM_* 环境变量
→ DEEPSEEK_* 环境变量
→ OPENAI_* 兼容变量
```

## 3.1 Embedding 环境变量

DeepSeek 是“大脑”，Embedding 是“记忆索引”。当前后台 `/admin` 已支持配置向量模型，用于案例向量化、相似案例检索、热点匹配案例，以及未来图文 / Campaign / PPT 调用。

推荐：

```env
EMBEDDING_PROVIDER=mock
EMBEDDING_API_KEY=
EMBEDDING_BASE_URL=https://open.bigmodel.cn/api/paas/v4/embeddings
EMBEDDING_MODEL=embedding-3
EMBEDDING_DIMENSION=1024
EMBEDDING_ENABLED=false
```

Provider 可选：

- `zhipu`
- `xinference_bge_m3`
- `openai`
- `mock`

说明：

- `mock` 用于本地开发，不调用外部服务，会生成稳定的伪向量。
- `zhipu`、`xinference_bge_m3`、`openai` 当前按 OpenAI-compatible embeddings 响应格式读取 `data[0].embedding`。
- API Key 通过 settings_service 脱敏返回，前端不显示明文。

## 4. 核心数据模型

### MarketingCase

重点字段：

- `ai_core_insight`
- `why_it_worked`
- `marketing_model`
- `marketing_model_definition`
- `marketing_model_confidence`
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
- `reviewed_by`
- `reviewed_at`
- `approved_by`
- `approved_at`
- `embedded_at`
- `embedding_status`
- `embedding_keywords`
- `embedding_vector`
- `embedding_error`
- `embedding_dimension`
- `last_called_at`
- `call_count`
- `feedback_score`
- `callable_by_hotspot`
- `callable_by_content`
- `callable_by_campaign`
- `callable_by_ppt`

### TopicRecommendationCaseRef

用于 AI 建议引用案例透明度。

字段：

- `recommendation_id`
- `case_id`
- `match_score`
- `match_reason`
- `used_insight`
- `created_at`

### TopicRecommendation

用于保存用户对单个热点生成的 AI 营销建议。

重点字段：

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

- `is_favorite` 用于“我的话题库”的收藏筛选。
- SQLite 本地开发通过 `ensure_runtime_schema()` 自动补 `topic_recommendations.is_favorite`。
- 用户收藏接口只允许用户修改自己的推荐记录。

### AuditLog

用于知识资产治理与权限审计。

字段：

- `user_id`
- `action`
- `resource_type`
- `resource_id`
- `before_snapshot`
- `after_snapshot`
- `ip`
- `user_agent`
- `created_at`

应记录：

- 上传案例
- AI 结构化
- 人工编辑
- 审核通过
- 退回重跑
- 加入 RAG
- 加入热点策略库
- 删除案例
- 调整用户权限
- 调整积分
- 修改 DeepSeek 配置

### AIActionPricing

用于未来商业化和成本控制。

字段：

- `action_type`
- `points_cost`
- `estimated_token_cost`
- `enabled`

建议动作类型：

- `case_structure`
- `case_rerun`
- `topic_recommendation`
- `daily_brief`
- `similar_case_search`
- `related_topic_search`

## 5. AI 调用记录

`AiUsageLog` 已包含：

- `model`
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `points_used`
- `points_charged`
- `cost_estimate`
- `duration_ms`
- `success`
- `error_message`

后续建议所有 LLM 调用统一写入该表。

用户侧展示原则：

- `/usage` 不直接展示 `action`、`target_type #id`、模型名等后台字段。
- 当前展示为“话题积分账单”：话题标题、用途、生成时间、案例引用。
- 每次热点 AI 建议固定消耗 10 积分，用户侧不需要单独显示积分列；管理后台仍可查看完整成本和模型信息。

## 5.1 话题库收藏接口

接口：

```http
GET /api/users/me/recommendations
PATCH /api/users/me/recommendations/{recommendation_id}/favorite
```

`PATCH` 请求：

```json
{
  "is_favorite": true
}
```

响应：

```json
{
  "id": 9,
  "topic_id": 245,
  "prompt_topic": "热点话题标题",
  "is_favorite": 1
}
```

前端文件：

- `frontend/app/topics-library/page.tsx`
- `frontend/components/recommendation-preview.tsx`

实现说明：

- 收藏按钮位于话题卡右上角。
- 页面提供“全部 / 已收藏”筛选。
- 推荐内容用 `RecommendationPreview` 做结构化预览，避免直接显示 Markdown 原文。

## 5.2 政治/公共事务话题拦截

文件：

- `frontend/lib/topic-policy.ts`
- `backend/app/services/topic_policy.py`
- `backend/app/routers/ai.py`

规则：

- 政治、外交、公共治理、执法司法、军事冲突、国际关系等话题不提供营销借势分析。
- 前端状态显示“不可分析”，AI 按钮禁用。
- 后端 `POST /api/ai/analyze/topic/{id}` 和 `POST /api/ai/recommend/topic/{id}` 同步拦截。

注意：

- 前后端关键词需要尽量保持一致。
- 该规则用于品牌安全边界，不用于新闻判断。

## 6. 热点数据源健康状态规划

现状：

- Rebang / TopHub / mock 组合。
- 展示层已使用最近采集窗口，避免历史旧数据污染。

建议新增数据源状态模型：

- `source_name`
- `source_url`
- `update_frequency`
- `last_success_at`
- `last_failed_at`
- `failure_count`
- `enabled`
- `fallback_source`

规划接口：

- `GET /api/jobs/sources/status`

前端展示示例：

- 微博：正常 / 最近更新时间
- 抖音：失败 / 使用 mock 兜底
- 小红书：正常 / 来源 Rebang
- B站：正常 / 来源 TopHub
- 知乎：正常 / 来源 Rebang

## 6.1 用户水印

文件：

- `frontend/components/user-watermark.tsx`
- `frontend/components/auth-gate.tsx`

实现方式：

- `AuthGate` 在登录校验通过后渲染 `UserWatermark`。
- 水印固定覆盖全屏，`pointer-events: none`，不影响页面点击。
- 水印内容仅包含用户姓名和当天日期。
- 水印使用普通字重、较低密度和较大间距，避免在手机浏览模式中过度遮挡页面。
- 登录页和未授权提示页不显示水印。

注意：

- 水印是知识产权保护的前端辅助措施。
- 不应把水印当作权限安全边界。
- 后端接口仍必须执行登录、角色、权限和审计校验。

## 7. Chrome 插件接口契约

接口：

```http
POST /api/extension/collect
```

请求：

```json
{
  "platform": "xiaohongshu",
  "page_url": "",
  "items": [
    {
      "title": "",
      "url": "",
      "rank": null,
      "heat_score": null,
      "author_name": "",
      "raw_text": "",
      "collected_at": ""
    }
  ]
}
```

安全边界：

- 不接收 Cookie。
- 不接收 Token。
- 不接收账号密码。
- 不接收私信、通讯录、非公开内容。
- 不绕过验证码。
- 不代替用户后台自动抓取。
- 只采集当前页面可见内容，且需要用户确认上传。

## 8. 热点 AI 建议链路

```text
首页 AI建议按钮
→ POST /api/ai/recommend/topic/{topic_id}
→ search_cases_for_topic()
→ TopicRecommendationCaseRef 保存召回案例
→ DeepSeek 生成建议
→ TopicRecommendation 保存建议
→ AiUsageLog 保存成本
→ 用户扣积分
```

知识召回现状：

- `search_cases_for_topic()` 当前仍以关键词、标签、平台和知识分为主。
- `POST /api/cases/{case_id}/embed` 会生成并保存向量字段，状态为 `embedded` 或 `failed`。
- `POST /api/cases/embed-all` 会批量向量化 approved / high-value / callable 案例。
- 后续迁移 PostgreSQL + pgvector 后，应把 `embedding_vector` 从 SQLite 文本过渡为 pgvector 字段，并让相似案例/热点匹配优先走语义向量召回。

前端展示：

- 首页 AI 推荐结果和话题详情页均展示是否调用 AI营销知识库。
- 只展示引用案例数量和案例匹配原因，不向普通用户强调底层模型名。
- 建议内容通过 `RecommendationPreview` 结构化展示，避免 Markdown 黑底和原始格式。

## 8.1 Embedding 管理接口

```http
GET /api/users/admin/settings
POST /api/users/admin/settings
POST /api/users/admin/settings/embedding/test
POST /api/cases/embed-all
POST /api/cases/{case_id}/embed
```

`POST /api/users/admin/settings/embedding/test` 请求：

```json
{
  "text": "用生活方式替代产品参数表达"
}
```

响应示例：

```json
{
  "ok": true,
  "provider": "mock",
  "model": "mock",
  "dimension": 1024
}
```

## 9. 本地启动

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

## 10. 验证命令

```bash
python3 -m compileall backend/app
```

```bash
cd frontend
npm run build
```

```bash
curl -X POST http://localhost:8000/api/jobs/collect
curl http://localhost:8000/api/topics/resonance
curl http://localhost:8000/api/users/me/permissions
curl http://localhost:8000/api/cases
curl -X POST http://localhost:8000/api/users/admin/settings/embedding/test -H 'Content-Type: application/json' -d '{"text":"测试向量模型连接"}'
curl -X POST http://localhost:8000/api/cases/embed-all
```

## 11. 下一阶段优先级

优先级一：

- 迁移 PostgreSQL。
- 启用 pgvector。
- 将当前 SQLite 文本向量迁移为 pgvector 字段。
- 支持相似案例和热点匹配的向量召回。
- 完成 `TopicRecommendationCaseRef` 前端展示。
- 建立操作审计日志写入。
- 增加数据源健康状态页。

优先级二：

- 定时采集管理页。
- 统一 Knowledge API。
- AIActionPricing 管理后台。
- 更完整的模型调用成本追踪。

优先级三：

- 图文生产系统。
- Campaign 执行系统。
- PPT 提案系统。
- GEO / 品牌 AI 心智管理。
