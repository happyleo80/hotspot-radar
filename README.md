# 五大平台热点雷达

面向营销策划的热点雷达 MVP，包含 Next.js Dashboard、FastAPI 后端、PostgreSQL 数据库和 Manifest V3 Chrome 插件。

## 一键启动

```bash
docker-compose up --build
```

访问：

- Dashboard: http://localhost:3000
- API Docs: http://localhost:8000/docs

首次启动后端会自动建表并写入五个平台 mock 热点数据。

## 已实现的 MVP 能力

- 五个平台热点 Tab：微博、抖音、小红书、知乎、B站。
- Rebang 热榜采集：优先使用 `https://api.rebang.today` 获取五个平台热榜。
- TopHub 热榜采集：作为第二数据源尝试，遇到安全验证或空结果时自动使用 mock 兜底。
- 今日热点 Top 50、跨平台共振、上升最快、高营销价值、高风险话题。
- 话题详情页：基础信息、热度趋势、AI 营销分析。
- AI 分析按钮：当前版本默认使用本地启发式分析，便于无 API Key 时跑通流程。
- 每日 Markdown 简报生成。
- CSV 导入与 CSV/Markdown 导出。
- Chrome 插件补采：用户点击采集当前页可见 DOM，预览后确认上传。

## API 路由

热点数据：

- `GET /api/topics`
- `GET /api/topics/{id}`
- `GET /api/topics/platform/{platform}`
- `GET /api/topics/rising`
- `GET /api/topics/high-value`
- `GET /api/topics/high-risk`
- `GET /api/topics/resonance`

数据采集：

- `POST /api/jobs/collect`
- `POST /api/jobs/collect/{platform}`
- `POST /api/extension/collect`
- `POST /api/import/csv`

AI 分析：

- `POST /api/ai/analyze/topic/{id}`
- `POST /api/ai/generate-brief`

导出：

- `GET /api/export/csv`
- `GET /api/export/excel`
- `GET /api/export/markdown`

## 第三方 API 接入方式

当前 MVP 默认会优先尝试 Rebang 热榜 API，再尝试 TopHub 热榜页面；若页面触发安全验证或返回空结果，则 mock 数据跑通全链路。授权 API 接入点在：

- `backend/app/collectors/api_clients.py`
- `backend/app/services/topic_service.py`

已预留 TianAPI 微博热搜适配器。填入 `.env` 中的 `TIANAPI_KEY` 后，可把 `collect_platform` 从 mock 切换为第三方 API 优先、mock 兜底。

当前 Rebang 页面映射：

- 知乎热榜：https://rebang.today/?tab=zhihu
- 小红书热榜：https://rebang.today/?tab=xiaohongshu
- 微博热搜榜：https://rebang.today/?tab=weibo
- B站热榜：https://rebang.today/?tab=bilibili
- 抖音热榜：https://rebang.today/?tab=douyin

当前 TopHub 页面映射：

- 知乎热榜：https://tophub.today/n/mproPpoq6O
- 微博热搜榜：https://tophub.today/n/KqndgxeLl9
- B站热榜：https://tophub.today/n/74KvxwokxM
- 抖音热榜：https://tophub.today/n/DpQvNABoNE
- 小红书热榜：https://tophub.today/n/L4MdA5ldxD

小红书建议接授权第三方数据服务；插件仅作为用户主动补采当前页面可见内容的合规补充。

## Chrome 插件

```bash
cd extension
npm install
npm run build
```

在 Chrome 扩展程序页面打开开发者模式，加载 `extension/dist`。

插件可在五个平台页面和 TopHub 热榜页面主动补采。插件只做：

- 当前页面 DOM 解析
- 用户主动点击采集
- 当前页面数据预览
- 用户确认后上传后台

插件不做：

- 自动登录
- 上传 Cookie、Token、账号密码
- 绕过验证码
- 高频请求
- 后台代替用户抓取

## 本地开发

后端：

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

前端：

```bash
cd frontend
npm install
npm run dev
```

插件：

```bash
cd extension
npm install
npm run build
```
