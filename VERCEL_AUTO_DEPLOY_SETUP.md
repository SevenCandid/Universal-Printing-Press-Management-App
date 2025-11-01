# 🚀 Vercel Auto-Deployment Setup Guide

This guide will help you set up automatic deployment from GitHub to Vercel.

## ✅ Prerequisites

1. ✅ GitHub repository is set up
2. ✅ All code is committed and pushed to GitHub
3. ✅ Vercel account (free tier works)

## 🔧 Step 1: Connect GitHub to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Sign in or create an account

2. **Add New Project**
   - Click "Add New..." → "Project"
   - Or click "Import Project"

3. **Import from GitHub**
   - Select "Import Git Repository"
   - Click "Connect GitHub" if not connected
   - Authorize Vercel to access your GitHub repositories
   - Select your repository: `SevenCandid/Universal-Printing-Press-Management-App`

4. **Configure Project**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

5. **Environment Variables**
   - Click "Environment Variables"
   - Add all required variables from `.env.example`:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```
   - **Important:** Set variables for:
     - ✅ Production
     - ✅ Preview
     - ✅ Development (optional)

6. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

## 🔄 Step 2: Configure Auto-Deployment

After the initial deployment:

1. **Auto-Deployment is Enabled by Default**
   - Vercel automatically deploys on every push to `master` branch
   - Every commit triggers a new deployment

2. **Configure Production Branch**
   - Go to Project Settings → Git
   - Set **Production Branch:** `master`
   - This ensures pushes to `master` deploy to production

3. **Preview Deployments**
   - Create branches for preview deployments
   - Each branch gets its own preview URL
   - Pull requests automatically get preview deployments

## 📋 Required Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

### Essential Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional Variables:
```
NEXT_PUBLIC_APP_NAME=Universal Printing Press
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore` ✅
2. **Use Vercel Environment Variables** - Secure storage ✅
3. **Separate keys for Production/Preview** - Different Supabase projects ✅

## 🚦 Deployment Behavior

### Production Deployments:
- **Trigger:** Push to `master` branch
- **URL:** Your custom domain or `your-app.vercel.app`
- **Status:** Live and accessible

### Preview Deployments:
- **Trigger:** Push to any other branch or pull request
- **URL:** `your-app-git-branch-name.vercel.app`
- **Status:** Preview/test environment

## ✅ Verification Checklist

After setup, verify:

- [ ] Repository connected to Vercel
- [ ] Environment variables configured
- [ ] Initial deployment successful
- [ ] Auto-deployment working (push to GitHub and check Vercel dashboard)
- [ ] Production domain working
- [ ] Preview deployments working (test with a branch)

## 🔍 Troubleshooting

### Build Fails:
1. Check build logs in Vercel dashboard
2. Verify environment variables are set
3. Ensure all dependencies are in `package.json`

### Environment Variables Not Working:
1. Re-add variables in Vercel dashboard
2. Ensure they're set for "Production"
3. Redeploy after adding variables

### Deployment Not Triggering:
1. Check GitHub integration in Vercel settings
2. Verify you're pushing to the connected branch
3. Check Vercel dashboard for webhook status

## 📝 Next Steps

1. ✅ Connect GitHub repository to Vercel
2. ✅ Add environment variables
3. ✅ Deploy and verify
4. ✅ Set up custom domain (optional)
5. ✅ Configure preview deployments (optional)

---

**Your Repository:** `SevenCandid/Universal-Printing-Press-Management-App`  
**Default Branch:** `master`  
**Framework:** Next.js 15  
**Build Command:** `npm run build`

