import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenAI } from "@google/genai";
// --- AI Tools ---
import fs from 'fs/promises';
import path from 'path';
import TaskAgent from './agent.js';
// --- Configuration ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = "rag-exercise-768";
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});
// Validate required environment variables
if (!OPENAI_API_KEY || !PINECONE_API_KEY) {
    console.error("❌ FATAL ERROR: OPENAI_API_KEY or PINECONE_API_KEY is missing in the .env file.");
    process.exit(1);
}

// --- RAG Pipeline Functions ---

async function processDocument(documentText) {
    console.log("[RAG] Step 1: Document Processing (Chunking)");
    
    if (!documentText || typeof documentText !== 'string') {
        throw new Error('Invalid document text provided');
    }
    
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 100,
    });
    
    const chunks = await splitter.splitText(documentText);
    
    if (chunks.length === 0) {
        throw new Error('Document chunking resulted in zero chunks');
    }
    
    console.log(`[RAG] ✅ Created ${chunks.length} chunks.`);
    return chunks;
}

async function generateEmbeddings(chunks) {
    console.log("[RAG] Step 2: Generate Embeddings");

    if (!Array.isArray(chunks) || chunks.length === 0) {
        throw new Error('Invalid chunks array provided');
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: "text-embedding-004",
    });

    const vectors = await embeddings.embedDocuments(chunks);

    // Validate vectors
    if (!vectors || vectors.length === 0 || vectors[0].length === 0) {
        throw new Error('Failed to generate valid embeddings - empty vectors returned');
    }

    console.log(`[RAG] ✅ Generated ${vectors.length} vectors (dimension: ${vectors[0].length}).`);
    return vectors;
}

