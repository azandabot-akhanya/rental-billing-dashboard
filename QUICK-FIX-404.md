# 🚨 QUICK FIX for 404 on Refresh/Back Button

## Problem:
When you hit refresh (Cmd+Shift+R) or go back, you get 404 errors.

## Solution:
Upload the updated `.htaccess` file RIGHT NOW.

---

## Step 1: Upload Updated .htaccess (30 seconds)

### Using FileZilla:

1. **Connect to server:**
   - Host: 197.242.150.197
   - User: admin@thynkxpro-dpl.co.za
   - Pass: Wesley123@123

2. **Navigate to root directory** (usually `/` or `/public_html/`)

3. **Delete old .htaccess:**
   - Right-click on `.htaccess` → Delete

4. **Upload new .htaccess:**
   - Local file: `/Users/siyandazama/Documents/rental-billing-dashboard/.htaccess.production`
   - **Rename it to `.htaccess`** (remove .production)
   - Drag to server root `/`

5. **Enable hidden files if you can't see it:**
   - Server menu → "Force showing hidden files"

---

## Step 2: Test Immediately

1. Go to: http://thynkxpro-dpl.co.za/dashboard
2. Hit **Cmd+Shift+R** (hard refresh)
3. Should now show dashboard, not 404!

---

## What This Fix Does:

The updated `.htaccess` adds these rules that:
- Automatically append `.html` to URLs without extensions
- Handle browser refresh properly
- Keep API routes working
- Allow back/forward navigation

---

## Alternative: Quick Terminal Upload

If FileZilla is slow:

```bash
cd /Users/siyandazama/Documents/rental-billing-dashboard

# Upload via SCP (if SSH works)
scp .htaccess.production admin@thynkxpro-dpl.co.za@197.242.150.197:/public_html/.htaccess
```

---

**This should fix the 404 errors in under 1 minute!**
