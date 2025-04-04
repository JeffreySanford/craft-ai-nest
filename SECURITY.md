# Security Policy

## Reporting Security Vulnerabilities

If you believe you've found a security vulnerability in Craft AI NestJS, please report it to us privately. **Do not disclose security-related issues publicly**.

Please include the following details in your report:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any known mitigations

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
