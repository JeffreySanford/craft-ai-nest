<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# Craft AI NestJS Platform

A robust, secure backend platform built with NestJS, designed to support advanced technology solutions with integrated AI capabilities, rich media processing, and comprehensive logging. This platform is engineered to meet federal-grade security and compliance requirements while providing high observability and auditability.

## Overview

Craft AI is a foundation platform for applications that need to combine:
- AI-powered insights and code assistance
- File and graphics management
- Structured logging and auditing
- Type-safe, reactive programming patterns

## Key Components

### 🤖 AI Integration with Local LLM (Ollama/CodeLlama)

**Purpose:** Provide on-demand, AI-driven coding assistance and data processing capabilities without external dependencies.

**Features:**
- Integration with locally hosted LLM models via `@langchain/ollama` package
- Reactive request handling using RxJS observables
- GraphQL and REST endpoints for AI-generated responses

**Benefits:**
- Instant coding suggestions and data visualization assistance
- Complete data privacy by keeping all processing local
- No reliance on external cloud APIs

### 📊 Graphics Module (MongoDB GridFS)

**Purpose:** Manage public domain graphics and images to enhance project visualizations.

**Features:**
- File Upload Endpoint: Multer-based file handling with MongoDB GridFS storage
- File Retrieval: Streaming of stored files back to clients
- GraphQL integration for URL-based image access

**Benefits:**
- Flexible, scalable storage for dynamic visual content
- Type-safe processing with RxJS observable patterns
- Seamless integration with front-end applications

### 📝 Logging & Auditing System

**Purpose:** Maintain comprehensive audit trails and enable real-time monitoring.

**Features:**
- Winston-based structured logging to console and files
- Real-time log streaming through EventSource
- Advanced log filtering and visualization
- MongoDB collection size monitoring with D3.js visualization

**Benefits:**
- Enhanced transparency and accountability
- Federal/enterprise compliance capabilities
- Robust debugging and monitoring tools

### ⚡ Reactive & Type-Safe Architecture

**Purpose:** Ensure robust, scalable, and maintainable application development.

**Features:**
- RxJS observables for all asynchronous operations
- Strict TypeScript configurations and ESLint rules
- Comprehensive type definitions

**Benefits:**
- Predictable and debuggable codebase
- Compilation-time error catching
- Improved developer experience

### 📚 API Documentation with Swagger

**Purpose:** Provide interactive API documentation and testing capabilities.

**Features:**
- OpenAPI/Swagger specification for all API endpoints
- Interactive UI for testing endpoints directly from the browser
- Request/response schema validation
- Easy access from the logs viewer interface

**Benefits:**
- Simplified API integration and testing
- Self-documenting endpoints with examples
- Ability to trigger log events directly from the documentation

## Setup and Installation

