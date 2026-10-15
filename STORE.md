# 商店发布材料 · 0.1.5

状态：已提供可安装的 Manifest V3 ZIP、扩展图标、隐私说明和以下文案；**尚未提交商店审核，尚无商店下载链接**。

## 可以直接填写的文案

**名称：** Daymark Start

**简介：** 极简新标签页：五款经典配色、时间、搜索、常用网址、DayMark 当前任务与 AIHOT 热点。

**单一用途：** 提供一个可个性化的极简新标签页入口，在同一页显示时间、搜索和快捷网址，并按用户设置展示 DayMark 当前任务与 AIHOT 热点。

**详细介绍：**

打开新标签页，让下一步更清楚。

Daymark Start 用简洁的排版，把每天常用的入口放在一起：

- 时间与日期，搜索框，以及最多八个图标网址。
- 午夜黑、纸白、海军蓝、森林绿、暖咖棕五款配色，点选后自动保存。
- 可选连接自己的 DayMark，显示现在该做什么与下一项安排；本版仅支持读取任务。
- 可关闭的 AIHOT 前三条热点，正常可见时最低每五分钟更新，异常时显示缓存或失败提示。
- 轻量悬停、聚焦与按压反馈，尊重系统的减少动态效果设置。

安装后会替换浏览器的新标签页。时间日期目前使用中国标准时间；DayMark 任务按服务器配置的时区选择。DayMark 需要用户自己的可访问服务和有效网页登录状态，不是内置账号服务。热点需要网络，可能受来源服务限流或防护影响。

字体和界面资源随插件打包，无广告和访问统计。设置保存在本机；搜索、DayMark 与 AIHOT 请求的详细说明见隐私政策。本扩展是独立客户端，不代表搜索服务或 AIHOT 官方。

**网站与支持：** https://github.com/Raymond-Specter/daymark-start

**隐私政策 URL：** https://github.com/Raymond-Specter/daymark-start/blob/main/PRIVACY.md

## 权限说明与数据声明草稿

| 字段 | 说明 |
| --- | --- |
| storage | 在本机保存配色、搜索引擎、手动快捷网址、连接设置，以及热点缓存/重试状态。 |
| AIHOT 主机权限 | 从官方公开 API 读取前三条 AI 热点；用户可关闭自动读取。 |
| 可选主机权限 | DayMark 支持用户自建 HTTPS 或本机服务，因此预声明候选范围；保存设置时只申请用户填写的主机，后台只请求 `/api/today` 和 `/api/settings`。不注入网页脚本。 |
| 远程代码 | 不使用。所有脚本、字体与图标随扩展提供；外部 JSON 仅作为数据显示。 |

填写商店数据类别时，应如实说明本机网址设置、页面内任务处理、第三方搜索跳转、附带现有登录 Cookie 的 DayMark 请求，以及 AIHOT 网络请求。开发者没有数据收集后台不等于没有数据处理；不要机械填写“没有任何数据访问或传输”。以提交时的表单定义和隐私说明为准，由发布者核对声明。

## 给审核人员的测试说明

1. 安装后打开新标签页，无账号即可查看时钟、搜索和快捷网址。
2. 右下角设置中切换配色，关闭并重新打开新标签页，配色应保留。
3. 设置中可启用“展示 DayMark 示例”，查看明确标注为示例的任务；无需登录，不代表已连通真实服务。
4. 实际 DayMark 连接需自行运行兼容服务，先在同一浏览器登录，填写根地址并同意站点权限。本项目不提供公共测试账号。若审核要求真实凭据，发布者应提供独立测试服务和测试账号，不提供私人账号。
5. 关闭 AIHOT，保存后栏目隐藏；开启后联网读取。若被来源服务拦截，会显示错误和官方说明入口。

## 本地打包与安装

```powershell
npm.cmd test
powershell -NoProfile -File tools/Package.ps1
```

输出 `artifacts/daymark-start-0.1.5.zip`、对应 `.sha256` 和方便分发的 `artifacts/daymark-start.zip`。ZIP 根目录包含 `manifest.json`，不包含源码测试、商店材料和本机调试配置。Windows 内置 PowerShell 即可打包，无需安装生产依赖。重新生成图标时运行 `powershell -NoProfile -File tools/New-Icons.ps1`。

体验版用户解压 ZIP 后，在 `edge://extensions` 或 `chrome://extensions` 开启开发人员模式，加载包含 `manifest.json` 的目录。不要直接加载 ZIP。已有源码版用户可以在扩展管理页重新加载 `extension` 目录。

## 正式上架还需完成

1. **开发者账号：**由仓库拥有者注册并完成 Chrome / Edge 各自的账号验证、联系方式和必要协议。费用和验证要求以账号后台为准。
2. **实际截图及商店推广图：**重新截取当前版本的首页与配色界面，示例任务/新闻须标示为示例。Chrome 需商店图标、截图与小型推广图；具体尺寸见下方官方指南。Edge 使用其独立要求。此版本提供的 128px 图标在 `extension/icons/icon-128.png`；其他商店素材尚未制作。
3. **服务验证与使用范围：**在发布者实际 DayMark 部署验证登录与权限，确认 AIHOT 在面向公众分发的用途下符合其服务规则；涉及商用/公开数据再分发时先确认授权。源码公开不等于第三方数据授权。
4. **填写并核对：**上传 ZIP，填写上述文案、隐私 URL、权限与数据用途、支持联系方式、分发地区和测试说明。隐私 URL 应能在退出 GitHub 登录时访问。
5. **审核与发布：**由发布者确认并提交审核。审核通过且发布后，再把真实商店下载链接放到 README。不能预先宣称已上架或保证审核结果。

## 官方流程参考

核对日期：2026-10-15。规则可能变化，提交时以后台要求为准。

- [Chrome 提交流程](https://developer.chrome.com/docs/webstore/publish)
- [Chrome 图像素材要求](https://developer.chrome.com/docs/webstore/images)
- [Chrome 用户数据政策说明](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Edge 开发者注册](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)
- [Edge 提交与素材要求](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
