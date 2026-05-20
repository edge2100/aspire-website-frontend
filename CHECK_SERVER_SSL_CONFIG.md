# How to Find and Fix SSL .conf Files on AWS Server

## The config files you need to check are on your AWS server, not in this repository.

---

## Step 1: SSH into Your AWS Server

```bash
# Connect to your EC2 instance
ssh -i /path/to/your-key.pem ec2-user@your-server-ip

# Or if using Ubuntu
ssh -i /path/to/your-key.pem ubuntu@your-server-ip
```

---

## Step 2: Find SSL Configuration Files

### For Apache (Most Common):

```bash
# Check if Apache is installed
which httpd  # Amazon Linux, CentOS
which apache2  # Ubuntu

# Find main config file
cat /etc/httpd/conf/httpd.conf | grep -i "aspirenow"

# Check SSL config directory
ls -la /etc/httpd/conf.d/
cat /etc/httpd/conf.d/ssl.conf

# Find VirtualHost configs
ls -la /etc/httpd/conf.d/*.conf
grep -r "aspirenow.in" /etc/httpd/conf.d/
grep -r "Redirect" /etc/httpd/conf.d/
grep -r "http://" /etc/httpd/conf.d/
```

### For Nginx:

```bash
# Check if Nginx is installed
which nginx

# Find Nginx configs
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
cat /etc/nginx/nginx.conf | grep -i "aspirenow"

# Check for redirects
grep -r "return 301 http://" /etc/nginx/
grep -r "rewrite" /etc/nginx/ | grep "http://"
```

---

## Step 3: Look for Common Problematic Configurations

### Check for HTTP redirects in SSL config:

```bash
# Search ALL config files for HTTP redirects
sudo find /etc -name "*.conf" -type f -exec grep -l "http://www.aspirenow.in" {} \;
sudo find /etc -name "*.conf" -type f -exec grep -l "http://aspirenow.in" {} \;

# Check specifically for SSL configs
sudo grep -r "aspirenow.in" /etc/httpd/conf.d/
sudo grep -r "aspirenow.in" /etc/apache2/sites-available/
sudo grep -r "aspirenow.in" /etc/nginx/
```

---

## Step 4: Check Specific Files That Likely Have the Problem

### File 1: `/etc/httpd/conf.d/ssl.conf` (Apache SSL Config)

```bash
sudo nano /etc/httpd/conf.d/ssl.conf
```

**Look for these sections and check for HTTP redirects:**

```apache
<VirtualHost _default_:443>
    ServerName www.aspirenow.in:443
    
    # Check these lines - they should NOT have http://
    # BAD:
    Redirect permanent / http://www.aspirenow.in/  ❌
    
    # GOOD:
    # (No redirect needed in HTTPS VirtualHost)
</VirtualHost>
```

### File 2: `/etc/httpd/conf.d/aspirenow.conf` (or similar)

```bash
# Check if this file exists
ls -la /etc/httpd/conf.d/ | grep aspirenow

# If it exists, edit it
sudo nano /etc/httpd/conf.d/aspirenow.conf
```

**Look for:**

```apache
<VirtualHost *:80>
    ServerName aspirenow.in
    ServerAlias www.aspirenow.in
    
    # BAD - Redirects to HTTP:
    Redirect permanent / http://www.aspirenow.in/  ❌
    
    # GOOD - Redirects to HTTPS:
    Redirect permanent / https://www.aspirenow.in/  ✅
</VirtualHost>
```

### File 3: Domain Linking Configuration

```bash
# Check for any custom domain configs
sudo find /etc -name "*domain*" -type f
sudo find /etc -name "*link*" -type f

# Check web server includes
sudo grep -r "Include" /etc/httpd/conf/httpd.conf
sudo grep -r "Include" /etc/nginx/nginx.conf
```

---

## Step 5: Common Fixes

### Fix 1: Apache SSL Configuration

**Edit `/etc/httpd/conf.d/ssl.conf`:**

```bash
sudo nano /etc/httpd/conf.d/ssl.conf
```

**Find and replace:**

```apache
# Remove any HTTP redirects from the SSL (443) section
# The SSL VirtualHost should NOT redirect at all

<VirtualHost _default_:443>
    ServerName www.aspirenow.in:443
    DocumentRoot "/var/www/html"
    
    # Remove this if it exists:
    # Redirect permanent / http://www.aspirenow.in/  ❌
    
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    SSLCertificateChainFile /path/to/ca-bundle.crt
    
    # Your other settings...
</VirtualHost>
```

### Fix 2: Apache HTTP to HTTPS Redirect

**Create or edit `/etc/httpd/conf.d/redirect-https.conf`:**

```bash
sudo nano /etc/httpd/conf.d/redirect-https.conf
```

**Add this content:**

