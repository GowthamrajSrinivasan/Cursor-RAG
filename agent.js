// --- Imports (ensure these are at the top of your server.js or accessible) ---
// import { GoogleGenAI } from "@google/genai";
// import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"; // If needed for intent analysis example
// import { Pinecone } from "@pinecone-database/pinecone"; // If needed within searchKnowledgeBase

// --- Assume these functions are defined and accessible (as per previous steps) ---
// async function queryDocument(question) { ... } // Modified to return structured results
// async function generateAnswer(question, context) { ... }
// async function searchKnowledgeBase(query) { ... }
// async function queryCounter() { ... }

// --- TaskAgent Class Definition ---

class TaskAgent {
    /**
     * @param {object} options - Configuration options for the TaskAgent.
     * @param {GoogleGenAI} options.genAI - An initialized instance of GoogleGenAI for LLM interactions.
     * @param {object} options.ragFunctions - An object containing RAG-related functions.
     * @param {function(string): Promise<object>} options.ragFunctions.searchKnowledgeBase - Function to search the knowledge base.
     * @param {function(string, string[]): Promise<string>} options.ragFunctions.generateAnswer - Function to generate an answer from context.
     * @param {function(): Promise<number>} options.ragFunctions.queryCounter - Function to increment and return query count.
     */
    constructor({ genAI, ragFunctions }) {
        // Store the initialized GoogleGenAI instance for use in analyzeIntent and executeTools (if LLM is used directly there).
        this.genAI = genAI;

        // Store references to the RAG pipeline functions.
        // This allows the TaskAgent to remain decoupled from the global scope and makes it more testable.
        this.searchKnowledgeBase = ragFunctions.searchKnowledgeBase;
        this.generateAnswer = ragFunctions.generateAnswer;
        this.queryCounter = ragFunctions.queryCounter;
    }

    /**
     * Analyzes the user's query to determine the intended action using Gemini.
     * This method acts as the "brain" of the agent, deciding which high-level task needs to be performed.
     * @param {string} query - The user's input query.
     * @returns {Promise<{intent: string, confidence?: number}>} - The classified intent and optional confidence.
     */
    async analyzeIntent(query) {
        // Decision-making process for intent analysis:
        // 1. Utilize an LLM (Gemini in this case) for natural language understanding.
        //    LLMs are excellent at classifying text based on examples or descriptions of intents.
        // 2. Define clear instructions for the LLM, including possible intents and desired output format.
        //    This prompt engineering is crucial for getting reliable classifications.
        // 3. Handle potential LLM errors or unexpected outputs gracefully.

        try {
            // Craft a prompt that guides Gemini to classify the intent.
            // Provide a list of expected intents and ask for a simple, parseable output.
            const prompt = `Classify the following user query into one of these categories:
            - "answer_question": The user is asking a question that requires a direct answer from the knowledge base.
            - "search_knowledge_base": The user wants to search the knowledge base for relevant documents or chunks.
            - "get_query_count": The user wants to know the current total number of queries.
            - "unknown": The query does not fit into any of the above categories.

            Respond with only the category name.

            Query: "${query}"
            Category:`;

            // Use the correct API for GoogleGenAI
            const result = await this.genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            const responseText = result.text.trim();

            // Further processing to ensure the intent is one of the predefined ones.
            const knownIntents = ["answer_question", "search_knowledge_base", "get_query_count"];
            const classifiedIntent = knownIntents.includes(responseText) ? responseText : "unknown";

            console.log(`[TaskAgent] Intent Analysis - Query: "${query}" -> Intent: "${classifiedIntent}"`);
            return { intent: classifiedIntent };

        } catch (error) {
            console.error(`[TaskAgent] Error during intent analysis for query "${query}":`, error);
            // If LLM classification fails, default to "unknown" or a safe fallback.
            return { intent: "unknown", error: error.message };
        }
    }

