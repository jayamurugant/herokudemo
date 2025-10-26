# AssureSign SOAP Passthrough - Troubleshooting Guide

## 500 Internal Server Error - Root Causes and Solutions

### Problem Analysis
The 500 Internal Server Error you were experiencing while building APIM for SOAP passthrough with AssureSign was likely due to one or more of the following issues:

1. **Missing Error Handling**: No proper error handling for SOAP requests
2. **Configuration Issues**: Missing or invalid AssureSign credentials
3. **Network Connectivity**: Unable to reach AssureSign API endpoints
4. **Invalid SOAP Requests**: Malformed XML or missing required headers
5. **Timeout Issues**: Requests timing out without proper handling

### Solution Implemented

We've created a robust SOAP passthrough service with comprehensive error handling that prevents 500 errors by:

#### 1. **Comprehensive Error Handling**
```javascript
// Multiple layers of error handling:
- Request validation (empty body, missing headers)
- Configuration validation (missing credentials)
- Network error handling (timeouts, connection refused)
- AssureSign API error forwarding
- Proper SOAP fault responses
```

#### 2. **Detailed Logging**
```javascript
// Winston logger with multiple levels:
- Request/response logging
- Error tracking with stack traces
- Configuration status monitoring
- Performance metrics
```

#### 3. **Proper SOAP Fault Responses**
Instead of generic 500 errors, the service now returns proper SOAP faults:
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>Server</faultcode>
      <faultstring>AssureSign service temporarily unavailable</faultstring>
      <detail>HTTP 500: Internal Server Error</detail>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>
```

## Common 500 Error Scenarios and Fixes

### 1. Missing Credentials
**Error**: `AssureSign credentials not properly configured`
**Solution**: Set environment variables:
```bash
export ASSURESIGN_USERNAME=your_username
export ASSURESIGN_PASSWORD=your_password
```

### 2. Network Connectivity Issues
**Error**: `AssureSign service unavailable`
**Causes**:
- Firewall blocking outbound connections
- DNS resolution issues
- AssureSign API endpoint down

**Solutions**:
```bash
# Test connectivity
curl -I https://api.assuresign.net/v3.6/DocumentService.svc

# Check DNS resolution
nslookup api.assuresign.net

# Test with different endpoint
export ASSURESIGN_BASE_URL=https://sandbox.assuresign.net
```

### 3. Timeout Issues
**Error**: `Request timeout`
**Solution**: Increase timeout value:
```bash
export REQUEST_TIMEOUT=60000  # 60 seconds
```

### 4. Invalid SOAP Requests
**Error**: `Bad Request - SOAP request body is required`
**Solution**: Ensure proper SOAP envelope structure:
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header/>
  <soap:Body>
    <!-- Your SOAP operation here -->
  </soap:Body>
</soap:Envelope>
```

### 5. SSL/TLS Issues
**Error**: `certificate verify failed`
**Solution**: Configure SSL properly:
```javascript
// In production, use proper certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Only for testing!
```

## Debugging Steps

### 1. Check Service Health
```bash
curl http://localhost:3000/health
```

### 2. Review Logs
```bash
tail -f error.log
tail -f combined.log
```

### 3. Test with Sample Request
```bash
curl -X POST http://localhost:3000/soap/assuresign \
  -H "Content-Type: text/xml; charset=utf-8" \
  -H "SOAPAction: \"http://tempuri.org/IDocumentService/GetDocumentStatus\"" \
  -d @sample-request.xml
```

### 4. Validate Configuration
```bash
# Check environment variables
env | grep ASSURESIGN

# Test AssureSign connectivity
curl -u $ASSURESIGN_USERNAME:$ASSURESIGN_PASSWORD \
  https://api.assuresign.net/v3.6/DocumentService.svc
```

## Performance Optimization

### 1. Connection Pooling
```javascript
// Configure axios with connection pooling
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10
});
```

### 2. Request Caching
```javascript
// Cache frequently used data
const cache = new Map();
```

### 3. Rate Limiting
```javascript
// Implement rate limiting to prevent overload
const rateLimit = require('express-rate-limit');
```

## Monitoring and Alerting

### 1. Health Checks
- Implement automated health checks
- Monitor response times
- Track error rates

### 2. Metrics Collection
```javascript
// Track key metrics
- Request count
- Response times
- Error rates
- AssureSign API status
```

### 3. Alerting Rules
- 500 error rate > 5%
- Response time > 5 seconds
- AssureSign API unavailable

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring setup
- [ ] Log rotation configured
- [ ] Backup and recovery plan
- [ ] Load balancing configured
- [ ] Health checks enabled

## Emergency Procedures

### Service Down
1. Check health endpoint
2. Review error logs
3. Verify AssureSign API status
4. Restart service if needed
5. Escalate if issue persists

### High Error Rate
1. Check recent deployments
2. Review configuration changes
3. Monitor AssureSign API status
4. Scale resources if needed
5. Implement circuit breaker if necessary

## Support Contacts

- **AssureSign Support**: [AssureSign Support Portal]
- **Internal DevOps**: [Your DevOps Team]
- **Monitoring**: [Your Monitoring Dashboard]