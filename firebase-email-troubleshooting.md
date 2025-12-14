# Firebase Email Configuration Troubleshooting Guide

## Common Issues with Firebase Password Reset Emails

### 1. Email Templates Not Configured
Firebase requires email templates to be configured for password reset emails to work.

**Solution:**
1. Go to Firebase Console → Authentication → Templates
2. Enable the Password Reset email template
3. Configure the sender name and email address
4. Set the action URL to match your domain

### 2. Authorized Domains Issue
Your domain must be added to the authorized domains list.

**Solution:**
1. Go to Firebase Console → Authentication → Settings
2. Add your domain to the "Authorized domains" list
3. Make sure the action URL in your code matches an authorized domain

### 3. Email Service Not Enabled
Sometimes the email service needs to be manually enabled.

**Solution:**
1. Go to Firebase Console → Authentication → Sign-in method
2. Make sure "Email/Password" sign-in method is enabled
3. Check that email templates are not disabled

### 4. API Key Restrictions
Your Firebase API key might have restrictions that prevent email sending.

**Solution:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Find your Firebase API key
3. Check if there are any restrictions (HTTP referrers, IP addresses, etc.)
4. Add your domain to allowed referrers if restrictions exist

### 5. Email Provider Issues
Some email providers (especially free ones) may block Firebase emails.

**Solution:**
1. Check spam/junk folders
2. Try with a different email provider (Gmail, Outlook, etc.)
3. Check if your email domain has any filtering rules

## Testing Steps

1. **Use the test page:** Open `firebase-email-test.html` in your browser
2. **Check browser console:** Look for any error messages
3. **Check Firebase Console:** Look at the Authentication logs
4. **Try different email addresses:** Test with Gmail, Outlook, etc.

## Code Issues to Check

### Make sure your action URL is correct:
```javascript
const actionCodeSettings = {
    url: window.location.origin + '/login.html', // Make sure this matches your authorized domain
    handleCodeInApp: false
};
```

### Verify Firebase is initialized before calling:
```javascript
if (typeof firebaseServices === 'undefined' || !firebaseServices.auth) {
    throw new Error('Firebase services not available. Please refresh the page.');
}
```

## What to Do Next

1. **Check Firebase Console logs** for any authentication errors
2. **Test with the provided test pages** (`test-firebase.html` and `firebase-email-test.html`)
3. **Try a different email address** (preferably Gmail or Outlook)
4. **Check spam folders** in the recipient email
5. **Verify email templates are enabled** in Firebase Console
6. **Check authorized domains** are properly configured

## If Still Not Working

If none of these solutions work, please:
1. Open the browser console (F12) when testing
2. Copy any error messages you see
3. Check the Network tab for any failed requests to Firebase
4. Let me know what email address you're testing with
5. Share any console error messages you see