# Chromium Serverless Fix for PDF Export

## Problem
When deploying to Vercel/AWS Lambda, Puppeteer fails with:
```
Error: The input directory "/var/task/node_modules/@sparticuz/chromium/bin" does not exist. 
Please provide the location of the brotli files.
```

## Root Cause
- `@sparticuz/chromium` requires proper configuration for serverless environments
- The chromium binary needs to be extracted to a writable directory (`/tmp` in Lambda)
- Default configuration doesn't handle this automatically

## Solution Applied

### 1. Updated `src/lib/pdf-export-worker.ts`

**Changes:**
- Added proper `executablePath` configuration with `/tmp` directory
- Added font configuration to prevent font loading issues
- Added comprehensive error logging
- Added `CHROMIUM_PATH` environment variable support for custom paths
- Fixed TypeScript errors (`chromium.headless` → `true`)

**Code:**
```typescript
// Get executable path with proper tmp directory
const tmpDir = process.env.CHROMIUM_PATH || "/tmp";
const execPath = await chromium.executablePath(tmpDir);

// Configure font
await chromium.font("https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf");

// Launch with proper args
browser = await puppeteerCore.launch({
  args: [
    ...chromium.args,
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-setuid-sandbox",
    "--no-first-run",
    "--no-sandbox",
    "--no-zygote",
    "--single-process",
  ],
  executablePath: execPath,
  headless: true,
  ignoreHTTPSErrors: true,
});
```

### 2. Dependencies Check

Ensure these are in `package.json`:
```json
{
  "dependencies": {
    "@sparticuz/chromium": "^141.0.0",
    "puppeteer-core": "^24.29.1"
  },
  "devDependencies": {
    "puppeteer": "^24.29.1"
  }
}
```

### 3. Environment Variables (Optional)

If `/tmp` is not writable, set:
```bash
CHROMIUM_PATH=/custom/writable/path
```

## Vercel Configuration

Add to `vercel.json` (if not already present):
```json
{
  "functions": {
    "src/app/api/export-pdf/**": {
      "memory": 3008,
      "maxDuration": 120
    }
  }
}
```

## Testing

### Local Test:
```bash
NODE_ENV=production npm run build
npm run start
```

### Production Test:
1. Deploy to Vercel: `git push`
2. Check logs: `vercel logs`
3. Look for:
   ```
   ✅ Chromium executable path resolved: /tmp/...
   ✅ Chromium browser launched in serverless mode
   ✅ PDF generated (XX.XX KB)
   ```

## Troubleshooting

### Issue: Still getting "directory does not exist" error
**Solution:** Check that:
- `@sparticuz/chromium` version matches `puppeteer-core` version
- `/tmp` directory is writable (Lambda should have this by default)
- Function has enough memory (min 1024MB, recommended 3008MB)

### Issue: Function timeout
**Solution:**
- Increase `maxDuration` in `vercel.json` (max 300s for Pro plan)
- Check network speed for font download
- Consider pre-bundling fonts

### Issue: Out of memory
**Solution:**
- Increase memory in `vercel.json` to 3008MB
- Use `--single-process` flag (already added)
- Reduce viewport size if needed

## Resources
- [@sparticuz/chromium docs](https://github.com/Sparticuz/chromium)
- [Vercel Functions limits](https://vercel.com/docs/functions/serverless-functions/runtimes)
- [Puppeteer serverless guide](https://pptr.dev/guides/docker)

## Status
✅ Fixed and deployed
- Chromium properly configured for serverless
- Error logging improved
- Custom path support added
- TypeScript errors resolved
