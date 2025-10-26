# AssureSign SOAP Passthrough Service

A robust APIM (API Management) service that provides SOAP passthrough functionality for AssureSign integration with comprehensive error handling to prevent 500 Internal Server Errors.

## Features

- **SOAP Passthrough**: Forward SOAP requests to AssureSign API with proper authentication
- **Comprehensive Error Handling**: Prevents 500 errors with detailed logging and proper SOAP fault responses
- **Security**: Built-in security headers, CORS support, and input validation
- **Monitoring**: Health check endpoint and detailed logging with Winston
- **Testing Interface**: Built-in web interface for testing SOAP requests

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your AssureSign credentials
   ```

3. **Start the Service**
   ```bash
   npm start
   ```

4. **Test the Service**
   - Health Check: `GET http://localhost:3000/health`
   - SOAP Endpoint: `POST http://localhost:3000/soap/assuresign`
   - Test Interface: `http://localhost:3000/soap-test.html`

## Configuration

Set the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ASSURESIGN_BASE_URL` | AssureSign API base URL | `https://api.assuresign.net` |
| `ASSURESIGN_SOAP_ENDPOINT` | SOAP service endpoint | `/v3.6/DocumentService.svc` |
| `ASSURESIGN_USERNAME` | AssureSign username | Required |
| `ASSURESIGN_PASSWORD` | AssureSign password | Required |
| `ASSURESIGN_API_KEY` | AssureSign API key (optional) | - |
| `PORT` | Server port | `3000` |
| `REQUEST_TIMEOUT` | Request timeout in ms | `30000` |

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status and configuration.

### SOAP Passthrough
```
POST /soap/assuresign
Content-Type: text/xml; charset=utf-8
SOAPAction: "your-soap-action"

<soap:Envelope>
  <!-- Your SOAP request -->
</soap:Envelope>
```

## Error Handling

The service handles various error scenarios:

- **Configuration Errors**: Missing credentials return 500 with clear error message
- **Network Errors**: Connection issues return proper SOAP faults
- **Timeout Errors**: Request timeouts return appropriate error responses
- **AssureSign Errors**: Forwards AssureSign errors with proper status codes
- **Invalid Requests**: Validates request body and returns 400 for missing data

## Common Issues and Solutions

### 500 Internal Server Error

1. **Missing Credentials**
   - Ensure `ASSURESIGN_USERNAME` and `ASSURESIGN_PASSWORD` are set
   - Check credentials are valid

2. **Network Connectivity**
   - Verify `ASSURESIGN_BASE_URL` is accessible
   - Check firewall/proxy settings

3. **Invalid SOAP Request**
   - Validate SOAP XML structure
   - Check SOAPAction header matches the operation

4. **Timeout Issues**
   - Increase `REQUEST_TIMEOUT` value
   - Check AssureSign service availability

### Debugging

1. **Check Logs**
   ```bash
   tail -f error.log
   tail -f combined.log
   ```

2. **Use Test Interface**
   - Navigate to `http://localhost:3000/soap-test.html`
   - Test with sample SOAP requests

3. **Health Check**
   ```bash
   curl http://localhost:3000/health
   ```

## Sample SOAP Request

```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:GetDocumentStatus>
      <tem:request>
        <tem:DocumentID>your-document-id</tem:DocumentID>
      </tem:request>
    </tem:GetDocumentStatus>
  </soap:Body>
</soap:Envelope>
```

## Deployment

### Heroku
```bash
git add .
git commit -m "Add AssureSign SOAP passthrough service"
git push heroku main
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring

- Logs are written to `error.log` and `combined.log`
- Health endpoint provides service status
- All requests are logged with timestamps and metadata

## Security

- Helmet.js for security headers
- CORS enabled for cross-origin requests
- Input validation and sanitization
- Secure credential handling via environment variables