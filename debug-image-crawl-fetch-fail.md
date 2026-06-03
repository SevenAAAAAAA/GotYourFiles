# Debug Session: image-crawl-fetch-fail
- **Status**: [OPEN]
- **Issue**: 图片抓取接口经常返回 fetch fail，导致 ZIP 无法生成
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-image-crawl-fetch-fail.ndjson

## Reproduction Steps
1. 打开“更多功能”中的“图片抓取打包”
2. 选择网页地址模式，输入远程图片页或搜索结果页
3. 点击“开始抓取”
4. 观察前端报错为 fetch fail

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | 服务端 `fetch(pageUrl)` 在 TLS/握手阶段失败，异常被前端简化成 fetch fail | High | Low | Rejected |
| B | 远程站点返回了反爬/超时/重定向异常，当前后端没有把底层错误细节透出 | High | Low | Partially Rejected |
| C | 前端请求 `/api/image-crawl` 本身失败，问题不在远程页面抓取，而在 API 路由执行链路 | Med | Low | Rejected |
| D | 下载图片阶段失败，页面抓取成功但某个候选图请求抛错，最终被汇总成 fetch fail | Med | Med | Suspected |
| E | “仅同域/格式过滤/候选为空”等逻辑把可用图片筛没了，但前端把业务错误误判成 fetch fail | Low | Low | Rejected |

## Log Evidence
- 前端请求已发出：`components/MoreFeatures.tsx:handleImageCrawlSubmit`
- API 已收到请求：`app/api/image-crawl/route.ts:POST`
- 目标网页抓取成功：HTTP 200，`contentType=text/html`
- 候选提取成功：`candidateCount=237`
- 之后没有出现下载汇总日志，说明卡点在候选下载/尺寸读取/ZIP 生成阶段

## Verification Conclusion
- 已确认不是前端到 API 的请求问题
- 已确认不是百度结果页 HTML 抓取问题
- 需继续细化下载循环内部证据，定位是某个远程图片请求长时间不返回，还是尺寸识别/压缩阶段阻塞
