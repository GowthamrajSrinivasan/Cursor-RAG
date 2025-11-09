# AI agent with custom tools and integration with RAG : Assignment

# Session 6 Exercise: Building Your First AI Agent with Tools

## Overview

This training manual guides you through creating your first AI agent that goes beyond simple chatbots. You'll build an intelligent agent that can answer questions from a knowledge base AND perform actions like saving logs and tracking statistics. By the end, you'll understand the fundamental difference between a chatbot and an agent: **Agents = LLM + Tools + Decision Making**.

## Prerequisites

- Completion of RAG implementation exercise (Session 5)
- Node.js installed on your computer
- Cursor IDE or Claude Code CLI installed
- Basic knowledge of JavaScript/TypeScript
- Your existing RAG system code as reference

## Exercise Outline

1. Set up modern development environment (Cursor/Claude Code)
2. Understand agent architecture vs chatbot architecture
3. Create agent tools (file operations, counters)
4. Build the agent decision-making system
5. Integrate with your RAG knowledge base
6. Test and deploy your agent

---

## Part 1: Setting Up Your Modern IDE

### Objective

Configure Cursor IDE or Claude Code CLI for AI-assisted development.

### Option A: Cursor IDE Setup

**Steps:**

1. Download Cursor from [https://cursor.com](https://cursor.com/)
2. Install and open Cursor
3. Import your existing RAG project:
    - File → Open Folder → Select your RAG project
4. Configure Cursor AI:
    - Press `Cmd/Ctrl + K` to open AI chat
    - Try asking: "Explain this codebase structure"
5. Learn key shortcuts:
    - `Cmd/Ctrl + K`: Inline AI editing
    - `Cmd/Ctrl + L`: AI chat panel
    - `Cmd/Ctrl + I`: Ask AI about selected code

### Option B: Claude Code CLI Setup

**Steps:**

1. Install Claude Code CLI:
    
    ```bash
    npm install -g @anthropic-ai/claude-code
    
    ```
    
2. Authenticate:
    
    ```bash
    claude auth login
    
    ```
    
3. Navigate to your project:
    
    ```bash
    cd your-rag-project
    
    ```
    
4. Start Claude Code:
    
    ```bash
    claude code
    
    ```
    
5. Try your first command:
    
    ```bash
    # Ask Claude to analyze your code
    claude analyze documentProcessing.ts
    
    ```
    

### Practice Task - ASK mode

Use your chosen IDE's AI features to:

- Generate a [README.md](http://readme.md/) for your RAG project
- Ask for code explanations of your existing functions
- Request suggestions for code improvements

---

## Part 2: Understanding Agent Architecture

### Objective

Use ChatGPT/Claude to Learn the conceptual difference between chatbots and agents through hands-on examples.

### Create Comparison File

Create a new file: `agent-concepts.md`

Use your IDE's AI to generate this content:

**Prompt for** ChatGPT**/Claude:**

```
Create a markdown document explaining:
1. What is a chatbot vs an agent
2. Examples of tools an agent can use
3. How agents make decisions
4. Real-world agent use cases

```

### Key Concepts to Document

Your generated document should cover:

| Component | Chatbot | Agent |
| --- | --- | --- |
| **Input/Output** | Text in → Text out | Text in → Text out + Actions |
| **Memory** | Conversation history only | Conversation + external state |
| **Capabilities** | Answer questions | Answer + perform tasks |
| **Decision Making** | Pattern matching | Tool selection logic |

---

## Part 3: Creating custom AI Tools in AI Coding Agent lCursor

### Objective

Build three essential tools your agent will use to perform actions.

### Tool 1: Query Logger

**Create file:** `tools/queryLogger.js`

**Requirements:**

- Function to append user queries to a log file
- Include timestamp with each query
- Handle file creation if it doesn't exist
- Return success/failure status

**Starter Code Structure:**

```jsx
// tools/queryLogger.js
const fs = require('fs').promises;
const path = require('path');

async function logQuery(query, username = 'user') {
    // TODO: Implement logging logic
    // 1. Create timestamp
    // 2. Format log entry: [timestamp] username: query
    // 3. Append to logs/query-log.txt
    // 4. Return success message
}

module.exports = { logQuery };

```

**Use your IDE to complete this:**

**Cursor Prompt:**

```
Complete the logQuery function that:
- Creates a logs directory if it doesn't exist
- Appends formatted entries to query-log.txt
- Uses async/await properly
- Handles errors gracefully

```

### Tool 2: Query Counter

**Create file:** `tools/queryCounter.js`

**Requirements:**

- Track total number of queries
- Store count in a JSON file
- Provide functions to increment and retrieve count
- Handle concurrent access safely

**Starter Code Structure:**

```jsx
// tools/queryCounter.js
const fs = require('fs').promises;
const path = require('path');

const COUNTER_FILE = path.join(__dirname, '../data/query-count.json');

async function incrementQueryCount() {
    // TODO: Implement counter increment
    // 1. Read current count (or initialize to 0)
    // 2. Increment by 1
    // 3. Save back to file
    // 4. Return new count
}

async function getQueryCount() {
    // TODO: Implement counter retrieval
}

module.exports = { incrementQueryCount, getQueryCount };

```

**Use your IDE to complete this:**

**Claude Code Prompt:**

```bash
claude complete tools/queryCounter.js --instructions "Add full implementation with error handling and file initialization"

```

### Tool 3: Knowledge Base Searcher

**Create file:** `tools/knowledgeBase.js`

**Requirements:**

- Reuse your existing RAG system functions
- Wrap them in an agent-friendly interface
- Add metadata to results (source, relevance score)
- Handle edge cases (no results, empty query)

**Code Structure:**

```jsx
// tools/knowledgeBase.js
const { searchDocuments } = require('../documentProcessing');

async function searchKnowledgeBase(query) {
    try {
        // TODO:
        // 1. Validate query is not empty
        // 2. Call your RAG search function
        // 3. Format results with metadata
        // 4. Return structured response

        const results = await searchDocuments(query);

        return {
            success: true,
            query: query,
            results: results,
            resultCount: results.length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = { searchKnowledgeBase };

```

---

## Part 4: Building the Agent Decision System

### Objective

Create the core agent that decides which tools to use based on user input.

### Create Agent Core

**Create file:** `agent.js`

**Architecture Overview:**

```
User Query → Agent Analyzer → Tool Selection → Tool Execution → Response Formation

```

**Implementation Steps:**

1. **Install additional dependencies:**
    
    ```bash
    npm install @google/generative-ai natural
    
    ```
    
2. **Create the agent decision logic:**

```jsx
// agent.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { logQuery } = require('./tools/queryLogger');
const { incrementQueryCount, getQueryCount } = require('./tools/queryCounter');
const { searchKnowledgeBase } = require('./tools/knowledgeBase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class TaskAgent {
    constructor() {
        this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        this.tools = {
            log_query: logQuery,
            count_queries: getQueryCount,
            search_knowledge: searchKnowledgeBase
        };
    }

    async analyzeIntent(userQuery) {
        // TODO: Use LLM to determine user intent
        // Return: { intent: string, needsKnowledge: boolean, needsAction: boolean }
    }

    async executeTools(intent, query) {
        // TODO: Based on intent, execute appropriate tools
        // Always log query and increment counter
        // Conditionally search knowledge base
    }

    async processQuery(userQuery) {
        try {
            console.log(`\\\\n🤖 Agent received: "${userQuery}"`);

            // Step 1: Analyze what the user wants
            const intent = await this.analyzeIntent(userQuery);
            console.log(`🧠 Detected intent: ${intent.intent}`);

            // Step 2: Execute tools based on intent
            const toolResults = await this.executeTools(intent, userQuery);

            // Step 3: Generate final response using LLM + tool results
            const response = await this.generateResponse(userQuery, toolResults);

            return response;

        } catch (error) {
            console.error('Agent error:', error);
            throw error;
        }
    }

    async generateResponse(query, toolResults) {
        // TODO: Use LLM to create natural language response
        // incorporating tool results
    }
}

module.exports = { TaskAgent };

```

**Use your IDE to complete the TODO sections:**

**Cursor Prompt:**

```
Complete the TaskAgent class:
1. analyzeIntent should use Gemini to classify user queries
2. executeTools should call tools based on intent
3. generateResponse should create natural responses using tool outputs
Add detailed comments explaining the decision-making process

```

---

## Part 5: Integrating with Your RAG System

### Objective

Connect your new agent with your existing RAG knowledge base seamlessly.

### Update Server.js

**Add new agent endpoint to your existing `server.js`:**

```jsx
// Add to existing server.js
const { TaskAgent } = require('./agent');
const agent = new TaskAgent();

// New endpoint for agent queries
app.post('/api/agent-query', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const response = await agent.processQuery(query);

        res.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Agent query error:', error);
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to get query statistics
app.get('/api/agent-stats', async (req, res) => {
    try {
        const { getQueryCount } = require('./tools/queryCounter');
        const count = await getQueryCount();

        res.json({
            totalQueries: count,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

```

---

## Part 6: Building the Agent Interface

### Objective

Create a user interface that showcases agent capabilities.

### Create Enhanced Frontend

**Create file:** `agent-interface.html`

**Key Features:**

- Query input area
- Real-time agent thinking process display
- Tool usage visualization
- Query statistics dashboard

**Use your IDE to generate:**

**Prompt:**

```
Create an HTML interface for an AI agent that:
1. Has a chat-like interface for queries
2. Shows which tools the agent is using in real-time
3. Displays a statistics panel (total queries, last query time)
4. Has a toggle to view query logs
5. Uses Tailwind CSS for modern styling
6. Connects to /api/agent-query and /api/agent-stats endpoints

```

**Required UI Elements:**

```html
<!-- Your generated HTML should include: -->
<div id="agent-interface">
    <!-- Chat area -->
    <div id="chat-container"></div>

    <!-- Query input -->
    <input id="query-input" type="text" placeholder="Ask me anything...">

    <!-- Tool usage indicator -->
    <div id="tool-status">
        <span id="logging-status">📝 Logging: idle</span>
        <span id="search-status">🔍 Searching: idle</span>
        <span id="count-status">📊 Counter: idle</span>
    </div>

    <!-- Statistics panel -->
    <div id="stats-panel">
        <h3>Agent Statistics</h3>
        <p>Total Queries: <span id="query-count">0</span></p>
    </div>

    <!-- Query log viewer -->
    <button id="view-logs">View Query History</button>
    <div id="log-viewer" style="display:none;"></div>
</div>

```

---

## Part 7: Testing Your Agent

### Objective

Verify that your agent correctly uses tools and makes decisions.

### Test Cases

Create a test file: `test-agent.js`

```jsx
// test-agent.js
const { TaskAgent } = require('./agent');

async function runTests() {
    const agent = new TaskAgent();

    const testQueries = [
        "What is machine learning?",  // Should use knowledge base
        "How many questions have been asked?",  // Should use counter only
        "Explain neural networks",  // Should use knowledge base
        "What is the query count?",  // Should use counter only
    ];

    console.log('🧪 Starting Agent Tests...\\\\n');

    for (const query of testQueries) {
        console.log(`\\\\n${'='.repeat(50)}`);
        console.log(`Testing: "${query}"`);
        console.log('='.repeat(50));

        try {
            const response = await agent.processQuery(query);
            console.log('✅ Response:', response);
        } catch (error) {
            console.error('❌ Error:', error.message);
        }

        // Wait 2 seconds between queries
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\\\\n✅ All tests completed!');
}

runTests();

```

**Run tests:**

```bash
node test-agent.js

```

### Expected Behaviors

Verify your agent:

- ✅ Logs every query to file
- ✅ Increments counter for each query
- ✅ Uses knowledge base only for knowledge questions
- ✅ Provides natural language responses
- ✅ Handles errors gracefully

---

## Part 8: GitHub Repository Update

### Objective

Update your existing GitHub repository with the agent code.

### Steps

1. **Create a new branch for agent features:**
    
    ```bash
    git checkout -b feature/task-agent
    
    ```
    
2. **Add and commit your new files:**
    
    ```bash
    git add .
    git commit -m "feat: Add task agent with tool integration
    
    - Implement TaskAgent class with decision-making logic
    - Add query logger, counter, and knowledge base tools
    - Create agent interface with real-time tool visualization
    - Add comprehensive test suite"
    
    ```
    
3. **Push to GitHub:**
    
    ```bash
    git push origin feature/task-agent
    
    ```
    
4. **Update [README.md](http://readme.md/):**
    
    Add this section using your IDE:
    
    **Prompt:**
    
    ```
    Update README.md to include:
    - New section: "AI Agent Features"
    - List of agent capabilities
    - How to run the agent
    - Explanation of tool system
    - Screenshots or ASCII diagrams of architecture
    
    ```
    

---

## Part 9: LinkedIn Showcase

### Objective

Prepare your LinkedIn post about this achievement.

### Recommended Post Template

```
🤖 Just built my first AI Agent!

Going beyond basic chatbots, I created an intelligent agent that:

✅ Makes decisions about which tools to use
✅ Searches knowledge bases for answers
✅ Logs and tracks all interactions
✅ Performs actions autonomously

Key learning: Agents = LLM + Tools + Decision Logic

Technologies: Node.js, Google Gemini, Vector Databases, Cursor IDE

The difference between a chatbot and an agent is like the difference between a phone directory and a personal assistant!

#AI #MachineLearning #AIAgents #TechEducation #100DaysOfCode

[Link to your GitHub repo]

```

---

## Troubleshooting Guide

### Common Issues

**Issue 1: Agent always uses all tools**

- **Solution:** Improve intent detection prompt
- Check that `analyzeIntent` returns different intents for different queries

**Issue 2: File permission errors**

- **Solution:** Ensure logs/ and data/ directories exist
- Add directory creation in tool initialization

**Issue 3: Counter shows wrong numbers**

- **Solution:** Check for race conditions in file writes
- Consider using atomic file operations

**Issue 4: Knowledge base not responding**

- **Solution:** Verify your RAG system still works independently
- Check Pinecone connection and API keys

---

## Next Steps & Challenges

After completing the basic exercise, try these enhancements:

### Challenge 1: Add More Tools

- **Weather tool:** Fetch current weather using an API
- **Calculator tool:** Perform mathematical operations
- **Web search tool:** Search the internet for current information

### Challenge 2: Improve Decision Making

- Add confidence scores to tool selection
- Implement tool chaining (use output of one tool as input to another)
- Add fallback logic when tools fail

### Challenge 3: Advanced Logging

- Add sentiment analysis to logged queries
- Create daily summary reports
- Build a dashboard showing query trends

### Challenge 4: Multi-turn Conversations

- Add conversation memory
- Allow follow-up questions
- Maintain context across queries

---

## Evaluation Criteria

Your agent will be evaluated on:

| Criterion | Points | Description |
| --- | --- | --- |
| **Tool Integration** | 25 | All three tools work correctly |
| **Decision Making** | 25 | Agent uses appropriate tools based on query |
| **Code Quality** | 20 | Clean, well-commented, error-handled |
| **User Interface** | 15 | Functional and informative UI |
| **Documentation** | 15 | Clear README and code comments |

**Total: 100 points**

---

## Submission Requirements

Submit by creating a GitHub repository with:

1. ✅ All source code files
2. ✅ Updated [README.md](http://readme.md/) with setup instructions
3. ✅ Test results screenshot/log
4. ✅ Short video demo (optional but recommended)
5. ✅ LinkedIn post draft in a markdown file

---

## Conclusion

Congratulations! You've built your first AI agent that understands the difference between answering questions and taking actions. This foundation is crucial for building more sophisticated agentic systems in future sessions.

**Key Takeaways:**

- Agents combine LLMs with external tools
- Decision-making logic is what makes agents "smart"
- Tools extend agent capabilities beyond text generation
- Modern IDEs like Cursor/Claude Code accelerate development

**You're now ready for Session 7: Web Scraping & Data Ingestion Agents!** 🚀