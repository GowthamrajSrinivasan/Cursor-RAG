# Bug Fixes Documentation

**Project:** AI Agent Chat Interface with RAG System
**Date:** November 9, 2025
**Fixed By:** Claude Code Assistant

---

## Table of Contents
1. [Issue #1: CORS Policy Error](#issue-1-cors-policy-error)
2. [Issue #2: DOMTokenList Empty Token Error](#issue-2-domtokenlist-empty-token-error)
3. [Issue #3: Missing API Endpoint](#issue-3-missing-api-endpoint)
4. [Issue #4: 500 Internal Server Error - GenAI API](#issue-4-500-internal-server-error---genai-api)
5. [Issue #5: Substring Error in Response Generation](#issue-5-substring-error-in-response-generation)
6. [Testing Instructions](#testing-instructions)
7. [Summary](#summary)

---

## Issue #1: CORS Policy Error

### Error Message
```
Access to fetch at 'file:///api/agent-stats' from origin 'null' has been blocked by CORS policy:
Cross origin requests are only supported for protocol schemes: chrome, chrome-extension,
chrome-untrusted, data, http, https, isolated-app.

Failed to load resource: net::ERR_FAILED
```

### Root Cause
The HTML file (`index.html`) was being opened directly in the browser using the `file://` protocol instead of being served through the Express server. When JavaScript tried to make fetch requests to `/api/agent-stats`, the browser attempted to access `file:///api/agent-stats`, which is blocked by CORS policy.

### Impact
- Statistics panel could not load
- Query logs could not be fetched
- Application appeared broken despite server running

### Solution
**File Modified:** `server.js` (Line 284)

Added static file serving middleware to Express:

```javascript
// Serve static files (HTML, CSS, JS)
app.use(express.static(process.cwd()));
```

### Usage Change
- **Before:** Opening `index.html` directly in browser (`file:///path/to/index.html`)
- **After:** Accessing via server (`http://localhost:3000/index.html`)

---

## Issue #2: DOMTokenList Empty Token Error

### Error Message
```javascript
Uncaught (in promise) SyntaxError: Failed to execute 'add' on 'DOMTokenList':
The token provided must not be empty.
    at addMessage (index.html:148:34)
```

### Root Cause
The `addMessage()` function attempted to add an empty string to the `classList` when `isError` was `false`:

```javascript
// Problematic code
contentDiv.classList.add(
    'p-3',
    'rounded-lg',
    'max-w-xs',
    'md:max-w-md',
    'shadow',
    sender === 'user' ? 'bg-indigo-500' : 'bg-blue-100',
    sender === 'user' ? 'text-white' : 'text-blue-800',
    isError ? 'bg-red-100' : ''  // ← Empty string causes error
);
```

### Impact
- Chat messages failed to render
- Application crashed when sending messages
- Console filled with errors

### Solution
**File Modified:** `index.html` (Lines 143-165)

Refactored the `addMessage()` function to use conditional logic:

```javascript
function addMessage(sender, text, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('flex', sender === 'user' ? 'justify-end' : 'justify-start');

    const contentDiv = document.createElement('div');
    const baseClasses = ['p-3', 'rounded-lg', 'max-w-xs', 'md:max-w-md', 'shadow'];

    if (isError) {
        contentDiv.classList.add(...baseClasses, 'bg-red-100', 'text-red-800');
    } else {
        contentDiv.classList.add(
            ...baseClasses,
            sender === 'user' ? 'bg-indigo-500' : 'bg-blue-100',
            sender === 'user' ? 'text-white' : 'text-blue-800'
        );
    }

    contentDiv.innerText = text;
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    scrollToBottom(chatMessages);
}
```

---

## Issue #3: Missing API Endpoint

### Error Message
```
Failed to load resource: the server responded with a status of 404 (Not Found)
/api/agent-stats:1
```

### Root Cause
The frontend was making GET requests to `/api/agent-stats` to fetch statistics and query logs, but this endpoint did not exist on the backend server.

### Impact
- Statistics panel showed "0" for all values
- Query logs could not be displayed
- Repeated 404 errors every 10 seconds (polling interval)

### Solution
**File Modified:** `server.js` (Lines 455-527)

Added new GET endpoint that:
1. Reads query count from `logs/query-count.txt`
2. Parses query logs from `logs/query-log.txt`
3. Returns structured JSON response

```javascript
// API Endpoint for Agent Stats
app.get('/api/agent-stats', async (req, res) => {
    try {
        const logsDir = path.join(process.cwd(), 'logs');
        const countFilePath = path.join(logsDir, 'query-count.txt');
        const logFilePath = path.join(logsDir, 'query-log.txt');

        let totalQueries = 0;
        let lastQueryTime = null;
        let queryLogs = [];

        // Read query count
        try {
            const countData = await fs.readFile(countFilePath, 'utf8');
            totalQueries = parseInt(countData, 10);
            if (isNaN(totalQueries)) {
                totalQueries = 0;
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error reading query count:', error);
            }
        }

        // Read and parse query logs
        try {
            const logData = await fs.readFile(logFilePath, 'utf8');
            const logEntries = logData.split('-'.repeat(80)).filter(entry => entry.trim());

            queryLogs = logEntries.map(entry => {
                const timestampMatch = entry.match(/\[(.*?)\]/);
                const queryMatch = entry.match(/Query: "(.*?)"/);
                const answerMatch = entry.match(/Answer: "(.*?)"/s);
                const chunksMatch = entry.match(/Chunks Retrieved: (\d+)/);
                const durationMatch = entry.match(/Duration: (\d+)ms/);

                if (timestampMatch && queryMatch) {
                    const timestamp = timestampMatch[1];
                    if (!lastQueryTime || new Date(timestamp) > new Date(lastQueryTime)) {
                        lastQueryTime = timestamp;
                    }

                    return {
                        timestamp: timestamp,
                        query: queryMatch[1],
                        answer: answerMatch ? answerMatch[1] : 'N/A',
                        chunksRetrieved: chunksMatch ? parseInt(chunksMatch[1], 10) : 0,
                        duration: durationMatch ? parseInt(durationMatch[1], 10) : 0
                    };
                }
                return null;
            }).filter(log => log !== null).reverse(); // Most recent first
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error reading query logs:', error);
            }
        }

        res.status(200).json({
            success: true,
            totalQueries: totalQueries,
            lastQueryTime: lastQueryTime,
            queryLogs: queryLogs
        });

    } catch (error) {
        console.error('❌ Error fetching agent stats:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agent statistics.',
            details: NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
```

---

## Issue #4: 500 Internal Server Error - GenAI API

### Error Message
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
api/answer-question:1

TypeError: this.genAI.getGenerativeModel is not a function
    at TaskAgent.analyzeIntent (agent.js:51:38)
```

### Root Cause
The `agent.js` file was using an incorrect API method for Google GenAI. The code tried to call `this.genAI.getGenerativeModel()`, which doesn't exist in the Google GenAI SDK being used. The correct approach is to use `this.genAI.models.generateContent()`.

### Impact
- All user queries returned 500 errors
- Agent could not analyze user intent
- Chat interface was completely non-functional

### Solution
**File Modified:** `agent.js` (Lines 48-67)

**Before:**
```javascript
const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
const result = await model.generateContent(prompt);
const responseText = result.response.text().trim();
```

**After:**
```javascript
// Use the correct API for GoogleGenAI
const result = await this.genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
});
const responseText = result.text.trim();
```

### Key Changes
1. Removed incorrect `getGenerativeModel()` call
2. Changed to `models.generateContent()` with proper parameters
3. Updated response parsing from `result.response.text()` to `result.text`
4. Updated model from "gemini-pro" to "gemini-2.5-flash" for consistency

---

## Issue #5: Substring Error in Response Generation

### Error Message
```
TypeError: Cannot read properties of undefined (reading 'substring')
    at TaskAgent.generateResponse (agent.js:159:78)
```

### Log Output
```
Time: 11/9/2025, 1:20:47 PM
Query: AI
Answer: Error: Cannot read properties of undefined (reading 'substring')
Duration: 6217ms
Chunks: 0
```

### Root Cause
Two interconnected issues:

1. **In `searchKnowledgeBase()` function (server.js:137-175):**
   - The function expected `queryDocument()` to return objects with `id`, `text`, and `score` properties
   - However, `queryDocument()` actually returns a simple array of strings (the text chunks)
   - This caused `result.text` to be `undefined`, making all formatted results have `content: undefined`

2. **In `generateResponse()` function (agent.js:159):**
   - The code attempted to call `.substring()` on `toolOutput.results[0].content`
   - Since `content` was `undefined`, this threw an error
   - No safety checks were in place

### Impact
- Search queries failed with 500 errors
- Error messages logged instead of results
- Agent could retrieve chunks but couldn't format responses

### Solution

#### Part 1: Fixed searchKnowledgeBase()
**File Modified:** `server.js` (Lines 137-175)

**Before:**
```javascript
const formattedResults = rawSearchResults.map(result => ({
    chunkId: result.id,        // ← undefined
    content: result.text,       // ← undefined
    relevanceScore: result.score, // ← undefined
}));
```

**After:**
```javascript
// Since queryDocument returns strings, we need to format them properly
const formattedResults = rawSearchResults.map((chunk, index) => ({
    chunkId: `chunk_${index}`,
    content: chunk, // chunk is already a string
    relevanceScore: 1 - (index * 0.1), // Simple decreasing relevance score
}));
```

#### Part 2: Added Safety Checks in generateResponse()
**File Modified:** `agent.js` (Lines 156-170)

**Before:**
```javascript
if (toolOutput.success && toolOutput.resultCount > 0) {
    const firstResultContent = toolOutput.results[0].content.substring(0, 150) + "...";
    return `Found ${toolOutput.resultCount} relevant results. Here's a snippet from the top result: "${firstResultContent}"`;
}
```

**After:**
```javascript
if (toolOutput.success && toolOutput.resultCount > 0) {
    // Safety check to ensure results[0] and content exist
    if (toolOutput.results && toolOutput.results[0] && toolOutput.results[0].content) {
        const firstResultContent = toolOutput.results[0].content.substring(0, 150) + "...";
        return `Found ${toolOutput.resultCount} relevant results. Here's a snippet from the top result: "${firstResultContent}"`;
    } else {
        return `Found ${toolOutput.resultCount} relevant results in the knowledge base.`;
    }
}
```

---

## Testing Instructions

### Prerequisites
1. Ensure Node.js is installed
2. Install dependencies: `npm install`
3. Configure environment variables in `.env`:
   - `GEMINI_API_KEY`
   - `PINECONE_API_KEY`
   - `OPENAI_API_KEY` (if needed)

### Start the Server
```bash
node server.js
```

Expected output:
```
============================================================
🚀 RAG Backend Server
============================================================
Environment: development
Server URL: http://localhost:3000
Health Check: http://localhost:3000/health
Pinecone Index: rag-exercise-768
============================================================
```

### Test the Application

1. **Open the application:**
   - Navigate to: `http://localhost:3000/index.html`
   - **DO NOT** open the HTML file directly

2. **Test chat interface:**
   - Enter a question like "What is AI?"
   - Verify the message appears in the chat
   - Check for a response from the agent

3. **Test statistics panel:**
   - Verify "Total Queries" increments
   - Check "Last Query Time" updates

4. **Test query logs:**
   - Click "Show Logs" button
   - Verify logs appear with proper formatting
   - Check that queries, answers, and durations are displayed

5. **Test error handling:**
   - Enter an empty query (should be prevented)
   - Check browser console for no errors

### Expected Behavior

- ✅ No CORS errors in console
- ✅ All fetch requests return 200 status
- ✅ Chat messages render correctly
- ✅ Statistics update in real-time
- ✅ Query logs display properly
- ✅ No undefined or substring errors

---

## Summary

### Total Issues Fixed: 5

| Issue | Severity | Files Modified | Status |
|-------|----------|----------------|--------|
| CORS Policy Error | Critical | `server.js` | ✅ Fixed |
| DOMTokenList Empty Token | High | `index.html` | ✅ Fixed |
| Missing API Endpoint | High | `server.js` | ✅ Fixed |
| GenAI API Error | Critical | `agent.js` | ✅ Fixed |
| Substring Error | High | `server.js`, `agent.js` | ✅ Fixed |

### Files Modified

1. **server.js**
   - Line 284: Added static file serving
   - Lines 455-527: Added `/api/agent-stats` endpoint
   - Lines 137-175: Fixed `searchKnowledgeBase()` function

2. **index.html**
   - Lines 143-165: Refactored `addMessage()` function

3. **agent.js**
   - Lines 48-67: Fixed GenAI API usage in `analyzeIntent()`
   - Lines 156-170: Added safety checks in `generateResponse()`

### Key Learnings

1. **Always serve web applications through a proper server** to avoid CORS issues
2. **Never add empty strings to classList** - use conditional logic instead
3. **Implement API endpoints before frontend consumes them** or use mock data
4. **Read API documentation carefully** - SDK methods vary between versions
5. **Add defensive programming** - always validate data before accessing properties
6. **Use proper error handling** - catch and handle undefined/null values

### Architecture Improvements

The fixes transformed the application from a broken state to a fully functional RAG-powered chat interface with:

- ✅ Proper client-server architecture
- ✅ Real-time statistics tracking
- ✅ Comprehensive error handling
- ✅ Graceful degradation
- ✅ User-friendly error messages
- ✅ Robust data validation

---

**End of Documentation**
