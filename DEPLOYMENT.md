# Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- Clerk account for authentication
- OpenAI API key for AI features
- Domain name (optional)

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/splitledger?sslmode=require"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# OpenAI
OPENAI_API_KEY="sk-..."

# Resend (Email)
RESEND_API_KEY="re_..."

# S3 Storage (for receipts)
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="..."
S3_REGION="..."
S3_ENDPOINT="..."

# WhatsApp Business API (optional)
WHATSAPP_PHONE_NUMBER_ID="..."
WHATSAPP_ACCESS_TOKEN="..."

# App URL
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Deployment Options

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   - In Vercel project settings
   - Add all environment variables from `.env.example`

4. **Deploy**
   - Vercel will automatically deploy on push
   - Custom domain can be configured in project settings

### Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t splitledger-ai .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 \
     -e DATABASE_URL="your-database-url" \
     -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..." \
     -e CLERK_SECRET_KEY="..." \
     -e OPENAI_API_KEY="..." \
     splitledger-ai
   ```

### Manual Deployment

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

3. **Use PM2 for Process Management**
   ```bash
   npm install -g pm2
   pm2 start npm --name "splitledger" -- start
   pm2 save
   pm2 startup
   ```

## Database Setup

### Neon PostgreSQL (Recommended)

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Create a new project
   - Copy the connection string

2. **Run Migrations**
   ```bash
   npm run db:generate
   npm run db:push
   ```

### Self-Hosted PostgreSQL

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE splitledger;
   CREATE USER splitledger_user WITH PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE splitledger TO splitledger_user;
   ```

3. **Update DATABASE_URL**
   ```env
   DATABASE_URL="postgresql://splitledger_user:your-password@localhost:5432/splitledger"
   ```

## Authentication Setup (Clerk)

1. **Create Clerk Account**
   - Go to [clerk.com](https://clerk.com)
   - Create a new application

2. **Configure Clerk**
   - Add your domain to allowed origins
   - Enable email verification
   - Configure OAuth providers (Google, etc.)

3. **Copy Keys**
   - Copy Publishable Key and Secret Key
   - Add to environment variables

4. **Configure Webhooks**
   - Set up webhook endpoint: `/api/webhooks/clerk`
   - Configure events: `user.created`, `user.updated`, `user.deleted`

## AI Setup (OpenAI)

1. **Create OpenAI Account**
   - Go to [openai.com](https://openai.com)
   - Create API key

2. **Configure Usage**
   - Set rate limits
   - Monitor costs

3. **Add to Environment**
   ```env
   OPENAI_API_KEY="sk-..."
   ```

## Email Setup (Resend)

1. **Create Resend Account**
   - Go to [resend.com](https://resend.com)
   - Verify your domain

2. **Configure Templates**
   - Create email templates for notifications
   - Set up sender addresses

3. **Add API Key**
   ```env
   RESEND_API_KEY="re_..."
   ```

## Storage Setup (S3)

1. **Create S3 Bucket**
   - Use AWS S3 or compatible service (DigitalOcean Spaces, etc.)
   - Enable CORS for your domain

2. **Configure Access**
   - Create access key with limited permissions
   - Set up bucket policy

3. **Add Environment Variables**
   ```env
   S3_ACCESS_KEY_ID="..."
   S3_SECRET_ACCESS_KEY="..."
   S3_BUCKET_NAME="..."
   S3_REGION="..."
   S3_ENDPOINT="..."
   ```

## Performance Optimization

### Database Indexes
Ensure all indexes are created:
```bash
npm run db:push
```

### Caching
- Configure Redis for session caching
- Enable CDN for static assets
- Use Vercel's edge caching

### Monitoring
- Set up error tracking (Sentry)
- Configure uptime monitoring
- Monitor database performance

## Security

### SSL/TLS
- Enable HTTPS in production
- Configure SSL certificates
- Use secure cookies

### Rate Limiting
- Configure API rate limits
- Implement request throttling
- Use Vercel's built-in rate limiting

### Data Encryption
- Encrypt sensitive data at rest
- Use TLS for database connections
- Secure API keys

## Monitoring

### Application Monitoring
- Use Vercel Analytics
- Set up error tracking with Sentry
- Monitor API response times

### Database Monitoring
- Monitor query performance
- Track connection pool usage
- Set up alerts for slow queries

### User Analytics
- Track user engagement
- Monitor feature usage
- Analyze conversion funnels

## Backup Strategy

### Database Backups
- Enable Neon's automatic backups
- Configure point-in-time recovery
- Test restore procedures

### File Backups
- Enable S3 versioning
- Configure lifecycle policies
- Regular backup verification

## Scaling

### Horizontal Scaling
- Use Vercel's automatic scaling
- Configure load balancing
- Optimize database queries

### Vertical Scaling
- Monitor resource usage
- Upgrade database instances
- Optimize application code

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify DATABASE_URL is correct
- Check database is accessible
- Ensure SSL is enabled

**Authentication Issues**
- Verify Clerk keys are correct
- Check webhook configuration
- Ensure redirect URLs match

**Build Errors**
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version compatibility

### Logs

**View Application Logs**
```bash
# Vercel
vercel logs

# PM2
pm2 logs splitledger

# Docker
docker logs <container-id>
```

**Database Logs**
- Neon: Dashboard → Logs
- Self-hosted: `/var/log/postgresql/`

## Maintenance

### Regular Tasks

- Update dependencies monthly
- Review and apply security patches
- Monitor storage usage
- Clean up old audit logs
- Review and optimize database queries

### Updates

```bash
# Update dependencies
npm update

# Run migrations
npm run db:push

# Rebuild
npm run build
npm start
```

## Support

For deployment issues:
- Check documentation
- Review error logs
- Open GitHub issue
- Contact support@splitledger.ai