```apache
<VirtualHost *:80>
    ServerName aspirenow.in
    ServerAlias www.aspirenow.in
    
    # Force HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://www.aspirenow.in$1 [R=301,L]
</VirtualHost>
```

### Fix 3: Check LoadBalancer ProxyPass Configuration

**Check for ProxyPass with HTTP:**

```bash
sudo grep -r "ProxyPass" /etc/httpd/conf.d/
sudo grep -r "ProxyPassReverse" /etc/httpd/conf.d/
```

**Look for:**

```apache
# BAD - Proxy to HTTP:
ProxyPass / http://www.aspirenow.in/  ❌

# GOOD - Let LoadBalancer handle it:
# (Remove ProxyPass entirely if using ALB)
```

---

## Step 6: Apply Changes

### Restart Apache:

```bash
# Test config first
sudo apachectl configtest
# OR
sudo httpd -t

# If OK, restart
sudo systemctl restart httpd
# OR
sudo service httpd restart
```

### Restart Nginx:

```bash
# Test config first
sudo nginx -t

# If OK, restart
sudo systemctl restart nginx
# OR
sudo service nginx restart
```

---

## Step 7: Find All Config Files Being Used

### Show ALL loaded Apache configs:

```bash
# List all included configs
sudo apachectl -S

# Or show full config (combined)
sudo apachectl -M | grep rewrite
```

### Show ALL loaded Nginx configs:

```bash
# Test and show config structure
sudo nginx -T

# Or just test
sudo nginx -t -c /etc/nginx/nginx.conf
```

---

## Step 8: Check for Domain Linking Script/Config

You mentioned "domain linking" configuration. Check these:

```bash
# Check cron jobs (might have a script that updates configs)
sudo crontab -l
crontab -l

# Check systemd services
sudo systemctl list-units --type=service | grep -i domain
sudo systemctl list-units --type=service | grep -i aspirenow

# Check for custom scripts
sudo find /opt -name "*domain*"
sudo find /opt -name "*aspirenow*"
sudo find /usr/local/bin -name "*domain*"
sudo find /home -name "*domain*" 2>/dev/null
```

---

## Quick Diagnostic Commands to Run

Copy and paste these commands on your server:

```bash
echo "=== Checking for HTTP redirects in all configs ==="
sudo grep -r "http://www.aspirenow.in" /etc/httpd/ 2>/dev/null
sudo grep -r "http://www.aspirenow.in" /etc/apache2/ 2>/dev/null
sudo grep -r "http://www.aspirenow.in" /etc/nginx/ 2>/dev/null

echo ""
echo "=== Checking SSL config files ==="
sudo ls -la /etc/httpd/conf.d/ssl.conf 2>/dev/null
sudo ls -la /etc/apache2/sites-available/*ssl* 2>/dev/null
sudo ls -la /etc/nginx/sites-available/ 2>/dev/null

echo ""
echo "=== Checking Apache VirtualHosts ==="
sudo apachectl -S 2>/dev/null || sudo apache2ctl -S 2>/dev/null

echo ""
echo "=== Checking Nginx config test ==="
sudo nginx -t 2>/dev/null

echo ""
echo "=== Testing actual redirect behavior ==="
curl -IL http://aspirenow.in 2>/dev/null | head -10
```

---

## Expected Output After Fix

When you run `curl -IL http://aspirenow.in`, you should see:

```
HTTP/1.1 301 Moved Permanently
Location: https://www.aspirenow.in/  ✅
Server: Apache/2.4.x (or nginx/1.x)

HTTP/2 200
```

**NOT:**

```
HTTP/1.1 301 Moved Permanently
Location: http://www.aspirenow.in/  ❌
```

---

## If You Can't Find the Config Files

The config might be in:
1. **AWS Load Balancer** (most likely - check AWS Console)
2. **CloudFront Distribution** (check AWS Console)
3. **Custom AMI configuration** (check with whoever set up the server)
4. **Docker container config** (if using containers)
5. **Elastic Beanstalk platform config** (if using EB)

---

## Need to Share Files?

If you want me to review the configs, run this:

```bash
# Collect all relevant configs
sudo tar -czf /tmp/configs.tar.gz \
  /etc/httpd/conf.d/*.conf \
  /etc/httpd/conf/httpd.conf \
  /etc/apache2/sites-available/*.conf \
  /etc/nginx/nginx.conf \
  /etc/nginx/sites-available/*.conf \
  2>/dev/null

# Download the file and share
# Then extract and show contents (sensitive data removed)
```

---

**Pro Tip:** The issue is most likely in `/etc/httpd/conf.d/ssl.conf` or a custom VirtualHost file. Look for any line containing `http://www.aspirenow.in` or `http://aspirenow.in` and change it to `https://`.


