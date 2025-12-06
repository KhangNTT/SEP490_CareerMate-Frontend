# Quick Setup Guide: Vercel KV for PDF Export

## For Local Development

### Step 1: Create a Vercel KV Database

1. Go to https://vercel.com/dashboard/stores
2. Click "Create Database"
3. Select "KV" (Key-Value Store)
4. Name it: `careermate-export-jobs` (or any name you prefer)
5. Select your preferred region (closest to your deployment)
6. Click "Create"

### Step 2: Get Environment Variables

1. After creation, go to your KV database page
2. Click on the "Environment Variables" tab
3. You'll see three variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

### Step 3: Add to Local Environment

Create or update `.env.local` (this file is gitignored):

```env
# Vercel KV (PDF Export Job Queue)
KV_REST_API_URL=https://your-actual-kv-url.kv.vercel-storage.com
KV_REST_API_TOKEN=your-actual-token-here
KV_REST_API_READ_ONLY_TOKEN=your-actual-read-only-token-here
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

### Step 5: Test PDF Export

1. Go to http://localhost:3000/candidate/cv-management
2. Click "Export PDF" on any CV
3. Check console logs for:
   ```
   [ExportJobStore:KV] Created job ...
   [ExportJob] Starting background processing ...
   [ExportJobStore:KV] Job ... completed
   ```

---

## For Production (Vercel Deployment)

### Step 1: Link KV Store to Your Project

1. Go to https://vercel.com/dashboard
2. Select your project (CareerMate Frontend)
3. Go to "Storage" tab
4. Click "Connect Store"
5. Select your KV database (`careermate-export-jobs`)
6. Click "Connect"

### Step 2: Deploy

```bash
git push
```

**That's it!** Vercel automatically injects the KV environment variables into your deployment.

---

## Verification

### Check if KV is Working

Visit your API endpoint:

**Local:**
```
http://localhost:3000/api/export-pdf/job
```

**Production:**
```
https://your-domain.vercel.app/api/export-pdf/job
```

Expected response:
```json
{
  "service": "PDF Export Job API",
  "status": "operational",
  "storage": "Vercel KV",
  "timestamp": "2024-12-06T..."
}
```

### Check Job Storage

You can view stored jobs in Vercel KV Dashboard:

1. Go to your KV database page
2. Click "Data Browser" tab
3. Look for keys starting with `export-pdf-job:`
4. Jobs automatically expire after 10 minutes

---

## Troubleshooting

### Error: "KV_REST_API_URL is not defined"

**Solution:** Add KV environment variables to `.env.local` (see Step 3 above)

### Error: "Failed to connect to KV"

**Solution:** 
- Verify credentials are correct
- Check if KV database is active in Vercel dashboard
- Ensure no typos in environment variables

### Jobs not showing in KV Dashboard

**Solution:**
- Jobs expire after 10 minutes (TTL)
- Try creating a new export job
- Refresh the Data Browser page

---

## Cost Estimate

**Vercel KV Pricing (Hobby Plan):**
- ✅ 256 MB storage included (free)
- ✅ 100,000 reads/month included
- ✅ 10,000 writes/month included

**Our Usage:**
- Each job: ~500 bytes
- 1,000 exports/month = ~500 KB storage + 1,000 writes + 3,000 reads
- Well within free tier limits! 🎉

---

## Support

For issues with Vercel KV, see:
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Vercel Support](https://vercel.com/support)