    /**
     * Executes the appropriate tool(s) based on the classified intent.
     * This method is responsible for dispatching tasks to the relevant backend functions.
     * @param {string} intent - The classified intent of the user's query.
     * @param {string} query - The original user query.
     * @param {object} [additionalArgs={}] - Any additional arguments required by the tools (e.g., context for answer generation).
     * @returns {Promise<any>} - The output from the executed tool(s).
     */
    async executeTools(intent, query, additionalArgs = {}) {
        // Decision-making process for tool execution:
        // 1. Use a switch statement or if/else chain to map intents to specific functions.
        // 2. Pass the necessary arguments to each function based on its signature.
        // 3. Include robust error handling for each tool call, as external operations can fail.
        // 4. For intents like "answer_question", it's a multi-step process (search then generate).
        //    This method should encapsulate that workflow.

        console.log(`[TaskAgent] Executing tool for intent: "${intent}"`);
        try {
            switch (intent) {
                case "answer_question":
                    // For answering a question, first search the knowledge base for relevant chunks,
                    // then use those chunks as context to generate an answer.
                    // This mirrors the RAG pipeline's query -> retrieve -> generate flow.
                    const searchResults = await this.searchKnowledgeBase(query);
                    if (searchResults.success && searchResults.results.length > 0) {
                        const context = searchResults.results.map(r => r.content);
                        const answer = await this.generateAnswer(query, context);
                        return { type: "answer", answer: answer, chunksRetrieved: context.length, searchResults: searchResults.results };
                    } else {
                        return { type: "answer", answer: "I couldn't find any relevant information in the document store to answer that question.", chunksRetrieved: 0 };
                    }

                case "search_knowledge_base":
                    // Directly call the knowledge base search function and return its structured output.
                    const kbSearchResults = await this.searchKnowledgeBase(query);
                    return { type: "search", ...kbSearchResults };

                case "get_query_count":
                    // Call the query counter function to retrieve the current count.
                    const count = await this.queryCounter();
                    return { type: "query_count", count: count };

                case "unknown":
                default:
                    // If the intent is unknown, return a clear message indicating this.
                    return { type: "error", message: "I don't understand that request." };
            }
        } catch (error) {
            console.error(`[TaskAgent] Error during tool execution for intent "${intent}" with query "${query}":`, error);
            return { type: "error", message: `An error occurred while processing your request: ${error.message}` };
        }
    }

    /**
     * Generates a natural language response to the user based on the intent and tool outputs.
     * This method translates raw tool outputs into user-friendly messages.
     * @param {string} intent - The classified intent.
     * @param {any} toolOutput - The structured output from the executed tool(s).
     * @returns {string} - A human-readable response.
     */
    async generateResponse(intent, toolOutput) {
        // Decision-making process for response generation:
        // 1. Map the intent and toolOutput structure to a natural language phrase.
        // 2. Handle different types of tool outputs (e.g., answer string, search results array, count number).
        // 3. Provide helpful messages for success, no results, or errors.
        // 4. Ensure consistency in phrasing and tone.

        console.log(`[TaskAgent] Generating response for intent: "${intent}"`);
        switch (toolOutput.type) {
            case "answer":
                // If an answer was successfully generated.
                return toolOutput.answer;

            case "search":
                // If a search was performed, summarize the results.
                if (toolOutput.success && toolOutput.resultCount > 0) {
                    // Safety check to ensure results[0] and content exist
                    if (toolOutput.results && toolOutput.results[0] && toolOutput.results[0].content) {
                        const firstResultContent = toolOutput.results[0].content.substring(0, 150) + "..."; // Truncate for brevity
                        return `Found ${toolOutput.resultCount} relevant results. Here's a snippet from the top result: "${firstResultContent}"`;
                    } else {
                        return `Found ${toolOutput.resultCount} relevant results in the knowledge base.`;
                    }
                } else if (toolOutput.success && toolOutput.resultCount === 0) {
                    return "No relevant documents found for your search query in the knowledge base.";
                } else {
                    return `I encountered an issue while searching the knowledge base: ${toolOutput.message}`;
                }

            case "query_count":
                // Provide the current query count.
                return `The total number of queries processed so far is: ${toolOutput.count}.`;

            case "error":
                // Handle errors from tool execution or unknown intents.
                return toolOutput.message;

            default:
                // Fallback for unexpected tool output types.
                return "I'm sorry, I couldn't process that request fully. Please try again.";
        }
    }
    
}
// Export the TaskAgent class using CommonJS syntax
export default TaskAgent;