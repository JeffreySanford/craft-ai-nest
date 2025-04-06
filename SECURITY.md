# Security Policy

## Supported Versions

Currently, the Craft AI NestJS backend is in development and has not yet reached a stable release.
Security updates will be applied to the main development branch.

| Version | Supported          |
| ------- | ------------------ |
| dev     | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability within Craft AI, please follow these steps:

1. **Do not** disclose the vulnerability publicly on GitHub issues or other public forums.
2. Send an email to [security@example.com](mailto:security@example.com) with a detailed description of the vulnerability.
3. Include steps to reproduce the vulnerability if possible.
4. We will acknowledge receipt of your vulnerability report as soon as possible and provide an estimated timeline for a fix.
5. Once a fix is prepared, we will notify you and provide credit for the discovery if desired.

## Security Features

### Logging and Audit System

The application includes a comprehensive logging and audit system that:

- Records all system activities with appropriate context
- Maintains a dedicated audit trail for security-relevant events
- Uses different log levels (DEBUG, INFO, LOG, WARN, ERROR) to categorize information
- Highlights security-related events with special styling
- Allows filtering and searching logs to help identify suspicious activities

### File Upload Security

When uploading files (such as through the Graphics system):

- File types are validated on both client and server side
- File size limits are enforced
- Uploaded content is stored securely in MongoDB GridFS
- All file operations are logged and tracked in the audit trail
- User information is associated with each upload
- Access control is implemented for file retrieval

### API Security

- GraphQL queries have depth and complexity limits to prevent abuse
- HTTP headers are appropriately set to enhance security
- Request validation is performed using NestJS pipes
- Comprehensive error handling prevents sensitive information leakage

### Data Protection

- All data is validated before processing
- MongoDB connection uses best practices for security
- Sensitive operations are logged with context information
- System metrics are collected to help identify anomalies

## Security Best Practices for Development

When contributing to this project, please follow these security best practices:

1. **Dependencies**: Keep all dependencies updated to their latest secure versions
2. **Validation**: Always validate user input on both client and server side
3. **Error Handling**: Implement proper error handling that doesn't expose sensitive information
4. **Authentication**: When implementing auth features, use established libraries and follow best practices
5. **Logging**: Log security-relevant events but be careful not to log sensitive data
6. **Code Review**: All code changes should be reviewed for security implications
7. **Testing**: Write tests that verify security controls are working correctly

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
