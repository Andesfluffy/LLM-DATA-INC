# Spreadsheet Upload 401 Fix - Summary

## Changes Made

### 1. **Created Shared Upload Utility** (`lib/uploadUtils.ts`)
   - Centralized Firebase token retrieval with robust error handling
   - Added comprehensive logging to diagnose token issues
   - Created `uploadCsvFile()` function to standardize upload behavior
   - Created `getAuthHeaders()` function for API requests requiring auth

### 2. **Enhanced Authentication Logging** (`lib/auth-server.ts`)
   - Added detailed logging to identify where auth fails
   - Logs when Authorization header is missing
   - Logs when header format doesn't match "Bearer <token>"
   - Logs when token verification fails

### 3. **Improved Firebase Admin Initialization** (`lib/firebase/admin.ts`)
   - Added error handling to `getAdminApp()` with detailed logging
   - Added logging to `verifyIdToken()` to show successful verification
   - Includes error codes and messages for debugging token failures

### 4. **Updated Onboarding Component** (`src/components/onboarding/OnboardingWizard.tsx`)
   - Replaced all manual token retrieval with shared utilities
   - Removed `getAuth()` callback (no longer needed)
   - Uses `uploadCsvFile()` for spreadsheet uploads
   - Uses `getAuthHeaders()` for other API calls
   - Consolidated token retrieval in one place

### 5. **Updated Settings Page** (`app/settings/datasources/page.tsx`)
   - Replaced manual token retrieval with shared utilities
   - Uses `uploadCsvFile()` for spreadsheet uploads
   - Uses `getAuthHeaders()` for other API calls
   - Cleaner code with less duplication

## Key Improvements

✅ **Single Source of Truth**: Token retrieval now happens in one place (`getAuthToken()`)
✅ **Better Error Messages**: Clear error if user not authenticated before upload
✅ **Comprehensive Logging**: Browser console shows all auth steps for debugging
✅ **Server Logging**: API logs show exactly where token verification fails
✅ **FormData Headers**: Properly handles Authorization header with FormData requests
✅ **No Breaking Changes**: Existing functionality preserved

## How to Test the Fix

### Step 1: Verify Environment Setup
```bash
# Check that your .env.local has:
# - NEXT_PUBLIC_FIREBASE_API_KEY (should NOT end with YOUR_API_HASH)
# - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# - NEXT_PUBLIC_FIREBASE_PROJECT_ID
# - NEXT_PUBLIC_FIREBASE_APP_ID (the one you just added)
# - FIREBASE_PROJECT_ID
# - FIREBASE_CLIENT_EMAIL
# - FIREBASE_PRIVATE_KEY (check newlines are not escaped)

cat .env.local
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Test Upload with Logging

**In Browser Console (F12):**
1. Open your app: `http://localhost:3000`
2. Sign in with your Firebase credentials
3. Open DevTools → Console tab
4. Try to upload a spreadsheet
5. Watch console for these logs:
   - `[uploadUtils] Firebase token retrieved successfully` ← Token should exist
   - `[uploadUtils] Starting upload to /api/datasources/upload-csv` ← Upload starts
   - `[uploadUtils] Upload successful` ← Success indicator

**If You See 401 Error:**
1. Check for: `[uploadUtils] No Firebase user found. User may not be logged in.`
   - **Solution**: Make sure you're signed in. Refresh page and sign in again.

2. Check for: `[uploadUtils] getIdToken() returned empty token`
   - **Solution**: Token retrieval failed. Check Firebase console for app ID mismatch.

3. Check for: `[uploadUtils] Failed to get Firebase token:`
   - **Solution**: Exception during token retrieval. Check error details in console.

**In Server Logs (Terminal where `npm run dev` runs):**
Look for messages starting with `[auth-server]` or `[firebase-admin]`:
- `[auth-server] No Authorization header found in request` → Headers not being sent
- `[auth-server] Authorization header does not match Bearer format` → Wrong header format
- `[firebase-admin] Token verification failed:` → Token is invalid/expired
- `[firebase-admin] Token verified successfully for user:` → Success!

### Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Try to upload a spreadsheet
3. Look at the POST request to `/api/datasources/upload-csv`
4. Check the Request Headers:
   - Should see: `Authorization: Bearer eyJ...` (long token string)
   - If missing, the upload utility didn't get a token

## Debugging Checklist

- [ ] User is logged in (check `firebase.auth.currentUser` in console)
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID` in .env.local is the real App ID (not placeholder)
- [ ] `FIREBASE_PRIVATE_KEY` has actual newlines, not `\\n` escape sequences
- [ ] Browser console shows `[uploadUtils]` logs (if not, import might be failing)
- [ ] Server logs show `[auth-server]` messages (if not, auth verification not running)
- [ ] Network tab shows Authorization header in upload request
- [ ] Server logs show token verification success before 401

## Example Success Sequence

```
[Browser Console]
[uploadUtils] Firebase token retrieved successfully
[uploadUtils] Starting upload to /api/datasources/upload-csv

[Server Logs]
[auth-server] Authorization header format validated
[firebase-admin] Token verified successfully for user: abc123xyz

[Response]
200 OK { id: "...", orgId: "...", name: "..." }
```

## Example Failure & Fix

**Symptom**: 401 Unauthorized

**In Browser Console**:
```
[uploadUtils] No Firebase user found. User may not be logged in.
```

**Fix**: 
- Refresh page → Sign in again → Retry upload

---

**Symptom**: 401 Unauthorized

**In Browser Console**:
```
[uploadUtils] Failed to get Firebase token: Error: Firebase app already exists...
```

**Fix**:
- Hard refresh (Ctrl+Shift+R) to clear module cache
- Check if Firebase is initializing multiple times
- This should now be prevented by the shared utility

---

**Symptom**: 401 Unauthorized

**In Server Logs**:
```
[auth-server] No Authorization header found in request
```

**Fix**:
- Check Network tab to see if Authorization header is being sent
- Verify `uploadCsvFile()` is being called (not manual fetch)
- If custom fetch used elsewhere, ensure `getAuthHeaders()` is used

---

**Symptom**: 401 Unauthorized

**In Server Logs**:
```
[firebase-admin] Token verification failed: Signature verification failed
```

**Fix**:
- Token is stale. User needs to sign out/in again
- Check `FIREBASE_PRIVATE_KEY` matches the service account JSON
- Verify no special character encoding issues in env vars

## Questions?

If upload still fails after these steps:
1. Provide the full console output (both browser and server)
2. Share the Network request/response for the upload
3. Confirm all env vars are set correctly
