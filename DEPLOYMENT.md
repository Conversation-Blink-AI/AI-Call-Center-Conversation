# DigitalOcean App Platform Deployment Guide

This guide will help you deploy this Next.js application to DigitalOcean App Platform directly from your Git repository.

## Prerequisites

1. A DigitalOcean account
2. Your Git repository (GitHub, GitLab, or Bitbucket)
3. Your database connection string (already configured in `.env`)

## Deployment Steps

### 1. Connect Your Repository

1. Log in to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. Select **"GitHub"**, **"GitLab"**, or **"Bitbucket"** as your source
4. Authorize DigitalOcean to access your repositories
5. Select your repository: `Team-AI-Blink-Digital/Cursor_Conversation_Dev_v2`
6. Choose the branch: `develop_ashi` (or your preferred branch)

### 2. Configure Your App

#### Basic Settings
- **App Name**: Choose a name (e.g., `cursor-conversation-app`)
- **Region**: Select the region closest to your users
- **Branch**: `develop_ashi`
- **Type**: **Web Service**

#### Build & Run Settings

**Build Command:**
```bash
npm install && npm run build
```

**Run Command:**
```bash
npm start
```

**Source Directory:** (leave empty, root directory)

**Environment Variables:**

Add all the environment variables from your `.env` file:

```
DATABASE_URL=postgresql://doadmin:AVNS_YwkjuL_6zG1hOUWb_Th@conversation-dev-db-cursor-do-user-25025661-0.l.db.ondigitalocean.com:25060/defaultdb?sslmode=require
JWT_SECRET=your-jwt-secret-key
BLAND_AI_API_KEY=your-bland-ai-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
FOREX_URL=your-forex-api-url
EXTERNAL_API_URL=your-external-api-url
NODE_ENV=production
```

**Important:** 
- Never commit your `.env` file to git (it's already in `.gitignore`)
- Add all environment variables in the DigitalOcean dashboard
- Mark sensitive variables as "Encrypted"

### 3. Resource Configuration

**Instance Size:**
- **Basic Plan**: Start with the smallest instance (512MB RAM, $5/month)
- Scale up as needed

**HTTP Port:**
- Set to `3000` (Next.js default)

**Health Check:**
- **Path**: `/`
- **Initial Delay**: 60 seconds

### 4. Database Connection

Your database is already on DigitalOcean. The SSL configuration is already set up in the code to work with DigitalOcean's managed databases.

**Verify:**
- Your `DATABASE_URL` includes `sslmode=require`
- The connection string is correct
- The database allows connections from App Platform

### 5. Deploy

1. Review all settings
2. Click **"Create Resources"** or **"Deploy"**
3. DigitalOcean will:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Build your app (`npm run build`)
   - Start your app (`npm start`)

### 6. Post-Deployment

#### Verify Deployment

1. Wait for the build to complete (usually 5-10 minutes)
2. Check the deployment logs for any errors
3. Visit your app URL (provided by DigitalOcean)

#### Test Your Application

1. Visit your app URL
2. Test the login functionality
3. Check API endpoints using `/apitest` page
4. Verify database connections

#### Monitor Your App

- **Logs**: View real-time logs in the DigitalOcean dashboard
- **Metrics**: Monitor CPU, memory, and request metrics
- **Alerts**: Set up alerts for errors or high resource usage

## Environment Variables Checklist

Make sure to add these in DigitalOcean App Platform:

- [ ] `DATABASE_URL` - Your PostgreSQL connection string
- [ ] `JWT_SECRET` - Secret key for JWT tokens
- [ ] `BLAND_AI_API_KEY` - Bland.ai API key
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `FOREX_URL` - External API URL (if used)
- [ ] `EXTERNAL_API_URL` - External API URL (if used)
- [ ] `NODE_ENV=production` - Set to production

## Troubleshooting

### Build Fails

1. Check build logs in DigitalOcean dashboard
2. Verify Node.js version (should be 18+)
3. Check for missing dependencies
4. Verify build command is correct

### Database Connection Errors

1. Verify `DATABASE_URL` is correct
2. Check database firewall rules (allow App Platform IPs)
3. Verify SSL configuration (already handled in code)
4. Test connection using `/api/auth/test-postgres`

### App Crashes on Start

1. Check runtime logs
2. Verify all environment variables are set
3. Check port configuration (should be 3000)
4. Verify `npm start` command works locally

### 500 Errors

1. Check application logs
2. Verify database connection
3. Check API endpoint logs
4. Use `/apitest` page to debug API calls

## Scaling

### Horizontal Scaling
- Add more instances in the App Platform settings
- DigitalOcean will automatically load balance

### Vertical Scaling
- Upgrade instance size (more RAM/CPU)
- Monitor resource usage in dashboard

## Continuous Deployment

DigitalOcean App Platform automatically deploys when you push to your connected branch:

1. Push changes to `develop_ashi` branch
2. DigitalOcean detects the push
3. Automatically builds and deploys
4. You can enable/disable auto-deploy in settings

## Custom Domain

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate is automatically provisioned

## Support

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)

