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

# Craft AI - NestJS Backend

![Status: In Development](https://img.shields.io/badge/Status-In%20Development-yellow)

A powerful NestJS backend powering the Craft AI system with comprehensive logging, metrics collection, and GraphQL support.

## 🚀 Project Status

We're currently in the development phase, with several key features already implemented:

### Completed ✅
- **Step 1: Core Framework Setup** - NestJS with MongoDB, GraphQL, and Express
- **Step 2: Advanced Logging System** - Real-time log viewer with filtering and streaming
- **Step 3: File Storage System** - Graphics upload and retrieval with GridFS

### In Progress 🔄
- **Step 4: Metrics Collection System** - Real-time metrics visualization (currently being implemented)
- **Step 5: AI Integration** - Ollama service integration for AI capabilities

### Planned 📝
- **Step 6: User Authentication** - User management and access control
- **Step 7: API Gateway** - Unified access point for all services
- **Step 8: Deployment Pipeline** - Automated testing and deployment

## 📋 Features

### Logging System
- **Real-time Log Streaming**: View logs as they happen with SSE (Server-Sent Events)
- **Color-coded Log Levels**: Visual distinction between DEBUG, INFO, LOG, WARN, and ERROR
- **Context-based Styling**: Special styling for performance, security, network, and user logs
- **Advanced Filtering**: Filter by log level, context, and text search patterns
- **Time Range Selection**: View logs from last 5 minutes to all time
- **Audit Trail**: Track important system events in a separate audit log
- **User Activity Tracking**: Monitor recent user actions and file operations

### Graphics System
- Secure file upload and storage using GridFS
- On-demand file retrieval with proper content-type detection
- Integration with the audit system for compliance tracking

### Metrics Collection (In Development)
- Real-time CPU, memory, and request metrics
- Historical data visualization
- Threshold alerting for critical metrics

## 🛠 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (v4.4+)
- Ollama (for AI capabilities)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/craft-ai-nest.git
   cd craft-ai-nest
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start MongoDB
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name craft-ai-mongo mongo:latest
   ```

4. Start the application
   ```bash
   npm run start:dev
   ```

5. Access the application:
   - Log Viewer: http://localhost:3000/logs/view
   - GraphQL Playground: http://localhost:3000/graphql
   - Metrics Viewer: http://localhost:3000/metrics/viewer.html (in development)

## 📊 Log Viewer Usage Guide

1. **Log Levels**
   - **DEBUG**: All logs (most verbose)
   - **INFO**: Information, warnings, and errors only
   - **LOG**: Standard logs, warnings, and errors
   - **WARN**: Only warnings and errors
   - **ERROR**: Only error logs

2. **Special Context Filters**:
   - **UI/UX Events**: User interface interactions
   - **System Events**: Core system operations
   - **Metrics Events**: Performance data logs

3. **Testing Log Generation**:
   - Use the "Trigger Info Log" button to generate sample logs
   - Use "Trigger Error Log" button to test error handling
   - The "Test Log Levels" page (http://localhost:3000/logs/level-test) can generate logs at each level

## 🔒 Security

This project includes various security features:
- Sanitized user input
- Proper error handling
- Audit logging for compliance
- GraphQL query depth limiting

## 📖 Additional Documentation

- [Developer Guide](docs/DEVELOPERS.md)
- [Metrics System](docs/METRICS.md) 
- [API Documentation](docs/API.md)
- [Security Policy](SECURITY.md)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
