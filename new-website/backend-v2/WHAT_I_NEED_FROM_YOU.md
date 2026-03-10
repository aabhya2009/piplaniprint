# What I Need From You to Make It Fully Live

1. Cloud and deployment target
- AWS / GCP / Azure and whether you want Docker + Kubernetes or simple VM deploy.

2. Database and queue infra
- PostgreSQL connection URL
- Redis URL (for production retry/webhook queues)

3. Providers to activate first
- Pick first priority integrations:
  - Payment (Razorpay/Stripe)
  - SMS/WhatsApp (Twilio/MSG91/Meta)
  - Shipping (Delhivery/Blue Dart/DTDC)
  - OAuth (Google/Apple/Microsoft)

4. Credentials (sandbox is fine)
- API keys/secrets per selected provider.

5. Multi-tenant rules
- Single DB with `tenant_id` (recommended) or DB per tenant.

6. Role permissions matrix
- Exact actions allowed for admin, operator, user.

7. Alert channels
- Email, Slack, WhatsApp where failure alerts should go.

8. Frontend admin requirements
- Which actions should be visible first:
  - reconnect
  - disconnect
  - manual sync
  - replay webhook
  - rotate credentials
