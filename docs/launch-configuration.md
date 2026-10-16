# Novaris 发布配置

当前发布项目位于本仓库根目录。题库冻结保持不变。未确认配置时，预览没有公共 canonical 或分享图片地址，使用 noindex，robots 禁止抓取，sitemap 为空。

## 负责人需要提供的值

在发布项目中复制 `.env.example` 为 `.env.local`，或在选定托管平台设置相同环境变量。不要提交本地环境文件。所有值必须在构建前设置；更改后重新构建、重启并验收，不能只改变启动时环境。

| 配置 | 含义 |
|---|---|
| `NOVARIS_SITE_URL` | 负责人确认的 HTTPS 根地址；不带路径、查询、片段或账号密码。统一选择 www 或非 www 版本，并在托管端将另一版本重定向到它。 |
| `NOVARIS_CONTACT_EMAIL` | 已确认可收信的公开邮箱；用于纠错、联系和隐私询问。支持普通 ASCII 邮箱及加号别名。 |
| `NOVARIS_OPERATOR_NAME` | 负责人确认可以公开显示的项目联系名称；不自动推断团队、公司或其他法律身份。 |
| `NOVARIS_HOSTING_PROVIDER` | 实际选用的托管服务名称。 |
| `NOVARIS_CONTACT_PROVIDER` | 实际接收联系邮件的服务名称。 |
| `NOVARIS_LOG_RETENTION` | 按实际托管设置确认的访问日志保留说明。 |
| `NOVARIS_CONTACT_RETENTION` | 按实际处理方式确认的询问邮件保留说明。 |
| `NOVARIS_PRIVACY_UPDATED_AT` | 确认后的隐私说明更新日期，格式 `YYYY-MM-DD`。 |
| `NOVARIS_PRIVACY_REVIEWED` | 默认 `false`；负责人核对页面与实际服务、保留方式后才设为 `true`。 |
| `NOVARIS_INDEXING_ENABLED` | 默认 `false`；决定开放搜索索引时才设为 `true`。其他必要值缺失或无效时，网站仍不会开放索引。 |

隐私字段会直接显示在公开 Privacy 页面，不能放入私人住址、电话、密钥或未经确认的声明。项目没有收件表单、账户、跨设备同步或广告跟踪；若以后添加服务，需要重新核对说明。该配置检查只验证格式与完整性，不证明域名归属、邮件可送达、隐私文字属实或法律合规。

## 只读检查与构建

使用 Node.js 20.9 或更高版本，在发布项目目录运行 `npm ci --include=dev`。构建前的检查需要 TypeScript 等开发依赖；不要在验收与构建完成前省略它们。

```sh
npm run check:launch
npm run validate:launch
```

默认未配置时，第一条返回 `PREVIEW_ONLY` 和待确认的配置名称，退出码为 0；若填写了无效配置则退出 1。它不会输出邮箱内容、修改环境、发送邮件或部署。

```sh
npm run check:launch -- --public
npm run build:public
```

公开检查要求全部必要值有效、隐私已核对、索引已明确开启，否则退出 1。`build:public` 先执行此检查，再进行生产构建。普通 `npm run build` 可用于保持 noindex 的本机预览。测试使用的 `.test` 地址只存在于隔离测试过程，不是网站配置。

## 搜索与分享边界

- 有效域名用于 canonical、Open Graph 和 Twitter 图片地址；仅配置域名不会启用搜索收录。
- 公开索引开启后，sitemap 包含八个主要页面和 5,924 个当前可用解析页，共 5,932 个地址。七个暂缓解析页、My Learning 和 Coming Soon 页面不在 sitemap，并保留 noindex。
- 公开 robots 允许抓取 noindex 页面，以便搜索引擎读到指令；Archive 的筛选查询地址限制抓取，canonical 指向 `/archive`，不承诺搜索引擎绝不会列出外部引用的查询 URL。[Google noindex 说明](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- `/opengraph-image` 保留为 1200×630 的本地品牌图片；未知域名时不把 localhost 或虚构域名放入分享元数据。[Next.js 元数据说明](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- noindex 和 robots 不是访问权限控制。需要保密的托管预览应使用平台访问保护；私有审核材料与环境文件始终排除在发布范围之外。

## 真实托管验收

负责人决定服务后，在获准部署的环境确认 HTTPS、www 重定向、联系收件及复制地址功能、Privacy 的实际服务和保留说明、robots、sitemap、canonical、分享图片、404、学习状态和移动显示。测试邮件由负责人明确授权后发送；本次没有注册、购买、发送或公开部署操作。

邮件地址、主题与正文分别编码；纠错主题中的换行已归一化，正文使用邮件 URI 的标准换行。[RFC 6068](https://www.rfc-editor.org/info/rfc6068/)
