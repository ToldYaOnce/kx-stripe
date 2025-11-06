#!/bin/bash

# Build and Publish Script for @toldyaonce/kx-stripe-cdk
# Usage: ./build-and-publish.sh [version]
# Example: ./build-and-publish.sh patch
# Example: ./build-and-publish.sh minor
# Example: ./build-and-publish.sh major

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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "tsconfig.json" ]; then
    print_error "This script must be run from the package root directory"
    exit 1
fi

# Get version argument
VERSION_TYPE=${1:-patch}
print_status "Version bump type: $VERSION_TYPE"

# Step 1: Clean previous build
print_status "🧹 Cleaning previous build..."
npm run clean || true
rm -rf dist/

# Step 2: Install dependencies
print_status "📦 Installing dependencies..."
npm install

# Step 3: Build the project
print_status "🔨 Building TypeScript..."
npm run build

# Step 4: Verify build output
print_status "✅ Verifying build output..."
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ] || [ ! -f "dist/index.d.ts" ]; then
    print_error "Build verification failed - missing expected output files"
    exit 1
fi

# Test that the package can be loaded
node -e "
try {
    const pkg = require('./dist/index.js');
    const exports = Object.keys(pkg);
    console.log('✅ Package exports verified:', exports.length, 'exports found');
    if (exports.length === 0) {
        console.error('❌ No exports found in package');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Package loading failed:', error.message);
    process.exit(1);
}
"

print_success "Build verification completed successfully"

# Step 5: Version bump
print_status "📈 Bumping version ($VERSION_TYPE)..."
OLD_VERSION=$(node -p "require('./package.json').version")
npm version $VERSION_TYPE --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
print_success "Version bumped from $OLD_VERSION to $NEW_VERSION"

# Step 6: Check npm authentication
print_status "🔐 Checking npm configuration..."
REGISTRY=$(npm config get registry)
print_success "Registry: $REGISTRY"

# Only check whoami for public npm registry
if [[ "$REGISTRY" == "https://registry.npmjs.org/" ]]; then
    if ! npm whoami > /dev/null 2>&1; then
        print_error "Not logged in to npm. Please run 'npm login' first"
        exit 1
    fi
    NPM_USER=$(npm whoami)
    print_success "Authenticated as: $NPM_USER"
else
    print_success "Using configured registry (GitHub Packages/private registry)"
    NPM_USER="configured-user"
fi

# Step 7: Dry run publish
print_status "🧪 Running publish dry-run..."
npm publish --dry-run

# Step 8: Confirm publish
echo
print_warning "About to publish @toldyaonce/kx-stripe-cdk@$NEW_VERSION"
print_warning "Registry: $(npm config get registry)"
print_warning "User: $NPM_USER"

# Step 9: Publish to npm
print_status "🚀 Publishing to npm..."
npm publish

print_success "🎉 Package published successfully!"
print_success "📦 @toldyaonce/kx-stripe-cdk@$NEW_VERSION is now available"

# Step 10: Git operations (only if in git repo)
if [ -d "../../.git" ]; then
    print_status "📝 Creating git commit and tag..."
    cd ../..
    git add packages/kx-stripe-cdk/package.json
    git commit -m "chore(kx-stripe-cdk): bump version to $NEW_VERSION" || true
    git tag "kx-stripe-cdk-v$NEW_VERSION"
    
    print_status "⬆️  Pushing to git..."
    git push origin main || git push origin master
    git push origin "kx-stripe-cdk-v$NEW_VERSION"
    cd packages/kx-stripe-cdk
fi

print_success "🏁 Build and publish completed successfully!"
echo
print_status "Next steps:"
echo "  • Install: npm install @toldyaonce/kx-stripe-cdk@$NEW_VERSION"
echo "  • Documentation: Update README.md if needed"