### Prerequisites
- Node.js 18+
- MongoDB 5+
- Ollama with CodeLlama 13B (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/craft-ai-nest.git

# Install dependencies
npm install

# Configure environment (see .env.example)
cp .env.example .env
# Edit .env with your configuration

# Start the application
npm run start:dev
```

## Installation Notes

### Express Version Compatibility

This project requires special handling of Express versions due to NestJS 11's transition to Express 5 while many ecosystem packages still require Express 4:

- We use `@nestjs/serve-static@3.0.1` (instead of 5.x) for compatibility with Express 4.x
- Installation requires the `--legacy-peer-deps` flag: `npm install --legacy-peer-deps`
- A convenience script is provided: `npm run install:safe`

## Configuration

Key configuration options are available in the following files:
- `.env` - Environment variables
- `src/mongo/mongo-stats.service.ts` - Collection size limits
- `src/winston/winston-logging.service.ts` - Logging configuration

## API Endpoints

### AI Endpoints
- `POST /api/ai/complete` - Submit a prompt for AI completion
- `GraphQL: aiCompletion(prompt: String!)` - GraphQL query for AI completion

### Graphics Endpoints
- `POST /graphics` - Upload a graphic file
- `GET /graphics/:id` - Retrieve a graphic file
- `GraphQL: graphicUrl(id: String!)` - Get URL for a graphic

### Logging Endpoints
- `GET /logs` - Get filtered logs
- `GET /logs/view` - Web interface for log visualization
- `GET /logs/stream` - EventSource stream for real-time logs
- `GET /mongo-stats` - MongoDB collection size visualization

### API Documentation
- `GET /api` - Interactive Swagger UI documentation

## Development

### Project Structure
- `src/ai` - AI integration services
- `src/graphics` - File handling modules
- `src/logger` - Logging and auditing system
- `src/mongo` - MongoDB integrations and statistics
- `src/views` - Frontend templates and visualizations

### Testing
```bash
# Run unit tests
npm run test

# Run end-to-end tests
npm run test:e2e

# Check test coverage
npm run test:cov
```

## Built With

- [NestJS](https://nestjs.com/) - The web framework
- [RxJS](https://rxjs.dev/) - Reactive Extensions Library
- [MongoDB](https://www.mongodb.com/) - Database
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling
- [Winston](https://github.com/winstonjs/winston) - Logging framework
- [LangChain](https://langchain.com/) - AI framework
- [D3.js](https://d3js.org/) - Data visualization
- [Swagger](https://swagger.io/) - API documentation

## Integrating with Client Applications

This platform is designed to work seamlessly with modern frontend frameworks. Examples:

- Use the logging API to capture client-side events and user interactions
- Leverage the graphics API for dynamic content in dashboards
- Integrate the AI service for code completion or data analysis features

## Developer Integrations

The Craft AI NestJS platform is designed to integrate directly into the developer workflow through multiple channels:

### 🧰 Custom VS Code Extension

**Purpose:** Enhance developer productivity by bringing platform capabilities directly into the IDE.

**Features:**
- **AI-Powered Code Assistance:** Send code context to AI endpoints (`/api/ai/complete`) to receive intelligent suggestions, refactoring ideas, and automated tests
- **Graphics Management:** Drag-and-drop media into projects for automatic upload to the Graphics Module with URL generation
- **Real-Time Logging Access:** View telemetry and audit trails within the editor for faster debugging

**Benefits:**
- Seamless integration with development workflow
- Instant AI-powered code insights without leaving the editor
- Simplified asset management with automatic URL generation

### 🖥️ Command-Line Tools & APIs

**Purpose:** Enable automation and integration with build pipelines and other developer tools.

**Features:**
- **Scripting & Automation:** Programmatically test code, fetch assets, or generate documentation
- **CI/CD Integration:** Incorporate platform capabilities into automated build pipelines
- **Batch Processing:** Process multiple assets or code blocks in a single operation

**Benefits:**
- Automate repetitive tasks in development workflows
- Ensure consistent code quality and asset management
- Track AI-generated code and assets through the build process

### 📚 Interactive API Explorer

**Purpose:** Provide comprehensive, interactive documentation of all available APIs.

**Features:**
- **Swagger/OpenAPI Integration:** Test endpoints directly from the browser
- **Self-Documenting API:** Clear request/response schemas and examples
- **GraphQL Playground:** Interactive query builder for GraphQL endpoints

**Benefits:**
- Faster onboarding for new developers
- Easy exploration of available endpoints and capabilities
- Test and validate API calls before implementation

### 📦 Distribution & Access

The platform reaches developers through multiple channels:

- **VS Code Extension:** Available via Visual Studio Marketplace with configurable backend connections
- **API Documentation & SDKs:** Published TypeScript SDKs on npm for easy integration
- **Workshops & Tutorials:** Interactive learning resources to demonstrate platform capabilities
- **GitHub Repository:** Open source access to example integrations and extension code

## Security Considerations

- All file operations are logged with user attribution
- Comprehensive audit trails for compliance requirements
- Safe handling of file uploads with proper validation
- Typed interfaces throughout the application to prevent injection attacks

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
