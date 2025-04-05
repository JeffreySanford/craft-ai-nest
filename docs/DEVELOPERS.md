# Developer Guide

This guide provides information for developers working on the Craft AI NestJS project.

## Development Environment Setup

### Prerequisites

- Node.js v16 or higher
- npm v7 or higher
- MongoDB v4.4 or higher
- Git

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/craft-ai-nest.git
   cd craft-ai-nest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start MongoDB:
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name craft-ai-mongo mongo:latest
   ```

### Running the Application

#### Development Mode
```bash
npm run start:dev
```

#### Production Mode
```bash
npm run build
npm run start:prod
```

### Testing

#### Unit Tests
```bash
npm run test
```

#### E2E Tests
```bash
npm run test:e2e
```

#### Test Coverage
```bash
npm run test:cov
```

## Project Structure

The project follows standard NestJS architecture with additional organization:

