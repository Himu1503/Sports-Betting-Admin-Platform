# Vercel Deployment Guide

This guide will help you deploy the Sports Betting Admin Platform to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A PostgreSQL database (recommended services):
   - [Neon](https://neon.tech) - Serverless PostgreSQL (Free tier available)
   - [Supabase](https://supabase.com) - Open source Firebase alternative (Free tier available)
   - [Railway](https://railway.app) - Easy PostgreSQL hosting
   - [AWS RDS](https://aws.amazon.com/rds/)
   - [Google Cloud SQL](https://cloud.google.com/sql)

## Step 1: Set Up Database

1. Create a PostgreSQL database on one of the services above
2. Get your database connection details:
   - Host
   - Port (usually 5432)
   - Database name
   - Username
   - Password
   - Connection string (if available)

3. **Important**: If you have existing data, you'll need to migrate it:
   ```bash
   # Export schema from your local database
   pg_dump -h localhost -U analyst_user -d analyst_platform --schema-only > schema.sql
   
   # Import to your new database
   psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB < schema.sql
   
   # Export data (if needed)
   pg_dump -h localhost -U analyst_user -d analyst_platform --data-only > data.sql
   psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB < data.sql
   ```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? (Select your account/team)
   - Link to existing project? **No**
   - Project name? (Enter a name or press Enter for default)
   - Directory? (Press Enter for current directory)

5. Add environment variables:
   ```bash
   vercel env add DB_HOST
   vercel env add DB_PORT
   vercel env add DB_USER
   vercel env add DB_PASSWORD
   vercel env add DB_NAME
   ```

   For each variable, select:
   - Environment: **Production, Preview, and Development**

6. Redeploy with environment variables:
   ```bash
   vercel --prod
   ```

### Option B: Deploy via Vercel Dashboard

1. Push your code to GitHub/GitLab/Bitbucket

2. Go to [vercel.com](https://vercel.com) and click "Add New Project"

3. Import your repository

4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (root)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`

5. Add Environment Variables:
   Go to Project Settings → Environment Variables and add:
   ```
   DB_HOST=your-database-host
   DB_PORT=5432
   DB_USER=your-database-user
   DB_PASSWORD=your-database-password
   DB_NAME=your-database-name
   ```

6. Optionally, set the frontend API URL:
   ```
   VITE_API_URL=https://your-project.vercel.app/api
   ```

7. Click "Deploy"

## Step 3: Configure Frontend API URL

After deployment, you'll get a URL like `https://your-project.vercel.app`.

1. Go to your Vercel project settings
2. Add environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-project.vercel.app/api`
   - Apply to: **Production, Preview, Development**

3. Redeploy the frontend (or push a new commit)

## Step 4: Update Frontend API Client (if needed)

If the frontend needs to be aware of the API URL, update `frontend/src/api/client.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-project.vercel.app/api'
```

The current code should automatically use the environment variable if set.

## Project Structure for Vercel

```
/
├── api/
│   ├── index.py              # Serverless function handler
│   └── requirements.txt      # Python dependencies
├── backend/                  # FastAPI application
│   ├── main.py
│   ├── database.py
│   ├── routers/
│   └── ...
├── frontend/                 # React frontend
│   ├── src/
│   ├── package.json
│   └── ...
├── vercel.json              # Vercel configuration
└── .vercelignore           # Files to exclude
```

## Routing

- `/api/*` → FastAPI backend (serverless function)
- `/*` → React frontend (static files)

## Environment Variables

Required environment variables in Vercel:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `your-db.region.aws.neon.tech` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database username | `dbuser` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `DB_NAME` | Database name | `analyst_platform` |
| `VITE_API_URL` | Frontend API URL (optional) | `https://your-app.vercel.app/api` |

Vercel automatically provides:
- `VERCEL_URL` - Your deployment URL

## Troubleshooting

### Database Connection Issues

1. Check your database allows connections from Vercel IPs
   - Most managed databases allow all IPs by default
   - Some require IP whitelisting - check your database provider

2. Verify environment variables are set correctly in Vercel dashboard

3. Check Vercel function logs:
   ```bash
   vercel logs
   ```

### CORS Issues

The backend is configured to allow:
- Your Vercel deployment URL (automatically)
- Custom domains (if `APP_URL` or `NEXT_PUBLIC_APP_URL` is set)
- Localhost (for development)

### Build Failures

1. Check that all dependencies are in `api/requirements.txt`
2. Ensure Node.js version is compatible (Vercel auto-detects from `package.json`)
3. Check build logs in Vercel dashboard

### Slow Cold Starts

Vercel serverless functions have cold starts. For better performance:
- Use Vercel Pro plan for faster cold starts
- Consider keeping a connection pool warm (optional optimization)
- Use database connection pooling service if available

## Custom Domain

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. Update `APP_URL` environment variable with your domain

## Monitoring

- View logs: `vercel logs` or Vercel dashboard
- Monitor performance in Vercel dashboard
- Set up alerts for errors

## Notes

- Database migrations need to be run manually on your hosted database
- The `lifespan` context manager in FastAPI is disabled for serverless (using `lifespan="off"`)
- Connection pooling is handled per-request (serverless-friendly)
- Static assets are cached for 1 year
- API routes are serverless functions with automatic scaling

## Support

For issues:
1. Check Vercel function logs
2. Check database connection logs
3. Verify environment variables
4. Review [Vercel documentation](https://vercel.com/docs)

