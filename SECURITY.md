# Security Policy

## Supported Versions

We currently support the following versions of Craft AI NestJS platform with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please follow these steps:

1. **Do not** disclose the vulnerability publicly
2. Email us at security@craft-ai.com with details of the vulnerability
3. Allow time for us to assess and address the vulnerability
4. We will coordinate with you on the disclosure timeline

We take all security reports seriously and will respond as quickly as possible.

## Security Features

### Logging and Audit System

The platform includes a comprehensive logging and audit system:

- Event logging with multiple severity levels (DEBUG, INFO, WARN, ERROR, AUDIT)
- Structured log entries with context, timestamp, and metadata
- Real-time log streaming via Server-Sent Events (SSE)
- Dedicated audit log entries for security-relevant operations
- Searchable log interface with filtering capabilities
- Observable-based reactive log processing pipeline

### File Upload Security

The graphics upload system implements several security measures:

- File type validation and restriction
- Stream-based file processing with GridFS
- Audit logging of all upload operations with user context
- Proper error handling with security context preservation
- Resource cleanup via subscription management
- Type-safe implementation with thorough validation

### API Security

Our API implementation includes:

- Comprehensive input validation
- Proper error handling that avoids information disclosure
- Content-Type enforcement
- Safe error messages that don't leak implementation details
- Audit logging of sensitive operations
- Rate limiting capabilities (configurable)

### Data Protection

Data protection measures include:

- In-memory database with proper isolation
- GridFS for secure binary data storage
- Type-safe data handling throughout the application
- Reactive programming model with proper error boundaries
- Controlled data serialization and deserialization

## Security Best Practices for Development

When contributing to this project, please follow these security best practices:

1. **Dependencies**: Keep all dependencies updated to their latest secure versions
2. **Validation**: Always validate user input on both client and server side
3. **Error Handling**: Implement proper error handling that doesn't expose sensitive information
4. **Authentication**: When implementing auth features, use established libraries and follow best practices
5. **Logging**: Log security-relevant events but be careful not to log sensitive data
6. **Code Review**: All code changes should be reviewed for security implications
7. **Testing**: Write tests that verify security controls are working correctly
8. **Reactive Programming**: Use the Observable pattern consistently to handle asynchronous operations safely

## Security Roadmap

The following security features are planned for future implementation:

- [ ] User authentication and authorization system
- [ ] Role-based access control
- [ ] Rate limiting for API endpoints
- [ ] Enhanced input validation
- [ ] CSRF protection
- [ ] Content Security Policy implementation
- [ ] Security headers configuration
- [ ] Automated security testing
- [x] Reactive programming model for all asynchronous operations
- [x] Comprehensive audit logging

## Security Considerations for AI Services

### Prompt Injection Protection

The Ollama service implements several security measures to prevent prompt injection attacks:
- Input sanitization to remove potentially harmful characters
- Maximum prompt length limits
- Whitelisting of allowed models
- Secure URL handling

### Authentication and Authorization

- All AI API endpoints should be properly authenticated in production environments
- Consider implementing rate limiting for AI requests to prevent abuse
- Maintain audit logs of all AI prompt submissions and responses

### Data Privacy

- All AI processing is performed locally using Ollama to ensure data privacy
- No data is sent to external services
- Consider implementing data retention policies for logs containing AI prompts and responses

## Dependency Security

### Known Vulnerabilities

The application includes resolutions for known vulnerabilities in:
- semver
- tough-cookie
- word-wrap

### Regular Audits

Run these commands regularly to check for and fix vulnerabilities:
```bash
# Check for vulnerabilities
npm run security:check

# Fix vulnerabilities that can be automatically fixed
npm run security:fix

# Run the comprehensive security fix script
./scripts/fix-security.sh
```

## Environment Configuration Security

- Store sensitive information in environment variables, not in code
- In the `ollama.service.ts` file, we implement URL sanitization and validation
- Only localhost URLs are allowed in development mode
- Credentials in URLs are masked in logs

## Secure Coding Practices

- Input validation is implemented on all endpoints
- Error messages are sanitized to prevent information leakage
- Timeout limits are set on external service calls
- Retry mechanisms include exponential backoff to prevent DoS
- Reactive programming with Observables is used consistently for asynchronous operations
