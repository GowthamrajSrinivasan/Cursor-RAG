# AI Agent with Custom Tools and RAG Integration - Complete Tutorial

**Updated:** November 2025
**Based on:** Real implementation with production-ready fixes
**For:** Students learning to build AI agents from scratch

---

## 🎯 Overview

This comprehensive tutorial guides you through building a production-ready AI Agent with custom tools and RAG (Retrieval-Augmented Generation) integration. Unlike basic chatbots, your agent will:

- **Make intelligent decisions** about which tools to use
- **Search knowledge bases** for accurate answers
- **Track and log** all interactions
- **Handle errors gracefully** with production-ready code

**Key Learning:** `Agents = LLM + Tools + Decision Making + Error Handling`

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Stage 1: Basic RAG Setup](#stage-1-basic-rag-setup)
4. [Stage 2: Building the Agent Core](#stage-2-building-the-agent-core)
5. [Stage 3: Creating the Web Interface](#stage-3-creating-the-web-interface)
6. [Stage 4: Common Issues & Fixes](#stage-4-common-issues--fixes)
7. [Stage 5: Testing & Deployment](#stage-5-testing--deployment)
8. [Next Steps](#next-steps)

---

## Prerequisites

### Required Software
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git** for version control
- **Text Editor:** VS Code, Cursor, or Claude Code CLI

### Required Knowledge
- Basic JavaScript/Node.js
- Understanding of async/await
- Basic HTTP concepts
- Git basics

### Required API Keys
```bash
GEMINI_API_KEY=your_google_gemini_key
PINECONE_API_KEY=your_pinecone_key
```

Get your keys from:
- Google Gemini: https://makersuite.google.com/app/apikey
- Pinecone: https://app.pinecone.io/

---

## 📁 Project Structure

```
Cursor-RAG/
├── server.js                 # Express server with all endpoints
├── agent.js                  # AI Agent with decision-making logic
├── index.html               # Main chat interface
├── aiAgent.html             # Alternative agent interface
├── package.json             # Dependencies
├── .env                     # Environment variables (don't commit!)
├── .gitignore              # Git ignore rules
├── logs/                   # Query logs (auto-created)
│   ├── query-log.txt       # Detailed query logs
│   └── query-count.txt     # Query counter
├── BUG_FIXES_DOCUMENTATION.md  # Complete bug fix reference
└── README.md               # Project documentation
```

---

## Stage 1: Basic RAG Setup

### 🎯 Objectives
- Set up Express server with RAG pipeline
- Implement document processing and embedding
- Create Pinecone vector storage
- Build query and answer endpoints

### Step 1.1: Initialize Project

```bash
# Create project directory
mkdir cursor-rag-agent
cd cursor-rag-agent

# Initialize npm project
npm init -y

# Install dependencies
npm install express cors dotenv
npm install @google/generative-ai @langchain/google-genai
npm install @pinecone-database/pinecone
npm install langchain
```

### Step 1.2: Create Environment Variables

Create `.env` file:
```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Step 1.3: Set Up Basic Server

Create `server.js`:

```javascript
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenAI } from "@google/genai";
import fs from 'fs/promises';
import path from 'path';

// Configuration
const PORT = process.env.PORT || 3000;
const PINECONE_INDEX_NAME = "rag-exercise-768";

// Initialize AI
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// Express setup
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// IMPORTANT: Serve static files to avoid CORS issues
app.use(express.static(process.cwd()));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

### Step 1.4: Implement RAG Functions

Add to `server.js`:

```javascript
// Document Processing
async function processDocument(documentText) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 100,
    });

    return await splitter.splitText(documentText);
}

// Generate Embeddings
async function generateEmbeddings(chunks) {
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: "text-embedding-004",
    });

    return await embeddings.embedDocuments(chunks);
}

// Store in Pinecone
async function storeInPinecone(chunks, vectors) {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const records = chunks.map((chunk, i) => ({
        id: `chunk_${i}_${Date.now()}`,
        values: vectors[i],
        metadata: { text: chunk, timestamp: new Date().toISOString() }
    }));

    await index.upsert(records);
    return records.length;
}

// Query Documents
async function queryDocument(question) {
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: "text-embedding-004",
    });

    const queryVector = await embeddings.embedQuery(question);

    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const searchResults = await index.query({
        vector: queryVector,
        topK: 3,
        includeMetadata: true,
    });

    return searchResults.matches
        .filter(match => match.metadata?.text)
        .map(match => match.metadata.text);
}

// Generate Answer
async function generateAnswer(question, context) {
    const prompt = `You are a helpful assistant. Answer using ONLY the provided context.

Question: ${question}

Context:
${context.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}

Answer with citations:`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    return response.text;
}
```

### ⚠️ **Common Issue #1: Import/Export Syntax**

**Problem:** If you see `SyntaxError: Cannot use import statement outside a module`

**Fix:** Add to `package.json`:
```json
{
  "type": "module"
}
```

---

## Stage 2: Building the Agent Core

### 🎯 Objectives
- Create AI agent with decision-making logic
- Implement custom tools (logging, counting, searching)
- Build intent analysis system
- Handle multiple tool execution

### Step 2.1: Create Agent Class

Create `agent.js`:

```javascript
class TaskAgent {
    constructor({ genAI, ragFunctions }) {
        this.genAI = genAI;
        this.searchKnowledgeBase = ragFunctions.searchKnowledgeBase;
        this.generateAnswer = ragFunctions.generateAnswer;
        this.queryCounter = ragFunctions.queryCounter;
    }

    async analyzeIntent(query) {
        try {
            const prompt = `Classify the following user query into one of these categories:
            - "answer_question": The user is asking a question that requires a direct answer from the knowledge base.
            - "search_knowledge_base": The user wants to search the knowledge base for relevant documents or chunks.
            - "get_query_count": The user wants to know the current total number of queries.
            - "unknown": The query does not fit into any of the above categories.

            Respond with only the category name.

            Query: "${query}"
            Category:`;

            const result = await this.genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const responseText = result.text.trim();
            const knownIntents = ["answer_question", "search_knowledge_base", "get_query_count"];
            const classifiedIntent = knownIntents.includes(responseText) ? responseText : "unknown";

            console.log(`[Agent] Intent: "${query}" -> "${classifiedIntent}"`);
            return { intent: classifiedIntent };

        } catch (error) {
            console.error(`[Agent] Error analyzing intent:`, error);
            return { intent: "unknown", error: error.message };
        }
    }

    async executeTools(intent, query) {
        console.log(`[Agent] Executing tools for: "${intent}"`);

        try {
            switch (intent) {
                case "answer_question":
                    const searchResults = await this.searchKnowledgeBase(query);
                    if (searchResults.success && searchResults.results.length > 0) {
                        const context = searchResults.results.map(r => r.content);
                        const answer = await this.generateAnswer(query, context);
                        return {
                            type: "answer",
                            answer: answer,
                            chunksRetrieved: context.length
                        };
                    } else {
                        return {
                            type: "answer",
                            answer: "I couldn't find relevant information.",
                            chunksRetrieved: 0
                        };
                    }

                case "search_knowledge_base":
                    const kbResults = await this.searchKnowledgeBase(query);
                    return { type: "search", ...kbResults };

                case "get_query_count":
                    const count = await this.queryCounter();
                    return { type: "query_count", count: count };

                default:
                    return { type: "error", message: "I don't understand that request." };
            }
        } catch (error) {
            console.error(`[Agent] Error executing tools:`, error);
            return { type: "error", message: error.message };
        }
    }

    async generateResponse(intent, toolOutput) {
        console.log(`[Agent] Generating response for: "${intent}"`);

        switch (toolOutput.type) {
            case "answer":
                return toolOutput.answer;

            case "search":
                if (toolOutput.success && toolOutput.resultCount > 0) {
                    if (toolOutput.results?.[0]?.content) {
                        let contentToDisplay = toolOutput.results[0].content;

                        // Handle JSON FAQ format
                        try {
                            const parsed = JSON.parse(contentToDisplay);
                            if (parsed?.faqs?.[0]) {
                                const faq = parsed.faqs[0];
                                contentToDisplay = `Q: ${faq.question} A: ${faq.answer}`;
                            }
                        } catch (e) {
                            // Not JSON, use as-is
                        }

                        if (contentToDisplay.length > 150) {
                            contentToDisplay = contentToDisplay.substring(0, 150) + "...";
                        }

                        return `Found ${toolOutput.resultCount} results. Snippet: "${contentToDisplay}"`;
                    }
                    return `Found ${toolOutput.resultCount} results in the knowledge base.`;
                }
                return "No relevant documents found.";

            case "query_count":
                return `Total queries processed: ${toolOutput.count}`;

            case "error":
                return toolOutput.message;

            default:
                return "I couldn't process that request.";
        }
    }
}

export default TaskAgent;
```

### ⚠️ **Common Issue #2: GenAI API Error**

**Problem:** `TypeError: this.genAI.getGenerativeModel is not a function`

**Why:** The Google GenAI SDK doesn't use `getGenerativeModel()`.

**Fix:** Use the correct API pattern shown above:
```javascript
await this.genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
});
```

### Step 2.2: Add Helper Functions

Add to `server.js`:

```javascript
// Logging function
async function logQuery(query, answer, chunksRetrieved, duration) {
    const logsDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logsDir, { recursive: true });

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Query: "${query}"\nAnswer: "${answer}"\nChunks: ${chunksRetrieved}\nDuration: ${duration}ms\n${'-'.repeat(80)}\n\n`;

    await fs.appendFile(path.join(logsDir, 'query-log.txt'), logEntry);
}

// Query counter
async function queryCounter() {
    const logsDir = path.join(process.cwd(), 'logs');
    const countFile = path.join(logsDir, 'query-count.txt');

    await fs.mkdir(logsDir, { recursive: true });

    let count = 0;
    try {
        const data = await fs.readFile(countFile, 'utf8');
        count = parseInt(data, 10) || 0;
    } catch (error) {
        // File doesn't exist yet
    }

    count++;
    await fs.writeFile(countFile, count.toString());
    return count;
}

// Search knowledge base wrapper
async function searchKnowledgeBase(query) {
    try {
        const rawResults = await queryDocument(query);

        const formattedResults = rawResults.map((chunk, index) => ({
            chunkId: `chunk_${index}`,
            content: chunk,
            relevanceScore: 1 - (index * 0.1),
        }));

        return {
            success: true,
            query: query,
            results: formattedResults,
            resultCount: formattedResults.length,
        };
    } catch (error) {
        return {
            success: false,
            query: query,
            results: [],
            resultCount: 0,
            message: error.message,
        };
    }
}
```

### ⚠️ **Common Issue #3: Substring Error**

**Problem:** `Cannot read properties of undefined (reading 'substring')`

**Why:** The `searchKnowledgeBase` function was trying to access properties that don't exist.

**Fix:** See the corrected version above that properly maps string arrays.

### Step 2.3: Integrate Agent with Server

Add to `server.js`:

```javascript
import TaskAgent from './agent.js';

// Create agent instance
const ragFunctions = {
    searchKnowledgeBase,
    generateAnswer,
    queryCounter,
};

const taskAgent = new TaskAgent({ genAI: ai, ragFunctions });

// Agent endpoint
app.post('/api/answer-question', async (req, res) => {
    const startTime = Date.now();

    try {
        const { question } = req.body;

        if (!question?.trim()) {
            return res.status(400).json({
                error: 'Question is required',
                success: false
            });
        }

        // Analyze intent
        const { intent, error: intentError } = await taskAgent.analyzeIntent(question);
        if (intentError) {
            return res.status(500).json({
                error: 'Failed to analyze intent',
                success: false
            });
        }

        // Execute tools
        const toolOutput = await taskAgent.executeTools(intent, question);

        // Generate response
        const finalAnswer = await taskAgent.generateResponse(intent, toolOutput);

        const duration = Date.now() - startTime;

        // Log the query
        await logQuery(question, finalAnswer, toolOutput.chunksRetrieved || 0, duration);

        res.json({
            answer: finalAnswer,
            success: toolOutput.type !== 'error',
            duration,
            chunksRetrieved: toolOutput.chunksRetrieved,
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error('API Error:', error);

        res.status(500).json({
            error: 'Internal server error',
            success: false,
            duration
        });
    }
});

// Stats endpoint
app.get('/api/agent-stats', async (req, res) => {
    try {
        const logsDir = path.join(process.cwd(), 'logs');
        const countFile = path.join(logsDir, 'query-count.txt');
        const logFile = path.join(logsDir, 'query-log.txt');

        let totalQueries = 0;
        let lastQueryTime = null;
        let queryLogs = [];

        // Read count
        try {
            const data = await fs.readFile(countFile, 'utf8');
            totalQueries = parseInt(data, 10) || 0;
        } catch (error) {
            // File doesn't exist
        }

        // Read logs
        try {
            const logData = await fs.readFile(logFile, 'utf8');
            const entries = logData.split('-'.repeat(80)).filter(e => e.trim());

            queryLogs = entries.map(entry => {
                const timestamp = entry.match(/\[(.*?)\]/)?.[1];
                const query = entry.match(/Query: "(.*?)"/)?.[1];
                const answer = entry.match(/Answer: "(.*?)"/s)?.[1];
                const chunks = entry.match(/Chunks: (\d+)/)?.[1];
                const duration = entry.match(/Duration: (\d+)ms/)?.[1];

                if (timestamp && query) {
                    if (!lastQueryTime || new Date(timestamp) > new Date(lastQueryTime)) {
                        lastQueryTime = timestamp;
                    }
                    return {
                        timestamp,
                        query,
                        answer: answer || 'N/A',
                        chunksRetrieved: parseInt(chunks) || 0,
                        duration: parseInt(duration) || 0
                    };
                }
                return null;
            }).filter(log => log !== null).reverse();
        } catch (error) {
            // File doesn't exist
        }

        res.json({
            success: true,
            totalQueries,
            lastQueryTime,
            queryLogs
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

---

## Stage 3: Creating the Web Interface

### 🎯 Objectives
- Build responsive chat interface
- Display agent statistics
- Show query logs
- Handle errors gracefully

### Step 3.1: Create HTML Interface

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agent Chat</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <header class="bg-indigo-700 text-white p-4">
        <h1 class="text-2xl font-bold">AI Agent Chat</h1>
    </header>

    <main class="container mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Chat Interface -->
        <section class="md:col-span-2 bg-white rounded-lg shadow-xl flex flex-col h-full">
            <div class="p-4 border-b">
                <h2 class="text-xl font-semibold">Conversation</h2>
            </div>

            <div id="chatMessages" class="flex-grow p-4 overflow-y-auto">
                <div class="flex justify-start">
                    <div class="bg-blue-100 text-blue-800 p-3 rounded-lg max-w-md">
                        Hello! How can I assist you today?
                    </div>
                </div>
            </div>

            <div id="toolUsageIndicator" class="p-2 text-sm text-gray-600 italic border-t hidden">
                <span class="flex items-center">
                    <svg class="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Agent is thinking...
                </span>
            </div>

            <form id="queryForm" class="p-4 border-t flex space-x-2">
                <input type="text" id="queryInput" placeholder="Ask your question..."
                       class="flex-grow p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                       required>
                <button type="submit" class="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700">
                    Send
                </button>
            </form>
        </section>

        <!-- Sidebar -->
        <aside class="md:col-span-1 flex flex-col space-y-6">
            <!-- Statistics -->
            <div class="bg-white rounded-lg shadow-xl p-4">
                <h2 class="text-xl font-semibold mb-4">Statistics</h2>
                <p><strong>Total Queries:</strong> <span id="totalQueries">0</span></p>
                <p><strong>Last Query:</strong> <span id="lastQueryTime">N/A</span></p>
            </div>

            <!-- Query Logs -->
            <div class="bg-white rounded-lg shadow-xl p-4 flex-grow flex flex-col">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold">Query Logs</h2>
                    <button id="toggleLogsBtn" class="bg-gray-200 px-4 py-2 rounded-lg">
                        Hide Logs
                    </button>
                </div>
                <div id="queryLogsContainer" class="flex-grow relative">
                    <div id="queryLogsContent" class="absolute inset-0 bg-gray-50 p-3 rounded-lg border overflow-y-auto text-sm">
                        <p class="text-gray-500">No logs yet.</p>
                    </div>
                </div>
            </div>
        </aside>
    </main>

    <script>
        const API_ANSWER = '/api/answer-question';
        const API_STATS = '/api/agent-stats';

        const chatMessages = document.getElementById('chatMessages');
        const queryInput = document.getElementById('queryInput');
        const queryForm = document.getElementById('queryForm');
        const toolIndicator = document.getElementById('toolUsageIndicator');
        const totalQueriesSpan = document.getElementById('totalQueries');
        const lastQueryTimeSpan = document.getElementById('lastQueryTime');
        const toggleLogsBtn = document.getElementById('toggleLogsBtn');
        const queryLogsContainer = document.getElementById('queryLogsContainer');
        const queryLogsContent = document.getElementById('queryLogsContent');

        function scrollToBottom(element) {
            element.scrollTop = element.scrollHeight;
        }

        function addMessage(sender, text, isError = false) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('flex', sender === 'user' ? 'justify-end' : 'justify-start');

            const contentDiv = document.createElement('div');
            const baseClasses = ['p-3', 'rounded-lg', 'max-w-md', 'shadow', 'mb-4'];

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

        async function updateStats() {
            try {
                const response = await fetch(API_STATS);
                const data = await response.json();

                if (data.success) {
                    totalQueriesSpan.innerText = data.totalQueries || 0;
                    lastQueryTimeSpan.innerText = data.lastQueryTime
                        ? new Date(data.lastQueryTime).toLocaleString()
                        : 'N/A';

                    if (!queryLogsContainer.classList.contains('hidden') && data.queryLogs) {
                        renderQueryLogs(data.queryLogs);
                    }
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        }

        function renderQueryLogs(logs) {
            queryLogsContent.innerHTML = '';

            if (logs.length === 0) {
                queryLogsContent.innerHTML = '<p class="text-gray-500">No logs available.</p>';
                return;
            }

            logs.forEach(log => {
                const logDiv = document.createElement('div');
                logDiv.classList.add('mb-4', 'p-2', 'bg-white', 'rounded-md', 'border');
                logDiv.innerHTML = `
                    <p><strong>Time:</strong> ${new Date(log.timestamp).toLocaleString()}</p>
                    <p><strong>Query:</strong> ${log.query}</p>
                    <p><strong>Answer:</strong> ${log.answer.substring(0, 100)}...</p>
                    <p><strong>Duration:</strong> ${log.duration}ms</p>
                `;
                queryLogsContent.appendChild(logDiv);
            });
        }

        queryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = queryInput.value.trim();
            if (!query) return;

            addMessage('user', query);
            queryInput.value = '';
            toolIndicator.classList.remove('hidden');

            try {
                const response = await fetch(API_ANSWER, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: query }),
                });

                const data = await response.json();
                toolIndicator.classList.add('hidden');

                if (data.success) {
                    addMessage('agent', data.answer || "No answer available.");
                } else {
                    addMessage('agent', data.error || 'An error occurred.', true);
                }
            } catch (error) {
                toolIndicator.classList.add('hidden');
                addMessage('agent', 'Failed to connect to the agent.', true);
            } finally {
                updateStats();
            }
        });

        toggleLogsBtn.addEventListener('click', () => {
            const isHidden = queryLogsContainer.classList.toggle('hidden');
            toggleLogsBtn.innerText = isHidden ? 'Show Logs' : 'Hide Logs';
            if (!isHidden) {
                updateStats();
            }
        });

        // Initial load
        updateStats();

        // Load logs initially
        (async () => {
            try {
                const response = await fetch(API_STATS);
                const data = await response.json();
                if (data.success && data.queryLogs) {
                    renderQueryLogs(data.queryLogs);
                }
            } catch (error) {
                console.error('Error loading initial logs:', error);
            }
        })();

        // Periodic updates
        setInterval(updateStats, 10000);
    </script>
</body>
</html>
```

### ⚠️ **Common Issue #4: CORS Policy Error**

**Problem:** `Access to fetch at 'file:///api/agent-stats' from origin 'null' has been blocked`

**Why:** Opening HTML directly uses `file://` protocol, not `http://`

**Fix:**
1. Add static file serving to server.js (already shown above)
2. Access via `http://localhost:3000/index.html` instead of opening file directly

### ⚠️ **Common Issue #5: DOMTokenList Empty Token Error**

**Problem:** `Failed to execute 'add' on 'DOMTokenList': The token provided must not be empty`

**Why:** Attempting to add empty strings to classList

**Fix:** Use conditional logic shown in the HTML above (lines with `baseClasses`)

---

## Stage 4: Common Issues & Fixes

### Issue Summary Table

| Issue | Error Message | Stage | Fix Location |
|-------|--------------|-------|--------------|
| **CORS Error** | `Access to fetch blocked` | Testing | `server.js` - Add static serving |
| **GenAI API Error** | `getGenerativeModel is not a function` | Agent Core | `agent.js` - Use correct API |
| **Substring Error** | `Cannot read properties of undefined` | Integration | `server.js` - Fix searchKnowledgeBase |
| **Empty Token Error** | `DOMTokenList token must not be empty` | Frontend | `index.html` - Conditional classList |
| **Missing Endpoint** | `404 Not Found` | Testing | `server.js` - Add /api/agent-stats |

### Detailed Fix Guide

For comprehensive documentation of all bugs and fixes, see:
👉 **[BUG_FIXES_DOCUMENTATION.md](./BUG_FIXES_DOCUMENTATION.md)**

This file contains:
- Root cause analysis for each issue
- Before/after code comparisons
- Testing procedures
- Prevention strategies

---

## Stage 5: Testing & Deployment

### Step 5.1: Create Test Script

Create `test-agent.js`:

```javascript
import { GoogleGenAI } from "@google/genai";
import TaskAgent from './agent.js';
import 'dotenv/config';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// Mock RAG functions for testing
const mockRagFunctions = {
    searchKnowledgeBase: async (query) => ({
        success: true,
        results: [
            { content: `Mock result for: ${query}`, relevanceScore: 0.9 }
        ],
        resultCount: 1
    }),
    generateAnswer: async (query, context) => `Mock answer for: ${query}`,
    queryCounter: async () => 1,
};

const agent = new TaskAgent({ genAI: ai, ragFunctions: mockRagFunctions });

async function runTests() {
    const tests = [
        { query: "What is AI?", expectedIntent: "answer_question" },
        { query: "Search for machine learning", expectedIntent: "search_knowledge_base" },
        { query: "How many queries?", expectedIntent: "get_query_count" },
    ];

    console.log('🧪 Starting Agent Tests...\n');

    for (const test of tests) {
        console.log(`Testing: "${test.query}"`);

        const { intent } = await agent.analyzeIntent(test.query);
        const toolOutput = await agent.executeTools(intent, test.query);
        const response = await agent.generateResponse(intent, toolOutput);

        console.log(`✓ Intent: ${intent}`);
        console.log(`✓ Response: ${response}\n`);

        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('✅ All tests completed!');
}

runTests();
```

Run tests:
```bash
node test-agent.js
```

### Step 5.2: Start Production Server

```bash
# Start server
node server.js

# In browser, navigate to:
# http://localhost:3000/index.html
```

### Step 5.3: Verify All Features

**Checklist:**
- [ ] Chat interface loads
- [ ] Can send messages
- [ ] Agent responds with answers
- [ ] Statistics update
- [ ] Query logs display
- [ ] No console errors
- [ ] Logs directory created
- [ ] Query count increments

---

## Next Steps

### 🚀 Enhancements

1. **Add More Tools**
   - Weather API integration
   - Calculator tool
   - Web search capability

2. **Improve Agent**
   - Add conversation memory
   - Multi-turn dialogues
   - Confidence scores

3. **Better UI**
   - Dark mode
   - Export chat history
   - Voice input

4. **Production Ready**
   - Add authentication
   - Rate limiting
   - Proper error logging
   - Database instead of files

### 📚 Learning Resources

- [LangChain Documentation](https://js.langchain.com/docs/)
- [Google Gemini API](https://ai.google.dev/docs)
- [Pinecone Vector Database](https://docs.pinecone.io/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

### 🎓 Assessment Criteria

| Criterion | Points | Requirements |
|-----------|--------|--------------|
| **Functionality** | 30 | All features work correctly |
| **Code Quality** | 25 | Clean, commented, error-handled |
| **Agent Logic** | 25 | Proper intent detection and tool use |
| **UI/UX** | 10 | User-friendly interface |
| **Documentation** | 10 | Clear README and comments |
| **Total** | **100** | |

---

## 📝 Submission Checklist

Before submitting your project:

- [ ] All code is committed to Git
- [ ] README.md is complete
- [ ] .env is NOT committed (.gitignore configured)
- [ ] All bugs from Stage 4 are fixed
- [ ] Test script runs successfully
- [ ] Screenshot/video demo created
- [ ] GitHub repository is public
- [ ] LinkedIn post drafted

---

## 🎉 Conclusion

Congratulations! You've built a production-ready AI Agent with:

✅ **Custom Tools** - Logging, counting, and knowledge search
✅ **Decision Making** - Intent analysis with LLM
✅ **Error Handling** - Graceful fallbacks and fixes
✅ **RAG Integration** - Vector search and answer generation
✅ **Web Interface** - Real-time chat with statistics

**Key Takeaways:**
- Agents = LLM + Tools + Decision Logic
- Error handling is crucial for production
- Testing prevents common pitfalls
- Documentation enables learning

**You're ready for advanced agent patterns! 🚀**

---

## 📞 Support

Issues? Check:
1. [BUG_FIXES_DOCUMENTATION.md](./BUG_FIXES_DOCUMENTATION.md)
2. GitHub Issues in this repo
3. Course discussion forum

**Happy Building! 🤖**
