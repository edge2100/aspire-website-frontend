# AWS SSL/HTTPS Redirect Troubleshooting Guide

## Issue: Still Redirecting to HTTP After .htaccess Fix

Since the `.htaccess` fix didn't resolve the issue, the redirect is likely configured at a higher level in your AWS infrastructure. Here's where to check:

---

## 1. AWS Load Balancer (ALB/ELB) Configuration

**This is the most common culprit!**

### Check Load Balancer Listeners:
1. Go to **AWS Console** → **EC2** → **Load Balancers**
2. Select your load balancer
3. Click **Listeners** tab

### Fix the Configuration:
You should have these listeners:

**HTTP:80 Listener:**
```
Protocol: HTTP
Port: 80
Action: Redirect to HTTPS:443
Status Code: 301 (Permanent Redirect)
```

**HTTPS:443 Listener:**
```
Protocol: HTTPS
Port: 443
Action: Forward to target-group
SSL Certificate: Your ACM certificate
```

### Steps to Fix:
1. **Delete or Edit HTTP:80 listener** if it's forwarding to target group
2. **Add Redirect Rule**:
   - Click "Add listener" or "Edit listener"
   - Protocol: HTTP, Port: 80
   - Default action: **Redirect to...**
   - Protocol: HTTPS
   - Port: 443
   - Status code: 301
   - Save

---

## 2. CloudFront Distribution (If Using CDN)

### Check CloudFront Settings:
1. Go to **CloudFront** console
2. Select your distribution
3. Click **Behaviors** tab
4. Edit the **Default (*)** behavior

### Fix the Configuration:
```
Viewer Protocol Policy: Redirect HTTP to HTTPS
```

### Steps to Fix:
1. Edit behavior
2. Under "Viewer Protocol Policy", select **"Redirect HTTP to HTTPS"**
3. Save changes
4. Wait 5-10 minutes for deployment
5. **Create Invalidation**: Paths: `/*`

---

## 3. Apache Virtual Host Configuration (On EC2 Instance)

### SSH into your EC2 instance:
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

### Check Apache configuration:
```bash
# Find Apache config directory
cd /etc/httpd/conf.d/  # Amazon Linux, CentOS
# OR
cd /etc/apache2/sites-available/  # Ubuntu

# List config files
ls -la

# Check for aspirenow.in config
cat aspirenow.in.conf
# OR
cat 000-default.conf
```

### Look for problematic redirects:
```apache
# BAD - This forces HTTP:
<VirtualHost *:80>
    ServerName aspirenow.in
    Redirect permanent / http://www.aspirenow.in/  ❌
</VirtualHost>
```

### Replace with HTTPS redirect:
```apache
# GOOD - This forces HTTPS:
<VirtualHost *:80>
    ServerName aspirenow.in
    ServerAlias www.aspirenow.in
    Redirect permanent / https://www.aspirenow.in/  ✅
</VirtualHost>

<VirtualHost *:443>
    ServerName www.aspirenow.in
    DocumentRoot /var/www/html
    
    SSLEngine on
    SSLCertificateFile /path/to/cert.crt
    SSLCertificateKeyFile /path/to/private.key
    SSLCertificateChainFile /path/to/chain.crt
    
    # Your other configs...
</VirtualHost>
```

### Restart Apache:
```bash
sudo systemctl restart httpd  # Amazon Linux, CentOS
# OR
sudo systemctl restart apache2  # Ubuntu
```

---

## 4. Nginx Configuration (If Using Nginx)

### SSH into your instance and check Nginx config:
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
cd /etc/nginx/sites-available/
cat aspirenow.in
```

### Look for HTTP redirects:
```nginx
# BAD - Forces HTTP:
server {
    listen 80;
    server_name aspirenow.in www.aspirenow.in;
    return 301 http://www.aspirenow.in$request_uri;  ❌
}
```

### Replace with HTTPS redirect:
```nginx
# GOOD - Forces HTTPS:
server {
    listen 80;
    server_name aspirenow.in www.aspirenow.in;
    return 301 https://www.aspirenow.in$request_uri;  ✅
}