async function storeInPinecone(chunks, vectors) {
    console.log("[RAG] Step 3: Store in Vector Database (Pinecone)");
    
    if (chunks.length !== vectors.length) {
        throw new Error('Mismatch between chunks and vectors length');
    }
    
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    const records = chunks.map((chunk, i) => ({
        id: `chunk_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        values: vectors[i],
        metadata: { text: chunk, timestamp: new Date().toISOString() }
    }));
    
    // Batch upsert for better performance with large datasets
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await index.upsert(batch);
    }
    
    console.log(`[RAG] ✅ Stored ${records.length} records in Pinecone.`);
    return records.length;
}

async function queryDocument(question) {
    console.log("[RAG] Step 4: Query and Retrieve");

    if (!question || typeof question !== 'string') {
        throw new Error('Invalid question provided');
    }

    // 1. Embed the question
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: "text-embedding-004",
    });
    const queryVector = await embeddings.embedQuery(question);
    
    // 2. Search Pinecone
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    const searchResults = await index.query({
        vector: queryVector,
        topK: 3,
        includeMetadata: true,
    });
    
    // 3. Extract relevant chunks
    const relevantChunks = searchResults.matches
        .filter(match => match.metadata?.text && typeof match.metadata.text === 'string')
        .map(match => match.metadata.text);
        
    console.log(`[RAG] ✅ Retrieved ${relevantChunks.length} relevant chunks.`);
    return relevantChunks;
}

// Add this function definition somewhere in your server.js file,
// for example, after the RAG pipeline functions like queryDocument.

async function searchKnowledgeBase(query) {
    try {
        // 1. Validate query is not empty
        if (!query || typeof query !== 'string' || query.trim() === '') {
            throw new Error('Query cannot be empty or invalid.');
        }

        // 2. Call your RAG search function
        // queryDocument returns an array of strings (the text chunks)
        const rawSearchResults = await queryDocument(query);

        // 3. Format results with metadata
        // Since queryDocument returns strings, we need to format them properly
        const formattedResults = rawSearchResults.map((chunk, index) => ({
            chunkId: `chunk_${index}`,
            content: chunk, // chunk is already a string
            relevanceScore: 1 - (index * 0.1), // Simple decreasing relevance score
        }));

        // 4. Return structured response
        return {
            success: true,
            query: query,
            results: formattedResults,
            resultCount: formattedResults.length,
            message: formattedResults.length > 0 ? 'Search completed successfully.' : 'No relevant results found.',
        };
    } catch (error) {
        console.error('❌ Error in searchKnowledgeBase:', error.message);
        return {
            success: false,
            query: query,
            results: [],
            resultCount: 0,
            message: `Failed to perform knowledge base search: ${error.message}`,
            errorDetails: error.message,
        };
    }
}

async function generateAnswer(question, context) {
    console.log("[RAG] Step 5: Generate Answer with LLM (RAG)");

    if (!Array.isArray(context) || context.length === 0) {
        throw new Error('No context available for answer generation');
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `You are a helpful assistant. Answer the question using ONLY the provided context.
If the answer is not found in the context, state that clearly and do not make up information.

Question: ${question}

Context:
${context.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")}

Answer with citations (e.g., [1], [2]):`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    console.log("[RAG] ✅ LLM response generated.");
    return response.text;
}
// --- Logging Functions ---

async function logQuery(query, answer, chunksRetrieved, duration) {
    const logsDir = path.join(process.cwd(), 'logs');
    const logFilePath = path.join(logsDir, 'query-log.txt');

    try {
        // Create logs directory if it doesn't exist
        await fs.mkdir(logsDir, { recursive: true });

        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] Query: "${query}"\nAnswer: "${answer}"\nChunks Retrieved: ${chunksRetrieved}\nDuration: ${duration}ms\n${'-'.repeat(80)}\n\n`;

        await fs.appendFile(logFilePath, logEntry);
        console.log('Query logged successfully.');
    } catch (error) {
        console.error('Failed to log query:', error);
    }
}

// Add the queryCounter function
async function queryCounter() {
    const logsDir = path.join(process.cwd(), 'logs');
    const countFilePath = path.join(logsDir, 'query-count.txt');

    try {
        await fs.mkdir(logsDir, { recursive: true });

        let currentCount = 0;
        try {
            const data = await fs.readFile(countFilePath, 'utf8');
            currentCount = parseInt(data, 10);
            if (isNaN(currentCount)) {
                console.warn('Query count file corrupted, resetting to 0.');
                currentCount = 0;
            }
        } catch (readError) {
            if (readError.code === 'ENOENT') {
                console.log('Query count file not found, initializing.');
            } else {
                throw readError;
            }
        }

        currentCount++;
        await fs.writeFile(countFilePath, currentCount.toString(), 'utf8');
        console.log(`Query count incremented to: ${currentCount}`);
        return currentCount;
    } catch (error) {
        console.error('Failed to update query count:', error);
        throw new Error('Failed to update query count.');
    }
}

  // Create an object to pass all RAG related functions to the TaskAgent
  const ragFunctions = {
    searchKnowledgeBase: searchKnowledgeBase, // Reference to your searchKnowledgeBase function
    generateAnswer: generateAnswer,           // Reference to your generateAnswer function
    queryCounter: queryCounter,               // Reference to your queryCounter function
};


const taskAgent = new TaskAgent({ genAI: ai, ragFunctions: ragFunctions });

// --- Express App Setup ---
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb for security
app.use(cors({
    origin: NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

// Serve static files (HTML, CSS, JS)
app.use(express.static(process.cwd()));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV
    });
});

// API Endpoint for Indexing (Steps 1-3)
app.post('/api/index-document', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { documentText } = req.body;
        
        if (!documentText) {
            return res.status(400).json({ 
                error: 'Document text is required.',
                success: false 
            });
        }
        
        if (typeof documentText !== 'string') {
            return res.status(400).json({ 
                error: 'Document text must be a string.',
                success: false 
            });
        }
        
        if (documentText.length > 500000) { // 500KB limit
            return res.status(400).json({ 
                error: 'Document text exceeds maximum length of 500,000 characters.',
                success: false 
            });
        }
        
        console.log("\n=== BACKEND: INDEXING STARTED ===");
        
        const chunks = await processDocument(documentText);
        const vectors = await generateEmbeddings(chunks);
        const recordCount = await storeInPinecone(chunks, vectors);
        
        const duration = Date.now() - startTime;
        console.log(`=== BACKEND: INDEXING FINISHED (${duration}ms) ===\n`);
        
        res.status(200).json({ 
            message: `Document successfully indexed with ${chunks.length} chunks.`,
            success: true,
            chunkCount: chunks.length,
            recordCount: recordCount,
            duration: duration
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error("❌ BACKEND ERROR - Indexing failed:", error.message);
        console.error(error.stack);
        
        res.status(500).json({ 
            error: 'Failed to index document. Please try again.',
            success: false,
            details: NODE_ENV === 'development' ? error.message : undefined,
            duration: duration
        });
    }
});

// API Endpoint for Querying (Steps 4 & 5)
app.post('/api/answer-question', async (req, res) => {
    const startTime = Date.now();

    try {
        const { question } = req.body;

        if (!question || typeof question !== 'string' || question.trim() === '') {
            return res.status(400).json({
                error: 'Question is required and cannot be empty.',
                success: false
            });
        }

        if (question.length > 1000) {
            return res.status(400).json({
                error: 'Question exceeds maximum length of 1,000 characters.',
                success: false
            });
        }

        console.log("\n=== BACKEND: AGENT PROCESSING STARTED ===");

        // 1. Analyze user intent
        const { intent, error: intentError } = await taskAgent.analyzeIntent(question);
        if (intentError) {
             const duration = Date.now() - startTime;
             console.error("❌ BACKEND ERROR - Intent analysis failed:", intentError);
             return res.status(500).json({
                 error: 'Failed to understand your request.',
                 success: false,
                 details: NODE_ENV === 'development' ? intentError : undefined,
                 duration: duration
             });
        }
        console.log(`[API] Detected Intent: ${intent}`);

        // 2. Execute tools based on intent
        const toolOutput = await taskAgent.executeTools(intent, question);
        console.log(`[API] Tool Output Type: ${toolOutput.type}`);

        // 3. Generate a natural language response
        const finalAnswer = await taskAgent.generateResponse(intent, toolOutput);

        const duration = Date.now() - startTime;
        console.log(`=== BACKEND: AGENT PROCESSING FINISHED (${duration}ms) ===\n`);

        // Log the query if it was successfully processed
        if (toolOutput.type !== 'error') {
            // Adjust parameters to logQuery based on actual toolOutput if needed
            await logQuery(question, finalAnswer, toolOutput.chunksRetrieved || 0, duration);
        } else {
             await logQuery(question, `Error: ${finalAnswer}`, 0, duration);
        }


        // Format response based on the tool's output type for the API
        let apiResponse = {
            answer: finalAnswer,
            success: toolOutput.type !== 'error',
            duration: duration,
        };

        if (toolOutput.type === 'answer') {
            apiResponse.chunksRetrieved = toolOutput.chunksRetrieved;
        } else if (toolOutput.type === 'search') {
            apiResponse.searchResults = toolOutput.results;
            apiResponse.resultCount = toolOutput.resultCount;
        } else if (toolOutput.type === 'query_count') {
            apiResponse.queryCount = toolOutput.count;
        } else {
            apiResponse.error = finalAnswer; // If it's an error, the finalAnswer is the error message.
            apiResponse.success = false;
        }


        res.status(apiResponse.success ? 200 : 500).json(apiResponse);

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error("❌ BACKEND ERROR - API endpoint failed:", error.message);
        console.error(error.stack);

        await logQuery(req.body.question, `Error: ${error.message}`, 0, duration);

        res.status(500).json({
            error: 'An unexpected internal server error occurred.',
            success: false,
            details: NODE_ENV === 'development' ? error.message : undefined,
            duration: duration
        });
    }
});

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

        // Read query logs
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

// API Endpoint for Search Knowledge Base
app.post('/api/search-knowledge-base', async (req, res) => {
    const startTime = Date.now();

    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({
                error: 'Question is required.',
                success: false
            });
        }

        if (typeof question !== 'string') {
            return res.status(400).json({
                error: 'Question must be a string.',
                success: false
            });
        }

        if (question.length > 1000) {
            return res.status(400).json({
                error: 'Question exceeds maximum length of 1,000 characters.',
                success: false
            });
        }

        console.log("\n=== BACKEND: QUERY STARTED ===");

        await queryCounter(); // Increment query count

        // Use the new searchKnowledgeBase function
        const searchResponse = await searchKnowledgeBase(question);

        if (!searchResponse.success) {
            // Handle error from searchKnowledgeBase
            console.error('❌ BACKEND ERROR - Knowledge Base Search failed:', searchResponse.errorDetails);
            const duration = Date.now() - startTime;
            // Optionally log this error query too
            // await logQuery(question, `Error: ${searchResponse.errorDetails}`, 0, duration);
            return res.status(500).json({
                error: 'Failed to search knowledge base. Please try again.',
                success: false,
                details: NODE_ENV === 'development' ? searchResponse.errorDetails : undefined,
                duration: duration
            });
        }

        const relevantChunks = searchResponse.results.map(result => result.content);

        if (relevantChunks.length === 0) {
            const duration = Date.now() - startTime;
            console.log(`=== BACKEND: QUERY FINISHED - No context (${duration}ms) ===\n`);

            await logQuery(question, "I couldn't find any relevant information in the document store to answer that question.", 0, duration);

            return res.status(200).json({
                answer: "I couldn't find any relevant information in the document store to answer that question.",
                success: true,
                chunksRetrieved: 0,
                duration: duration
            });
        }

        const answer = await generateAnswer(question, relevantChunks);

        const duration = Date.now() - startTime;
        console.log(`=== BACKEND: QUERY FINISHED (${duration}ms) ===\n`);

        await logQuery(question, answer, relevantChunks.length, duration);

        res.status(200).json({
            answer,
            success: true,
            chunksRetrieved: relevantChunks.length,
            duration: duration
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error("❌ BACKEND ERROR - Query failed:", error.message);
        console.error(error.stack);

        await logQuery(req.body.question, `Error: ${error.message}`, 0, duration);

        res.status(500).json({
            error: 'Failed to answer the question. Please try again.',
            success: false,
            details: NODE_ENV === 'development' ? error.message : undefined,
            duration: duration
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        success: false 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("❌ Unhandled error:", err);
    res.status(500).json({ 
        error: 'Internal server error',
        success: false,
        details: NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🚀 RAG Backend Server`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Server URL: http://localhost:${PORT}`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`Pinecone Index: ${PINECONE_INDEX_NAME}`);
    console.log(`${"=".repeat(60)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});