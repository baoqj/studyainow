# Stripe 打赏配置

网站已部署 Stripe Checkout 的「请我喝杯咖啡」入口。付款金额、币种和 Stripe Checkout 中展示的商品名称，均由 Stripe Dashboard 内的**一次性付款** Price 决定。

## 配置生产环境

在 Stripe Dashboard 创建一个 one-time Price 后，在本目录执行以下命令。每个命令会安全地要求输入对应的值，不会写入仓库或 `wrangler.toml`。

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_COFFEE_PRICE_ID
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

分别填写：

- `STRIPE_SECRET_KEY`：生产 Secret key（以 `sk_live_` 开头）。先做测试时使用 `sk_test_`。
- `STRIPE_COFFEE_PRICE_ID`：刚创建的一次性 Price ID（以 `price_` 开头）。
- `STRIPE_WEBHOOK_SECRET`：Stripe Webhook endpoint 的 signing secret（以 `whsec_` 开头）。

## Stripe Webhook

在 Stripe Dashboard 新建 webhook endpoint：

```text
https://studyai.now/api/donations/webhook
```

订阅以下事件：

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Worker 会先以原始请求体校验 `Stripe-Signature`，然后将已付款的 Checkout Session 写入 `studyainow-db` 的 `donations` 表。`stripe_checkout_session_id` 具有唯一约束，因此 Stripe 重试事件不会造成重复记录。

## 上线前测试

1. 先使用 Stripe test mode 的 key 与 Price ID。
2. 使用 Stripe CLI 或 Dashboard 的「Send test event」验证 webhook 返回 HTTP 200。
3. 完成一次测试付款，确认 `donations` 表新增记录。
4. 将三个 secrets 替换为生产值后，重新执行一次真实环境的小额验证。
