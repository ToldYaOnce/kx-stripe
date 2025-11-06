#!/bin/bash

# Publish All KX-Stripe Packages Script
# Usage: ./scripts/publish-all.sh [version]
# Example: ./scripts/publish-all.sh patch
# Example: ./scripts/publish-all.sh minor
# Example: ./scripts/publish-all.sh major

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get version argument
VERSION_TYPE=${1:-patch}
print_status "Version bump type: $VERSION_TYPE"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
    print_error "This script must be run from the kx-stripe root directory"
    exit 1
fi

# Step 1: Clean all packages
print_status "🧹 Cleaning all packages..."
pnpm -r clean || true

# Step 2: Install dependencies
print_status "📦 Installing dependencies..."
pnpm install

# Step 3: Build all packages
print_status "🔨 Building all packages..."
pnpm -r build

# Step 4: Verify builds
print_status "✅ Verifying builds..."
if [ ! -f "packages/kx-stripe-cdk/dist/index.js" ]; then
    print_error "CDK package build failed"
    exit 1
fi

if [ ! -f "packages/kx-stripe-runtime/dist/index.js" ]; then
    print_error "Runtime package build failed"
    exit 1
fi

print_success "All packages built successfully"

# Step 5: Bump versions
print_status "📈 Bumping versions ($VERSION_TYPE)..."

cd packages/kx-stripe-cdk
OLD_VERSION_CDK=$(node -p "require('./package.json').version")
npm version $VERSION_TYPE --no-git-tag-version
NEW_VERSION_CDK=$(node -p "require('./package.json').version")
print_success "kx-stripe-cdk: $OLD_VERSION_CDK → $NEW_VERSION_CDK"
cd ../..

cd packages/kx-stripe-runtime
OLD_VERSION_RUNTIME=$(node -p "require('./package.json').version")
npm version $VERSION_TYPE --no-git-tag-version
NEW_VERSION_RUNTIME=$(node -p "require('./package.json').version")
print_success "kx-stripe-runtime: $OLD_VERSION_RUNTIME → $NEW_VERSION_RUNTIME"
cd ../..

# Step 6: Publish CDK package
print_status "🚀 Publishing @toldyaonce/kx-stripe-cdk@$NEW_VERSION_CDK..."
cd packages/kx-stripe-cdk
npm publish
cd ../..

# Step 7: Publish Runtime package
print_status "🚀 Publishing @toldyaonce/kx-stripe-runtime@$NEW_VERSION_RUNTIME..."
cd packages/kx-stripe-runtime
npm publish
cd ../..

print_success "🎉 All packages published successfully!"
print_success "📦 @toldyaonce/kx-stripe-cdk@$NEW_VERSION_CDK"
print_success "📦 @toldyaonce/kx-stripe-runtime@$NEW_VERSION_RUNTIME"

# Step 8: Git operations
print_status "📝 Creating git commit and tag..."
git add .
git commit -m "chore: bump versions to $NEW_VERSION_CDK"
git tag "v$NEW_VERSION_CDK"

print_status "⬆️  Pushing to git..."
git push origin main
git push origin "v$NEW_VERSION_CDK"

print_success "🏁 Publish completed successfully!"
echo
print_status "Next steps:"
echo "  • Install CDK: npm install @toldyaonce/kx-stripe-cdk@$NEW_VERSION_CDK"
echo "  • Install Runtime: npm install @toldyaonce/kx-stripe-runtime@$NEW_VERSION_RUNTIME"