server {
    listen 443 ssl http2;
    server_name www.aspirenow.in;
    
    ssl_certificate /path/to/cert.crt;
    ssl_certificate_key /path/to/private.key;
    
    root /var/www/html;
    # Your other configs...
}
```

### Restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## 5. Route 53 / DNS Configuration

### Check for HTTP redirects in DNS:
1. Go to **Route 53** console
2. Select your hosted zone: **aspirenow.in**
3. Look for **URL Redirect** records

### Fix if found:
- Delete any A records pointing to HTTP endpoints
- Ensure A records point to your Load Balancer or CloudFront distribution

---

## 6. Elastic Beanstalk Configuration (If Using EB)

### Create `.ebextensions` folder in your project:
```bash
mkdir -p .ebextensions
```

### Create file: `.ebextensions/https-redirect.config`
```yaml
files:
  "/etc/httpd/conf.d/ssl_rewrite.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      RewriteEngine On
      <If "-n '%{HTTP:X-Forwarded-Proto}' && %{HTTP:X-Forwarded-Proto} != 'https'">
        RewriteRule (.*) https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
      </If>
```

### Deploy to Elastic Beanstalk:
```bash
eb deploy
```

---

## 7. Check Your Domain Registrar

Sometimes domain registrars have redirect settings:

1. Log into your domain registrar (GoDaddy, Namecheap, etc.)
2. Check for **URL Forwarding** or **Redirect** settings
3. Make sure it's not redirecting to HTTP

---

## Step-by-Step Troubleshooting Process

### Step 1: Identify Where the Redirect Happens
```bash
# Use curl to trace redirects
curl -IL http://aspirenow.in
```

**Look at the output:**
```
HTTP/1.1 301 Moved Permanently
Location: http://www.aspirenow.in/  ❌ (This tells you where redirect happens)
Server: AmazonS3  (or CloudFront, or Apache, etc.)
```

The `Server` header tells you which service is doing the redirect!

### Step 2: Test with Different Tools
```bash
# Test without following redirects
curl -I http://aspirenow.in

# Test HTTPS
curl -I https://aspirenow.in

# Test with www
curl -I http://www.aspirenow.in

# Full trace
curl -v http://aspirenow.in 2>&1 | grep -i location
```

### Step 3: Check Headers
```bash
# Check for X-Forwarded-Proto header
curl -H "X-Forwarded-Proto: http" https://aspirenow.in -v
```

---

## Quick Fix Priority Order

Check in this order (most common to least):

1. **✅ Load Balancer (ALB/ELB)** - 80% of issues
2. **✅ CloudFront Distribution** - 15% of issues  
3. **✅ Apache/Nginx VirtualHost** - 4% of issues
4. **✅ .htaccess** - 1% of issues (already fixed)

---

## Testing After Each Fix

After making changes, test with:

```bash
# Clear local DNS cache
# Mac:
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Windows:
ipconfig /flushdns

# Linux:
sudo systemd-resolve --flush-caches
```

Then test:
```bash
curl -IL http://aspirenow.in
```

Should see:
```
HTTP/1.1 301 Moved Permanently
Location: https://www.aspirenow.in/  ✅
```

---

## AWS Console Quick Links

- **Load Balancers**: EC2 → Load Balancers
- **CloudFront**: CloudFront → Distributions
- **Route 53**: Route 53 → Hosted Zones
- **Certificate Manager**: Certificate Manager → Certificates
- **Elastic Beanstalk**: Elastic Beanstalk → Environments

---

## Need Help Finding the Issue?

Run this diagnostic script on your local machine:

```bash
#!/bin/bash
echo "Testing aspirenow.in redirects..."
echo ""

echo "1. Testing http://aspirenow.in"
curl -IL http://aspirenow.in | head -5
echo ""

echo "2. Testing http://www.aspirenow.in"
curl -IL http://www.aspirenow.in | head -5
echo ""

echo "3. Testing https://aspirenow.in"
curl -IL https://aspirenow.in | head -5
echo ""

echo "4. Testing https://www.aspirenow.in"
curl -IL https://www.aspirenow.in | head -5
echo ""

echo "Done!"
```

Save as `test-ssl.sh`, run with `bash test-ssl.sh`, and share the output.

---

## Contact AWS Support

If you're still stuck, contact AWS Support with:
1. Load Balancer ARN
2. CloudFront Distribution ID
3. Route 53 Hosted Zone ID
4. Output of the diagnostic script above

---

**Last Updated**: November 2025

