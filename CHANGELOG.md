# Changelog

All notable changes to KagamiMe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-05-30

### Added
- **Docker Support**: Added multi-stage Dockerfile for optimized container builds
- **Smoke Test**: Added `test-smoke.js` script to verify core functionality
- **Improved Error Handling**: More consistent console error messages and exit codes
- **Centralized Config Management**: Consolidated environment variable loading

### Changed
- **Simplified Installation**: Replaced complex interactive installer with minimal, non-interactive script
- **Environment Configuration**: Streamlined .env.sample file for clarity
- **Documentation**: Updated README.md to reflect new features and removed components
- **Fact-Checking**: Refactored to use Google Fact Check Tools and ClaimBuster only
- **Default Command Responses**: Updated default responses for removed functionality

### Removed
- **OpenAI Integration**: Removed all OpenAI connectivity
  - Removed OpenAI dependency from package.json
  - Removed OpenAI client and related imports
  - Removed OpenAI API key from environment variables
  - Modified MultiAPIFactChecker to use remaining fact checking methods
- **Biolock Functionality**: Eliminated Biolock feature set
  - Removed related command handlers
  - Removed environment variable references
  - Purged integration points in install script
  
### Fixed
- **TypeScript Errors**: 
  - Fixed typing issues in MultiAPIFactChecker
  - Improved type checking in main application
  - Added proper error handling for asynchronous operations
- **Package Dependencies**: Cleaned up unused and outdated dependencies

## [2.1.0] - 2025-04-15

### Added
- Multi-API fact checking system
- Integration with Google Fact Check Tools API
- ClaimBuster integration for claim worthiness analysis
- Enhanced fact check command with result formatting

### Changed
- Improved error handling in API requests
- Updated documentation for API setup

## [2.0.0] - 2025-02-20

### Added
- Enhanced architecture
- Improved documentation
- Ubuntu 24.04 support

### Changed
- Complete refactoring of core components
- Updated to Node.js 18.x

## [1.5.0] - 2025-01-10

### Added
- Advanced RSS monitoring with 11+ default sources
- Category-based feed organization
- Feed health monitoring

## [1.4.0] - 2024-12-05

### Added
- SQLite database optimization
- Intelligent caching
- Improved query performance

## [1.3.0] - 2024-11-18

### Added
- Admin controls
- Permission system
- Role-based access control

## [1.2.0] - 2024-10-22

### Added
- Daily digest automation
- Cron scheduling
- Customizable notification timing

## [1.1.0] - 2024-09-15

### Added
- Web scraping functionality
- Article deduplication
- Content extraction improvements

## [1.0.0] - 2024-08-01

### Added
- Initial release
- Discord integration
- Basic RSS functionality
- Command system

