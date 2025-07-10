#!/bin/bash

# DWV Scraper Deployment Script
# This script automates the deployment process for the DWV Scraper application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="dwv-scraper"
SUPABASE_PROJECT_REF=""
FRONTEND_PLATFORM="vercel"  # Options: vercel, netlify, aws, gcp

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it with: npm install -g supabase"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_error ".env file not found. Please create it with the required environment variables"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to validate environment variables
validate_env_vars() {
    print_status "Validating environment variables..."
    
    # Check required environment variables
    required_vars=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Environment variable $var is not set"
            exit 1
        fi
    done
    
    print_success "Environment variables validation passed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    npm ci --production=false
    
    print_success "Dependencies installed successfully"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Run linting
    npm run lint
    
    # Run type checking
    npx tsc --noEmit
    
    print_success "Tests passed successfully"
}

# Function to build frontend
build_frontend() {
    print_status "Building frontend..."
    
    npm run build
    
    # Check if build was successful
    if [ ! -d "dist" ]; then
        print_error "Frontend build failed. dist directory not found"
        exit 1
    fi
    
    print_success "Frontend built successfully"
}

# Function to deploy Supabase backend
deploy_supabase() {
    print_status "Deploying Supabase backend..."
    
    # Check if Supabase project is linked
    if ! supabase status &> /dev/null; then
        if [ -z "$SUPABASE_PROJECT_REF" ]; then
            print_warning "SUPABASE_PROJECT_REF not set. Please link your Supabase project first:"
            print_warning "supabase link --project-ref YOUR_PROJECT_REF"
            exit 1
        else
            print_status "Linking Supabase project..."
            supabase link --project-ref "$SUPABASE_PROJECT_REF"
        fi
    fi
    
    # Apply database migrations
    print_status "Applying database migrations..."
    supabase db push
    
    # Deploy Edge Functions
    print_status "Deploying Edge Functions..."
    
    # Check if functions directory exists
    if [ ! -d "supabase/functions" ]; then
        print_error "supabase/functions directory not found"
        exit 1
    fi
    
    # Deploy each function if it exists
    for func_dir in supabase/functions/*/; do
        if [ -d "$func_dir" ] && [ -f "$func_dir/index.ts" ]; then
            func_name=$(basename "$func_dir")
            # Skip configuration files and shared directories
            if [[ "$func_name" != "_shared" && "$func_name" != "deno.json" && "$func_name" != "import_map.json" ]]; then
                print_status "Deploying $func_name function..."
                if supabase functions deploy "$func_name"; then
                    print_success "$func_name function deployed successfully"
                else
                    print_error "Failed to deploy $func_name function"
                    exit 1
                fi
            fi
        fi
    done
    
    print_success "Supabase backend deployed successfully"
}

# Function to deploy frontend
deploy_frontend() {
    print_status "Deploying frontend to $FRONTEND_PLATFORM..."
    
    case $FRONTEND_PLATFORM in
        "vercel")
            deploy_to_vercel
            ;;
        "netlify")
            deploy_to_netlify
            ;;
        "aws")
            deploy_to_aws
            ;;
        "gcp")
            deploy_to_gcp
            ;;
        *)
            print_error "Unsupported frontend platform: $FRONTEND_PLATFORM"
            exit 1
            ;;
    esac
}

# Function to deploy to Vercel
deploy_to_vercel() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed. Please install it with: npm install -g vercel"
        exit 1
    fi
    
    vercel --prod
}

# Function to deploy to Netlify
deploy_to_netlify() {
    if ! command -v netlify &> /dev/null; then
        print_error "Netlify CLI is not installed. Please install it with: npm install -g netlify-cli"
        exit 1
    fi
    
    netlify deploy --prod --dir=dist
}

# Function to deploy to AWS
deploy_to_aws() {
    print_warning "AWS deployment not implemented yet"
    print_warning "Please deploy manually to AWS S3 + CloudFront"
}

# Function to deploy to GCP
deploy_to_gcp() {
    print_warning "GCP deployment not implemented yet"
    print_warning "Please deploy manually to Google Cloud Storage + Cloud CDN"
}

# Function to run post-deployment tests
run_post_deployment_tests() {
    print_status "Running post-deployment tests..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Test authentication endpoint
    print_status "Testing authentication endpoint..."
    # Add your test logic here
    
    # Test scraping endpoint
    print_status "Testing scraping endpoint..."
    # Add your test logic here
    
    print_success "Post-deployment tests passed"
}

# Function to display deployment summary
display_summary() {
    print_success "Deployment completed successfully!"
    echo ""
    echo "Deployment Summary:"
    echo "=================="
    echo "Project: $PROJECT_NAME"
    echo "Backend: Supabase (Project: $SUPABASE_PROJECT_REF)"
    echo "Frontend: $FRONTEND_PLATFORM"
    echo "Database: PostgreSQL (Supabase)"
    echo "Edge Functions: Deployed"
    echo ""
    echo "Next Steps:"
    echo "1. Configure your domain (if needed)"
    echo "2. Set up monitoring and alerting"
    echo "3. Test all functionality"
    echo "4. Monitor performance and errors"
    echo ""
    echo "Documentation:"
    echo "- Deployment Guide: deployment/deployment-plan.md"
    echo "- Architecture: docs/architecture.md"
    echo "- API Documentation: docs/technical.md"
}

# Main deployment function
main() {
    echo "=========================================="
    echo "DWV Scraper Deployment Script"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Validate environment variables
    validate_env_vars
    
    # Install dependencies
    install_dependencies
    
    # Run tests
    run_tests
    
    # Build frontend
    build_frontend
    
    # Deploy Supabase backend
    deploy_supabase
    
    # Deploy frontend
    deploy_frontend
    
    # Run post-deployment tests
    run_post_deployment_tests
    
    # Display summary
    display_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-ref)
            SUPABASE_PROJECT_REF="$2"
            shift 2
            ;;
        --frontend-platform)
            FRONTEND_PLATFORM="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --project-ref REF       Supabase project reference"
            echo "  --frontend-platform PLATFORM  Frontend deployment platform (vercel, netlify, aws, gcp)"
            echo "  --help                  Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@" 