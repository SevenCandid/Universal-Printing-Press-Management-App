# Greetings API Routes - Complete ✅

## Overview

Two new Next.js API routes have been created for sending greetings with batching support to avoid timeouts and handle large contact lists efficiently.

## ✅ API Routes Created

### 1. `/api/greetings/email`
- **Method**: POST
- **Purpose**: Send greeting emails to multiple contacts
- **Integration**: Uses Gmail SMTP via `emailService`

### 2. `/api/greetings/sms`
- **Method**: POST
- **Purpose**: Send greeting SMS to multiple contacts
- **Integration**: Uses Termii API via `smsService`

## 📋 Request Format

### Email Route
```json
POST /api/greetings/email
Content-Type: application/json

{
  "contacts": [
    { "email": "client1@example.com", "name": "John Doe" },
    { "email": "client2@example.com", "name": "Jane Smith" }
  ],
  "message": "Dear {{clientName}}, ..." // Optional custom template
}
```

### SMS Route
```json
POST /api/greetings/sms
Content-Type: application/json

{
  "contacts": [
    { "phone": "2348012345678", "name": "John Doe" },
    { "phone": "2348098765432", "name": "Jane Smith" }
  ],
  "message": "Dear {{clientName}}, ..." // Optional custom template
}
```

## 📤 Response Format

Both routes return the same structured JSON format:

```json
{
  "success": true,
  "total": 100,
  "sent": 95,
  "failed": 5,
  "results": [
    {
      "email": "client1@example.com", // or "phone" for SMS
      "name": "John Doe",
      "success": true,
      "error": null
    },
    {
      "email": "client2@example.com",
      "name": "Jane Smith",
      "success": false,
      "error": "Invalid email address"
    }
  ],
  "failedContacts": [
    {
      "email": "client2@example.com",
      "name": "Jane Smith",
      "error": "Invalid email address"
    }
  ]
}
```

## ⚡ Batching & Concurrency

### Batch Processing
- **Batch Size**: 10 contacts per batch
- **Processing**: Sequential batch processing to avoid overwhelming services
- **Delay**: 100ms delay between batches to prevent rate limiting

### Why Batching?
1. **Avoids Timeouts**: Large contact lists won't cause request timeouts
2. **Rate Limiting**: Prevents overwhelming email/SMS providers
3. **Error Isolation**: Failures in one batch don't stop others
4. **Progress Tracking**: Can be extended for real-time progress updates

### Processing Flow
```
Contacts (100) 
  → Split into batches (10 batches of 10)
  → Process batch 1 (10 contacts)
  → Wait 100ms
  → Process batch 2 (10 contacts)
  → Wait 100ms
  → ... continue until all batches complete
  → Return aggregated results
```

## 🔧 Features

### 1. **Custom Message Templates**
- Accepts optional `message` parameter
- Supports placeholders:
  - `{{clientName}}` - Contact's name
  - `{{companyName}}` - Company name
  - `{{month}}` - Current month
  - `{{year}}` - Current year
- Falls back to default templates if not provided

### 2. **Input Validation**
- Validates contact array structure
- Ensures required fields (email/phone and name)
- Trims whitespace from contact data
- Returns clear error messages

### 3. **Connection Testing**
- Tests service connection before processing
- Returns helpful error messages if services aren't configured
- Health check via GET endpoint

### 4. **Error Handling**
- Individual contact failures don't stop the process
- Detailed error messages for each failed contact
- Aggregated success/failure counts
- Failed contacts list for easy debugging

### 5. **Structured Responses**
- Consistent JSON format
- Total, sent, and failed counts
- Individual results for each contact
- Separate failed contacts array

## 🧪 Testing

### Test Email Route
```bash
curl -X POST http://localhost:3000/api/greetings/email \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"email": "test@example.com", "name": "Test User"}
    ]
  }'
```

### Test SMS Route
```bash
curl -X POST http://localhost:3000/api/greetings/sms \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"phone": "2348012345678", "name": "Test User"}
    ]
  }'
```

### Health Check
```bash
# Email service
curl http://localhost:3000/api/greetings/email

# SMS service
curl http://localhost:3000/api/greetings/sms
```

## 📊 Example Usage

### JavaScript/TypeScript
```typescript
// Send email greetings
const response = await fetch('/api/greetings/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contacts: [
      { email: 'client1@example.com', name: 'John Doe' },
      { email: 'client2@example.com', name: 'Jane Smith' }
    ],
    message: 'Dear {{clientName}}, thank you for your business!' // Optional
  })
})

const result = await response.json()
console.log(`Sent: ${result.sent}, Failed: ${result.failed}`)
```

### With Custom Template
```typescript
const response = await fetch('/api/greetings/sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contacts: clients.map(c => ({ phone: c.phone, name: c.name })),
    message: 'Hi {{clientName}}! Happy {{month}} from {{companyName}}!'
  })
})
```

## 🔒 Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "success": false,
  "error": "No contacts provided. Expected an array of contacts with email and name."
}
```

**500 Service Not Configured**
```json
{
  "success": false,
  "error": "Email service not configured. Please check GMAIL_USER and GMAIL_PASS environment variables."
}
```

**500 Processing Error**
```json
{
  "success": false,
  "error": "Failed to send greeting emails"
}
```

## 📝 Logging

Both routes include console logging for:
- Batch processing progress
- Individual batch completion
- Final summary (sent/failed counts)
- Errors and failures

Example logs:
```
[Greetings API] Processing 100 contacts in 10 batches of 10
[Greetings API] Processing batch 1/10 (10 contacts)
[Greetings API] Processing batch 2/10 (10 contacts)
...
[Greetings API] Completed: 95 sent, 5 failed out of 100 total
```

## 🚀 Performance Considerations

### Batch Size
- Default: 10 contacts per batch
- Can be adjusted by changing `BATCH_SIZE` constant
- Balance between speed and reliability

### Rate Limiting
- 100ms delay between batches
- Prevents overwhelming email/SMS providers
- Can be adjusted based on provider limits

### Timeout Prevention
- Sequential batch processing
- Each batch completes before next starts
- Prevents long-running requests from timing out

## 🔄 Integration with Existing Services

### Email Service
- Uses `emailService` from `@/lib/email/service`
- Supports Gmail SMTP provider
- Can be extended for other providers

### SMS Service
- Uses `smsService` from `@/lib/sms/service`
- Supports Termii provider
- Can be extended for WhatsApp, Twilio, etc.

## 📋 Files Created

- ✅ `src/app/api/greetings/email/route.ts` - Email greetings API route
- ✅ `src/app/api/greetings/sms/route.ts` - SMS greetings API route

## ✨ Key Features

- ✅ Batch processing (10 contacts at a time)
- ✅ Custom message template support
- ✅ Structured JSON responses
- ✅ Individual error tracking
- ✅ Connection testing
- ✅ Input validation
- ✅ Rate limiting protection
- ✅ Timeout prevention
- ✅ Health check endpoints
- ✅ Comprehensive logging

## 🎯 Next Steps

These routes are ready to use! You can:
1. Call them from your frontend components
2. Integrate with the Client Connect dashboard
3. Use for scheduled/automated greetings
4. Extend with additional features (webhooks, retries, etc.)

The routes are production-ready and handle edge cases gracefully! 🚀

