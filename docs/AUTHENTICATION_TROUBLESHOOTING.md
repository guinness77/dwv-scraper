# Authentication Troubleshooting Guide - DWV Scraper

## Step-by-Step Verification Process

### Step 1: Test Authentication Function

1. **Open the application** at your deployed URL
2. **Go to "Teste de Autenticação" tab**
3. **Click "Testar Autenticação DWV"**
4. **Check the response details:**

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Login bem-sucedido com redirecionamento",
  "cookies": "Cookie recebido (não exibido por segurança)",
  "redirectLocation": "/dashboard" or "/home",
  "tokenExpiry": "2025-01-XX..."
}
```

**Common Failure Responses:**
```json
{
  "success": false,
  "message": "Login falhou. Form status: 200, Location: /login"
}
```

### Step 2: Check Browser Developer Tools

1. **Open Developer Tools (F12)**
2. **Go to Network tab**
3. **Click "Testar Autenticação DWV"**
4. **Look for the request to your Edge Function:**
   - URL should be: `https://your-project.supabase.co/functions/v1/test-dwv-auth`
   - Status should be: 200
   - Response should contain authentication details

**Common Issues:**
- **404 Error**: Edge Function not deployed
- **CORS Error**: Function deployed but CORS headers missing
- **500 Error**: Function error (check Supabase logs)

### Step 3: Check Supabase Function Logs

1. **Go to Supabase Dashboard**
2. **Navigate to Edge Functions**
3. **Click on "test-dwv-auth" function**
4. **Check the logs for errors:**

**Look for these log patterns:**
```
✅ Good: "Autenticação realizada com sucesso"
❌ Bad: "Falha ao acessar página de login: 403"
❌ Bad: "CSRF Token encontrado: Nenhum"
❌ Bad: "Login falhou. Form status: 200"
```

### Step 4: Test Property Extraction

1. **Go to "DWV App (Autenticado)" tab**
2. **Click "Extrair Imóveis do DWV App"**
3. **Monitor the response:**

**Expected Success:**
```json
{
  "success": true,
  "properties": [...],
  "total_found": 25,
  "message": "25 propriedades encontradas, 5 novas salvas no banco"
}
```

### Step 5: Check Database

1. **Go to Supabase Dashboard**
2. **Navigate to Table Editor**
3. **Check "properties" table**
4. **Verify if properties are being saved**

## Common Issues and Solutions

### Issue 1: Authentication Succeeds but No Properties Found

**Symptoms:**
- Authentication test returns success
- Property extraction returns 0 properties
- No error messages

**Possible Causes:**
1. **DWV App structure changed**
2. **No properties available on the account**
3. **Parsing logic needs updating**

**Solutions:**
1. Check if the DWV App website structure changed
2. Verify the account has access to properties
3. Update the scraping selectors in the Edge Function

### Issue 2: CORS Errors

**Symptoms:**
- Network requests fail with CORS errors
- Functions return 0 status code

**Solutions:**
1. Verify CORS headers in Edge Functions
2. Check if domain is whitelisted in Supabase

### Issue 3: Environment Variables Missing

**Symptoms:**
- Functions use fallback credentials
- Inconsistent behavior

**Solutions:**
1. Set environment variables in Supabase:
```bash
supabase secrets set DWV_EMAIL=fer.scarduelli@gmail.com
supabase secrets set DWV_PASSWORD=dwv@junttus
supabase secrets set AUTH_TOKEN_EXPIRY=86400
```

### Issue 4: Database Permission Issues

**Symptoms:**
- Properties extracted but not saved
- Silent failures

**Solutions:**
1. Check RLS policies on properties table
2. Verify Supabase service role key

## Debugging Commands

### Check Supabase Status
```bash
supabase status
```

### Check Function Deployment
```bash
supabase functions list
```

### View Function Logs
```bash
supabase functions logs test-dwv-auth
supabase functions logs scrape-dwv-app
```

### Test Functions Locally
```bash
supabase functions serve
```

## Manual Testing Steps

### Test 1: Direct Function Call
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/test-dwv-auth" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Test 2: Check Database Connection
```bash
curl -X GET "https://your-project.supabase.co/rest/v1/properties?select=*&limit=5" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY"
```

## Next Steps Based on Results

### If Authentication Fails:
1. Check DWV App login page for changes
2. Update CSRF token extraction logic
3. Verify credentials are correct
4. Check for rate limiting

### If Authentication Succeeds but No Properties:
1. Check DWV App property listing pages
2. Update property extraction selectors
3. Verify account has access to properties
4. Check API endpoints for changes

### If Properties Found but Not Saved:
1. Check database permissions
2. Verify table schema
3. Check for duplicate prevention logic
4. Review error logs

## Contact Information

If issues persist:
1. Check Supabase function logs
2. Review browser console errors
3. Test with different browsers
4. Verify network connectivity