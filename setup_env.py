#!/usr/bin/env python3
import os
import subprocess
import sys

print("\n" + "="*70)
print("  imobi Staging Credentials Setup")
print("="*70 + "\n")

# Create .env.staging from template
if not os.path.exists(".env.staging"):
    os.system("cp .env.staging.example .env.staging")
    print("✓ Created .env.staging\n")
else:
    print("Note: .env.staging already exists. Will update values.\n")

# Generate secure keys
print("━" * 70)
print("1. Security Keys")
print("━" * 70 + "\n")

jwt_secret = subprocess.check_output(["openssl", "rand", "-base64", "48"]).decode().strip()
print(f"✓ Generated JWT_SECRET: {jwt_secret}\n")

encryption_key = subprocess.check_output(["openssl", "rand", "-base64", "32"]).decode().strip()
print(f"✓ Generated ENCRYPTION_KEY: {encryption_key}\n")

# AWS Configuration
print("━" * 70)
print("2. AWS S3")
print("━" * 70 + "\n")

aws_region = input("AWS Region (default: us-east-1): ").strip() or "us-east-1"
aws_access_key = input("AWS Access Key ID: ").strip()
aws_secret_key = input("AWS Secret Access Key: ").strip()
s3_bucket = input("S3 Bucket Name (default: imobi-evidencias-staging): ").strip() or "imobi-evidencias-staging"

# Email Configuration
print("\n" + "━" * 70)
print("3. Email Provider (SMTP)")
print("━" * 70 + "\n")

smtp_host = input("SMTP Host (e.g., smtp.gmail.com): ").strip()
smtp_port = input("SMTP Port (default: 587): ").strip() or "587"
smtp_user = input("SMTP User (e.g., contato.vinicaetano93@gmail.com): ").strip()
smtp_password = input("SMTP Password (Gmail app password): ").strip()
smtp_from = input("SMTP From Email: ").strip()

# Firebase Configuration
print("\n" + "━" * 70)
print("4. Firebase")
print("━" * 70 + "\n")

firebase_project = input("Firebase Project ID (e.g., imobi-staging): ").strip()
firebase_email = input("Firebase Client Email: ").strip()
print("Paste Firebase Private Key (paste entire key, press Ctrl+D when done):")
firebase_key = sys.stdin.read().strip()

# Update .env.staging
print("\n" + "━" * 70)
print("Updating .env.staging")
print("━" * 70 + "\n")

env_vars = {
    "JWT_SECRET": jwt_secret,
    "ENCRYPTION_KEY": encryption_key,
    "AWS_REGION": aws_region,
    "AWS_ACCESS_KEY_ID": aws_access_key,
    "AWS_SECRET_ACCESS_KEY": aws_secret_key,
    "S3_BUCKET": s3_bucket,
    "EMAIL_PROVIDER": "smtp",
    "SMTP_HOST": smtp_host,
    "SMTP_PORT": smtp_port,
    "SMTP_USER": smtp_user,
    "SMTP_PASSWORD": smtp_password,
    "SMTP_FROM": smtp_from,
    "FIREBASE_PROJECT_ID": firebase_project,
    "FIREBASE_CLIENT_EMAIL": firebase_email,
    "FIREBASE_PRIVATE_KEY": firebase_key,
}

with open(".env.staging", "r") as f:
    lines = f.readlines()

with open(".env.staging", "w") as f:
    for line in lines:
        key = line.split("=")[0].strip()
        if key in env_vars:
            f.write(f"{key}={env_vars[key]}\n")
        else:
            f.write(line)

print("✓ Updated .env.staging with all credentials\n")
print("━" * 70)
print("Setup Complete!")
print("━" * 70)
print("\nNext step: Run 'bash DEPLOY.sh' to start staging deployment\n")
