# Setting Up SPF and DKIM for thynkxpro-dpl.co.za

## Current Situation
- Email server: mail.thynkxpro-dpl.co.za (reseller112.aserv.co.za)
- Emails are being sent successfully but blocked by Gmail
- Need to add SPF and DKIM records to DNS

## Step-by-Step Setup

### Option 1: Using cPanel (Easiest Method)

#### Step 1: Log into cPanel
1. Go to: https://cpanel.thynkxpro-dpl.co.za (or your cPanel URL)
2. Log in with your cPanel credentials

#### Step 2: Enable DKIM
1. In cPanel, search for **"Email Deliverability"** or **"Email Authentication"**
2. Find your domain: `thynkxpro-dpl.co.za`
3. Click **"Manage"** or **"Configure"**
4. Enable **DKIM** (DomainKeys Identified Mail)
5. Click **"Install the suggested records"** or **"Enable"**
6. cPanel will automatically add DKIM records to your DNS

#### Step 3: Enable SPF
1. In the same Email Authentication section
2. Enable **SPF** (Sender Policy Framework)
3. Click **"Install the suggested records"**
4. cPanel should automatically create the SPF record

#### Step 4: Verify Installation
1. Wait 5-10 minutes for records to propagate
2. In Email Deliverability, check that all show **"Valid"** or green checkmarks

### Option 2: Manual DNS Configuration

If you don't have access to cPanel or prefer manual setup:

#### Step 1: Add SPF Record
Add a TXT record to your DNS:

**Record Type:** TXT
**Name/Host:** @ (or thynkxpro-dpl.co.za)
**Value:**
```
v=spf1 a mx ip4:197.242.150.197 include:aserv.co.za ~all
```

This allows:
- Your domain's A record (a)
- Your domain's MX servers (mx)
- Your database server IP (ip4:197.242.150.197)
- aserv.co.za mail servers (include:aserv.co.za)

#### Step 2: Add DKIM Record

You need to get the DKIM public key from your email server. Try one of these methods:

**Method A: Check existing DKIM**
Run this command to see if DKIM exists:
```bash
dig default._domainkey.thynkxpro-dpl.co.za TXT
```

**Method B: Request from hosting provider**
Contact aserv.co.za support and ask them to:
1. Enable DKIM for donotreply@thynkxpro-dpl.co.za
2. Provide the DKIM public key

**Method C: Generate via cPanel**
If you have cPanel access, it will auto-generate it for you.

#### Step 3: Add DMARC Record (Optional but Recommended)

**Record Type:** TXT
**Name/Host:** _dmarc.thynkxpro-dpl.co.za
**Value:**
```
v=DMARC1; p=none; rua=mailto:donotreply@thynkxpro-dpl.co.za
```

This tells email receivers:
- Accept all emails for now (p=none)
- Send reports to donotreply@thynkxpro-dpl.co.za

### Option 3: Contact Your Hosting Provider

**Fastest option if you're not comfortable with DNS:**

Contact **aserv.co.za** support and say:

> "Hi, I need to set up SPF and DKIM records for thynkxpro-dpl.co.za to improve email deliverability. I'm sending emails from donotreply@thynkxpro-dpl.co.za using mail.thynkxpro-dpl.co.za (reseller112.aserv.co.za). Can you help me enable these email authentication records?"

They should be able to set this up for you in 5-10 minutes.

## How to Access cPanel

You mentioned you have hosting with database access. cPanel is usually at one of these URLs:

1. https://cpanel.thynkxpro-dpl.co.za
2. https://thynkxpro-dpl.co.za:2083
3. https://reseller112.aserv.co.za:2083
4. Check your hosting welcome email for the cPanel URL

**Login credentials:** Usually the same as your hosting account or provided in your welcome email.

## After Setup: Testing

Once you've added the records, wait 15-30 minutes, then test:

```bash
# Test SPF record
dig thynkxpro-dpl.co.za TXT

# Test DKIM record
dig default._domainkey.thynkxpro-dpl.co.za TXT

# Test DMARC record
dig _dmarc.thynkxpro-dpl.co.za TXT
```

Or use online tools:
- https://mxtoolbox.com/spf.aspx
- https://mxtoolbox.com/dkim.aspx
- https://dmarcian.com/dmarc-inspector/

## What Happens Next

Once SPF/DKIM are set up:
- ✅ Emails will pass authentication checks
- ✅ Gmail/Outlook will accept your emails
- ✅ Emails won't go to spam
- ✅ Professional email delivery

**Timeline:**
- DNS changes: 15 minutes - 48 hours (usually within 1 hour)
- After that, test emails should arrive in inbox

## Need Help?

If you:
1. **Don't have cPanel access** → Contact aserv.co.za support
2. **Have cPanel access but need help** → Let me know and I'll guide you through it
3. **Want to use a different email service** → I can set up SendGrid instead (works immediately)

Which option works best for you?
