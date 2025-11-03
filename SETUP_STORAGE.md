# Storage Setup Guide - Fix "Failed to Upload" Issue

## The Problem
The file upload is failing because the storage bucket doesn't exist yet in Supabase.

## Solution: Create Storage Bucket Manually

### Step 1: Go to Supabase Dashboard

1. Open your browser and go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: `rzenkimnmxbdgkutnyin`

### Step 2: Create Storage Bucket

1. In the left sidebar, click on **Storage**
2. Click the **"New bucket"** button (or "Create bucket")
3. Enter the following details:
   - **Name:** `attachments`
   - **Public bucket:** ✅ **Check this box** (IMPORTANT!)
   - Click **Create bucket**

### Step 3: Set Storage Policies

After creating the bucket, you need to add policies:

1. Click on the **`attachments`** bucket you just created
2. Click on **Policies** tab (or Configuration → Policies)
3. Click **"New Policy"** and add the following policies:

#### Policy 1: Allow Authenticated Users to Upload
```sql
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Policy 2: Allow Users to View Their Own Files
```sql
CREATE POLICY "Users can view their own attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### Policy 3: Allow All Authenticated Users to View All Files
```sql
CREATE POLICY "Authenticated users can view all attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');
```

#### Policy 4: Allow Users to Delete Their Own Files
```sql
CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 4: Run Database Migrations (Alternative Method)

If you prefer to use SQL migrations:

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste the content from:
   - `supabase/migrations/20251103000000_add_file_support.sql`
3. Click **Run** to execute the migration
4. Repeat for:
   - `supabase/migrations/20251103000001_add_feedback.sql`

### Step 5: Verify Storage Setup

1. Go back to **Storage** → **attachments**
2. You should see:
   - ✅ Public bucket is enabled
   - ✅ Policies are listed under the Policies tab

### Step 6: Test File Upload

1. Refresh your application
2. Try uploading a file in:
   - Notes
   - Announcements
   - Assignment submissions
3. The upload should now work! ✅

## Common Issues & Solutions

### Issue: "Failed to upload" error
**Solution:** Make sure the bucket is marked as **Public**

### Issue: "Access denied" error
**Solution:** Check that all 4 policies are added correctly

### Issue: Files upload but can't be viewed
**Solution:** Ensure Policy 3 (view all attachments) is added

### Issue: Migration fails
**Solution:** The bucket might already exist. Try creating it manually via dashboard instead.

## Quick Video Tutorial

You can also watch Supabase's official guide:
https://supabase.com/docs/guides/storage/quickstart

---

**After completing these steps, your file upload feature will work perfectly!** 🎉
