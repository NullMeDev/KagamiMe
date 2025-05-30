#!/usr/bin/env bash

# KagamiMe Docker Development Helper Script
# This script helps with building, running, and debugging KagamiMe in Docker

# Text colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default settings
ACTION=""
SHOW_LOGS=true
FORCE_REBUILD=false

# Display ASCII art banner
show_banner() {
  echo -e "${PURPLE}"
  echo "╦╔═  ╔═╗  ╔═╗  ╔═╗  ╔╦╗ ╦ ╔╦╗ ╔═╗"
  echo "╠╩╗  ╠═╣  ║ ╦  ╠═╣  ║║║ ║ ║║║ ║╣ "
  echo "╩ ╩  ╩ ╩  ╚═╝  ╩ ╩  ╩ ╩ ╩ ╩ ╩ ╚═╝"
  echo -e "${NC}"
  echo -e "${BOLD}Docker Development Helper Script${NC}"
  echo
}

# Logging functions
log_info() {
  echo -e "${CYAN}[INFO] $1${NC}"
}

log_success() {
  echo -e "${GREEN}[SUCCESS] $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_error() {
  echo -e "${RED}[ERROR] $1${NC}" >&2
}

# Display help message
show_help() {
  echo -e "${BOLD}KagamiMe Docker Development Helper${NC}"
  echo
  echo "Usage: $0 [action] [options]"
  echo
  echo "Actions:"
  echo "  build      Build the Docker image"
  echo "  start      Start the container (will build if image doesn't exist)"
  echo "  stop       Stop the running container"
  echo "  restart    Restart the container"
  echo "  logs       View container logs"
  echo "  bash       Open a bash shell in the container"
  echo "  test       Run the test suite in the container"
  echo "  rebuild    Force rebuild the Docker image and restart"
  echo
  echo "Options:"
  echo "  --no-logs  Don't automatically show logs after start/restart"
  echo "  --help     Show this help message"
  echo
  echo "Examples:"
  echo "  $0 start           # Build and start the container"
  echo "  $0 logs            # View container logs"
  echo "  $0 rebuild         # Force rebuild and restart"
  echo "  $0 bash            # Open a shell in the container"
  echo
}

# Check if Docker is installed and running
check_docker() {
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
  fi

  if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
  fi

  # Check if Docker daemon is running
  if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running. Please start Docker first."
    exit 1
  }
}

# Build the Docker image
build_image() {
  log_info "Building Docker image..."
  
  if [ "$FORCE_REBUILD" = true ]; then
    log_info "Force rebuilding with --no-cache option..."
    if ! docker-compose build --no-cache; then
      log_error "Failed to build Docker image."
      exit 1
    }
  else
    if ! docker-compose build; then
      log_error "Failed to build Docker image."
      exit 1
    }
  fi
  
  log_success "Docker image built successfully."
}

# Start the container
start_container() {
  log_info "Starting container..."
  
  # Check if the container is already running
  if [ "$(docker ps -q -f name=kagamime-dev)" ]; then
    log_warning "Container is already running. Use 'restart' to restart it."
    return 0
  fi
  
  # Check if the image exists, if not build it
  if [ -z "$(docker images -q kagamime-dev:latest)" ]; then
    log_info "Image not found. Building first..."
    build_image
  fi
  
  # Start the container
  if ! docker-compose up -d; then
    log_error "Failed to start container."
    exit 1
  fi
  
  log_success "Container started successfully."
  log_info "Debug port: http://localhost:9229"
  
  # Show logs if requested
  if [ "$SHOW_LOGS" = true ]; then
    show_logs
  }
}

# Stop the container
stop_container() {
  log_info "Stopping container..."
  
  if ! docker-compose down; then
    log_error "Failed to stop container."
    exit 1
  fi
  
  log_success "Container stopped successfully."
}

# Restart the container
restart_container() {
  log_info "Restarting container..."
  
  stop_container
  start_container
}

# Show container logs
show_logs() {
  log_info "Showing container logs (press Ctrl+C to exit)..."
  docker-compose logs -f
}

# Open a bash shell in the container
open_bash() {
  log_info "Opening bash shell in container..."
  
  # Check if the container is running
  if [ -z "$(docker ps -q -f name=kagamime-dev)" ]; then
    log_warning "Container is not running. Starting it first..."
    start_container
  }
  
  docker-compose exec kagamime bash
}

# Run tests in the container
run_tests() {
  log_info "Running tests in container..."
  
  # Check if the container is running
  if [ -z "$(docker ps -q -f name=kagamime-dev)" ]; then
    log_warning "Container is not running. Starting it first..."
    start_container
  }
  
  docker-compose exec kagamime npm test
}

# Parse command-line arguments
parse_args() {
  if [ $# -eq 0 ]; then
    show_help
    exit 0
  fi
  
  ACTION="$1"
  shift
  
  # Parse options
  while [ $# -gt 0 ]; do
    case "$1" in
      --no-logs)
        SHOW_LOGS=false
        ;;
      --help)
        show_help
        exit 0
        ;;
      *)
        log_warning "Unknown option: $1"
        ;;
    esac
    shift
  done
}

# Main function
main() {
  show_banner
  check_docker
  parse_args "$@"
  
  case "$ACTION" in
    build)
      build_image
      ;;
    start)
      start_container
      ;;
    stop)
      stop_container
      ;;
    restart)
      restart_container
      ;;
    logs)
      show_logs
      ;;
    bash)
      open_bash
      ;;
    test)
      run_tests
      ;;
    rebuild)
      FORCE_REBUILD=true
      build_image
      restart_container
      ;;
    *)
      log_error "Unknown action: $ACTION"
      show_help
      exit 1
      ;;
  esac
}

# Execute main function with all arguments
main "$@"

