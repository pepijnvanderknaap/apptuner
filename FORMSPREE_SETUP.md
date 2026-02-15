# Formspree Contact Form Setup Guide

## Quick Setup (5 minutes)

### Step 1: Sign Up for Formspree
1. Go to [formspree.io](https://formspree.io)
2. Click "Get Started" (free account)
3. Sign up with your email

### Step 2: Create a Form
1. Once logged in, click "New Form"
2. Name it: **"AppTuner Contact Form"**
3. Click "Create Form"

### Step 3: Configure Form Settings
1. In the form settings, set:
   - **Email destination**: `info@apptuner.io`
   - **From name**: Use submitter's name
   - **From email**: Use submitter's email
2. Save settings

### Step 4: Get Your Form ID
1. Look for the form endpoint URL in your dashboard
2. It will look like: `https://formspree.io/f/xyzabcde`
3. Copy the 8-character code at the end (e.g., `xyzabcde`)

### Step 5: Add Form ID to Your App
1. Open your `.env` file
2. Add this line (replace with your actual form ID):
   ```
   VITE_FORMSPREE_FORM_ID=xyzabcde
   ```
3. Save the file
4. Restart your dev server (`npm run dev`)

### Step 6: Test It!
1. Go to your landing page
2. Click "Contact" in the footer
3. Fill out the form
4. Click "Send Message"
5. Check info@apptuner.io for the email

## What Happens Now

✅ Users fill out the form on your website
✅ Form submits directly to Formspree
✅ Formspree forwards email to info@apptuner.io
✅ You reply from info@apptuner.io
✅ No "choose email provider" popup!

## Formspree Free Tier Limits

- **50 submissions/month** (free)
- Upgrade to $10/month for 1,000 submissions if needed
- More than enough for early stage

## Troubleshooting

**Form not working?**
- Check that `VITE_FORMSPREE_FORM_ID` is in your `.env` file
- Make sure dev server was restarted after adding the ID
- Verify the form ID is correct (8 characters)

**Emails not arriving?**
- Check Formspree dashboard for submissions
- Verify info@apptuner.io is set as the destination
- Check spam folder

**Fallback behavior:**
- If Formspree isn't configured, form will show success but only log to console
- Mailto links are still available as backup

## Professional Appearance

Users see:
1. Clean contact form
2. Type message and click send
3. Success message appears
4. Email arrives in your inbox

Much better than "choose email provider" popup!
