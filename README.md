<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">Craft AI Platform - Built with NestJS</p>

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
</p>

## Description

Craft AI is a comprehensive platform for building, testing, and deploying AI-assisted applications. This repository contains the NestJS backend that powers the platform.

## Key Features

- **Reactive Programming Model**: Fully embraces Observable patterns for all asynchronous operations
- **AI Integration**: Built-in support for Ollama AI models with a GraphQL interface
- **Comprehensive Monitoring**: Real-time monitoring of system metrics, memory usage, and database status
- **Advanced Logging**: Structured logging system with real-time streaming and filtering
- **File Storage**: Secure file upload and retrieval system using GridFS
- **Simulation Tools**: Generate realistic user activity to test system performance
- **GraphQL API**: Flexible API layer with Apollo Server integration

## Monitoring Dashboards

- **Memory Monitor**: Track memory consumption of various system components
- **Database Monitor**: Monitor MongoDB and GraphQL database metrics
- **Logs Viewer**: Real-time streaming log viewer with filtering and search
- **API Documentation**: Swagger UI for REST API exploration

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Architecture

The Craft AI platform follows a modular architecture built on NestJS:

- **Core Modules**:
  - `AppModule`: Main application module that ties everything together
  - `LoggerModule`: Comprehensive logging system with real-time streaming
  - `DatabaseModule`: MongoDB integration with reactive interfaces

- **Feature Modules**:
  - `GraphicsModule`: File upload and retrieval services
  - `MemoryModule`: Memory monitoring and management
  - `AiModule`: Integration with LLM models via Ollama
  - `SimulationModule`: Tools for generating realistic user activity

- **Shared Components**:
  - `TemplateService`: Reactive template rendering with caching
  - Navigation system with consistent UI across all views

## Reactive Programming Patterns

This project fully embraces reactive programming using RxJS Observables throughout the codebase:

- Observable-based HTTP responses for streaming data
- Real-time event streaming for logs and metrics
- Reactive database queries
- Observable-based file uploads and downloads
- Server-sent events (SSE) for push notifications

## Documentation

- API documentation is available at `/api` when the server is running
- GraphQL playground is available at `/graphql`
- Each monitoring dashboard includes its own usage documentation

## Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Security

Please review our [Security Policy](SECURITY.md) for information about reporting vulnerabilities and our security practices.

## License

The Craft AI Platform is [MIT licensed](LICENSE).
