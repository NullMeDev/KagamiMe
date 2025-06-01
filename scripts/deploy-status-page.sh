#!/bin/bash
set -e

# Deploy the status page
cd status-page
echo "Deploying status page..."
wrangler pages publish . --project-name kagamime-status

# Deploy the API
cd api
echo "Deploying API..."
wrangler deploy

echo "Deployment complete!"
