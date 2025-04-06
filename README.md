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

### Advanced Logging System
- **Real-time Log Streaming**: View logs as they happen with SSE (Server-Sent Events)
- **Color-coded Log Levels**: Visual distinction between DEBUG, INFO, LOG, WARN, and ERROR
- **Context-based Styling**: Special styling for performance, security, network, and user logs
- **Advanced Filtering**: Filter by log level, context, and text search patterns
- **Time Range Selection**: View logs from last 5 minutes to all time
- **Audit Trail**: Track important system events in a separate audit log
- **User Activity Tracking**: Monitor recent user actions and file operations

### File Storage System
- **Secure File Upload**: Upload images and other files with proper validation
- **GridFS Integration**: Store and retrieve files using MongoDB's GridFS
- **Compliance Tracking**: Detailed audit logs for all file operations
- **User Association**: Files linked to users who uploaded them
- **Preview Capability**: View uploaded images directly in the browser
- **Comprehensive Error Handling**: Robust error capture and reporting

### Metrics Collection (In Development)
- **Real-time Performance Data**: CPU, memory, and request metrics
- **WebSocket Integration**: Live updates without page refreshes
- **Dynamic Visualization**: Interactive charts with Chart.js
- **Threshold Alerting**: Notifications when metrics exceed defined thresholds
- **Historical Analysis**: View trends over custom time ranges

## 🌈 Color Coding System

The application uses a consistent color scheme to help quickly identify different types of information:

### Log Levels
- **DEBUG** (Blue #2196f3): Detailed information for troubleshooting
- **INFO** (Green #4caf50): General operational information
- **LOG** (Gray #9e9e9e): Standard operational logs
- **WARN** (Amber #ffc107): Potential issues that should be reviewed
- **ERROR** (Red #f44336): Critical problems requiring immediate attention

### Specialized Contexts
- **Performance** (Purple #9c27b0): System metrics and performance data
- **Security** (Indigo #3f51b5): Authentication and security events
- **Network** (Cyan #00bcd4): Connection and API request logs
- **System** (Brown #795548): Core system operations
- **User** (Orange #ff9800): User-related activities

### UI Elements
- **Primary Actions** (Indigo #3f51b5): Main application functions
- **Secondary Actions** (Blue Gray #607d8b): Support functions
- **Danger Actions** (Red #f44336): Destructive operations
- **File Operations** (Orange #ff9800): File uploads and management
- **Refreshing** (Cyan #00bcd4): Data refresh operations

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
   - Log Level Test: http://localhost:3000/logs/level-test
   - Graphics Upload: http://localhost:3000/graphics/upload
   - Metrics Viewer: http://localhost:3000/metrics/viewer.html
   - GraphQL Playground: http://localhost:3000/graphql

## 📖 Additional Documentation

- [Developer Guide](docs/DEVELOPERS.md)
- [Metrics System](docs/METRICS.md) 
- [API Documentation](docs/API.md)
- [Security Policy](SECURITY.md)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
