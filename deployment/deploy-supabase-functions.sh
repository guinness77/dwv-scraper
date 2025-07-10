#!/bin/bash

# DWV Scraper - Supabase Functions Deployment Script
# This script deploys the Supabase Edge Functions for the DWV Scraper application

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it with: npm install -g supabase"
        exit 1
    fi
    
    # Check Supabase CLI version
    SUPABASE_VERSION=$(supabase --version)
    print_status "Supabase CLI version: $SUPABASE_VERSION"
    
    print_success "Prerequisites check passed"
}

# Function to validate Supabase project
validate_supabase_project() {
    print_status "Validating Supabase project..."
    
    # Check if Supabase project is linked
    if ! supabase status &> /dev/null; then
        print_warning "Supabase project not linked. Please link your project first:"
        print_warning "supabase link --project-ref YOUR_PROJECT_REF"
        exit 1
    fi
    
    print_success "Supabase project validation passed"
}

# Function to deploy Supabase functions
deploy_functions() {
    print_status "Deploying Supabase Edge Functions..."
    
    # Check if functions directory exists
    if [ ! -d "supabase/functions" ]; then
        print_error "supabase/functions directory not found"
        exit 1
    fi
    
    # List available functions
    print_status "Available functions:"
    for func_dir in supabase/functions/*/; do
        if [ -d "$func_dir" ] && [ -f "$func_dir/index.ts" ]; then
            func_name=$(basename "$func_dir")
            echo "  - $func_name"
        fi
    done
    
    # Deploy test-dwv-auth function
    if [ -d "supabase/functions/test-dwv-auth" ] && [ -f "supabase/functions/test-dwv-auth/index.ts" ]; then
        print_status "Deploying test-dwv-auth function..."
        supabase functions deploy test-dwv-auth
        print_success "test-dwv-auth function deployed successfully"
    else
        print_warning "test-dwv-auth function not found, skipping..."
    fi
    
    # Deploy scrape-dwv-app function
    if [ -d "supabase/functions/scrape-dwv-app" ] && [ -f "supabase/functions/scrape-dwv-app/index.ts" ]; then
        print_status "Deploying scrape-dwv-app function..."
        supabase functions deploy scrape-dwv-app
        print_success "scrape-dwv-app function deployed successfully"
    else
        print_warning "scrape-dwv-app function not found, skipping..."
    fi
    
    # Deploy scrape-properties function
    if [ -d "supabase/functions/scrape-properties" ] && [ -f "supabase/functions/scrape-properties/index.ts" ]; then
        print_status "Deploying scrape-properties function..."
        supabase functions deploy scrape-properties
        print_success "scrape-properties function deployed successfully"
    else
        print_warning "scrape-properties function not found, skipping..."
    fi
}

# Function to set environment variables
set_environment_variables() {
    print_status "Setting up environment variables..."
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning "No .env file found. Creating one from template..."
        cp deployment/environment-template.env .env
        print_warning "Please edit .env file with your actual credentials before continuing"
        exit 1
    fi
    
    # Load environment variables from .env file
    source .env
    
    # Set environment variables in Supabase
    print_status "Setting DWV_EMAIL environment variable..."
    supabase secrets set DWV_EMAIL="$DWV_EMAIL"
    
    print_status "Setting DWV_PASSWORD environment variable..."
    supabase secrets set DWV_PASSWORD="$DWV_PASSWORD"
    
    print_status "Setting AUTH_TOKEN_EXPIRY environment variable..."
    supabase secrets set AUTH_TOKEN_EXPIRY="$AUTH_TOKEN_EXPIRY"
    
    print_success "Environment variables set successfully"
}

# Function to display environment variable instructions
display_env_instructions() {
    echo ""
    echo "=========================================="
    echo "Environment Variables Setup Instructions"
    echo "=========================================="
    echo ""
    echo "The following environment variables are required for the functions to work properly:"
    echo ""
    echo "1. DWV_EMAIL - Your DWV App email"
    echo "2. DWV_PASSWORD - Your DWV App password"
    echo "3. AUTH_TOKEN_EXPIRY - Token expiry time in seconds (default: 86400 for 24 hours)"
    echo ""
    echo "You can set these variables in Supabase using the following commands:"
    echo ""
    echo "supabase secrets set DWV_EMAIL=your_email@example.com"
    echo "supabase secrets set DWV_PASSWORD=your_password"
    echo "supabase secrets set AUTH_TOKEN_EXPIRY=86400"
    echo ""
    echo "Or you can create a .env file based on the template and run this script again:"
    echo "cp deployment/environment-template.env .env"
    echo ""
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # List deployed functions
    supabase functions list
    
    print_success "Deployment verification completed"
}

# Main function
main() {
    echo "=========================================="
    echo "DWV Scraper - Supabase Functions Deployment"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Validate Supabase project
    validate_supabase_project
    
    # Ask if user wants to set environment variables
    read -p "Do you want to set environment variables from .env file? (y/n): " set_env
    if [[ $set_env == "y" || $set_env == "Y" ]]; then
        set_environment_variables
    else
        display_env_instructions
    fi
    
    # Deploy functions
    deploy_functions
    
    # Verify deployment
    verify_deployment
    
    print_success "Deployment completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
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