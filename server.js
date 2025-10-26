const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'assuresign-soap-passthrough' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// AssureSign SOAP endpoint configuration
const ASSURESIGN_CONFIG = {
  baseUrl: process.env.ASSURESIGN_BASE_URL || 'https://api.assuresign.net',
  soapEndpoint: process.env.ASSURESIGN_SOAP_ENDPOINT || '/v3.6/DocumentService.svc',
  timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
  username: process.env.ASSURESIGN_USERNAME,
  password: process.env.ASSURESIGN_PASSWORD,
  apiKey: process.env.ASSURESIGN_API_KEY
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.text({ type: 'text/xml', limit: '10mb' }));
app.use(express.text({ type: 'application/soap+xml', limit: '10mb' }));
app.use(express.raw({ type: 'application/xml', limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'assuresign-soap-passthrough'
  });
});

// SOAP passthrough endpoint
app.post('/soap/assuresign', async (req, res) => {
  try {
    logger.info('SOAP request received', {
      contentLength: req.get('Content-Length'),
      soapAction: req.get('SOAPAction')
    });

    // Validate request body
    if (!req.body) {
      logger.error('Empty SOAP request body');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'SOAP request body is required'
      });
    }

    // Validate AssureSign configuration
    if (!ASSURESIGN_CONFIG.username || !ASSURESIGN_CONFIG.password) {
      logger.error('AssureSign credentials not configured');
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'AssureSign credentials not properly configured'
      });
    }

    // Prepare headers for AssureSign SOAP request
    const headers = {
      'Content-Type': req.get('Content-Type') || 'text/xml; charset=utf-8',
      'SOAPAction': req.get('SOAPAction') || '""',
      'User-Agent': 'AssureSign-SOAP-Passthrough/1.0'
    };

    // Add authentication if provided
    if (ASSURESIGN_CONFIG.apiKey) {
      headers['X-API-Key'] = ASSURESIGN_CONFIG.apiKey;
    }

    const targetUrl = `${ASSURESIGN_CONFIG.baseUrl}${ASSURESIGN_CONFIG.soapEndpoint}`;
    
    logger.info('Forwarding SOAP request to AssureSign', {
      targetUrl,
      headers: Object.keys(headers)
    });

    // Forward SOAP request to AssureSign
    const response = await axios({
      method: 'POST',
      url: targetUrl,
      data: req.body,
      headers,
      timeout: ASSURESIGN_CONFIG.timeout,
      validateStatus: () => true, // Don't throw on HTTP error status
      auth: {
        username: ASSURESIGN_CONFIG.username,
        password: ASSURESIGN_CONFIG.password
      }
    });

    logger.info('AssureSign response received', {
      status: response.status,
      contentType: response.headers['content-type']
    });

    // Forward response headers
    const responseHeaders = {
      'Content-Type': response.headers['content-type'] || 'text/xml'
    };

    // Handle different response scenarios
    if (response.status >= 200 && response.status < 300) {
      // Success response
      res.status(response.status).set(responseHeaders).send(response.data);
    } else if (response.status >= 400 && response.status < 500) {
      // Client error - forward as is
      logger.warn('Client error from AssureSign', {
        status: response.status,
        data: response.data
      });
      res.status(response.status).set(responseHeaders).send(response.data);
    } else {
      // Server error from AssureSign
      logger.error('Server error from AssureSign', {
        status: response.status,
        data: response.data
      });
      
      // Return a proper SOAP fault
      const soapFault = createSoapFault(
        'Server',
        'AssureSign service temporarily unavailable',
        `HTTP ${response.status}: ${response.statusText}`
      );
      
      res.status(500)
         .set('Content-Type', 'text/xml; charset=utf-8')
         .send(soapFault);
    }

  } catch (error) {
    logger.error('SOAP passthrough error', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null
    });

    // Handle different types of errors
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    let faultCode = 'Server';

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'AssureSign service unavailable';
      faultCode = 'Server';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timeout';
      faultCode = 'Server';
    } else if (error.response) {
      statusCode = error.response.status;
      errorMessage = `AssureSign error: ${error.response.statusText}`;
      faultCode = statusCode >= 400 && statusCode < 500 ? 'Client' : 'Server';
    }

    const soapFault = createSoapFault(faultCode, errorMessage, error.message);
    
    res.status(statusCode)
       .set('Content-Type', 'text/xml; charset=utf-8')
       .send(soapFault);
  }
});

// Function to create SOAP fault response
function createSoapFault(faultCode, faultString, detail) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>${faultCode}</faultcode>
      <faultstring>${faultString}</faultstring>
      <detail>${detail}</detail>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
}

// Static file serving for documentation/testing
app.use(express.static('public'));

// 404 handler
app.use((req, res) => {
  logger.warn('404 Not Found', { path: req.path, method: req.method });
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(port, () => {
  logger.info(`AssureSign SOAP Passthrough server running on port ${port}`, {
    environment: process.env.NODE_ENV || 'development',
    assuresignBaseUrl: ASSURESIGN_CONFIG.baseUrl,
    hasCredentials: !!(ASSURESIGN_CONFIG.username && ASSURESIGN_CONFIG.password)
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

