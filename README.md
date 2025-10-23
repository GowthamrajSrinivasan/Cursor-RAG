# RAG Example - Retrieval-Augmented Generation Q&A System

A complete implementation of a Retrieval-Augmented Generation (RAG) system that combines document indexing, semantic search, and LLM-powered answer generation. This project demonstrates how to build intelligent document question-answering systems using modern LLM frameworks and vector databases.

## Features

- **Document Indexing**: Upload and process documents into vector embeddings
- **Semantic Search**: Retrieve contextually relevant document chunks using vector similarity
- **LLM Integration**: Generate accurate answers using Google Gemini with source citations
- **Interactive UI**: Clean web interface for document upload and Q&A
- **Real-time Feedback**: View processing logs and performance metrics

## Architecture

The system follows a 5-step RAG pipeline:

1. **Document Processing**: Split documents into chunks (500 characters with 100-character overlap)
2. **Embedding Generation**: Create vector embeddings using Google Gemini
3. **Vector Storage**: Store embeddings and document chunks in Pinecone
4. **Query Processing**: Embed user questions and retrieve top-3 relevant chunks
5. **Answer Generation**: Use Google Gemini LLM to generate answers with citations

## Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML + Tailwind CSS
- **LLM Framework**: LangChain
- **Embeddings**: Google Generative AI (embedding-001)
- **LLM Model**: Google Gemini 2.5-flash
- **Vector Database**: Pinecone
- **Alternative Components**: OpenAI, HuggingFace

## Prerequisites

- **Node.js** v16 or higher
- **npm** (included with Node.js)
- **API Keys** for:
  - Google Gemini (embeddings & LLM)
  - Pinecone (vector database)
  - OpenAI (optional alternative)
  - HuggingFace (optional alternative)

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create or edit the `.env` file in the project root with your API keys:

```env
# Required
GEMINI_API_KEY=your_google_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Optional
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Getting API Keys:**
- [Google Gemini API](https://aistudio.google.com/apikey)
- [Pinecone Console](https://app.pinecone.io) (Index name: `rag-exercise-768`)
- [HuggingFace](https://huggingface.co/settings/tokens)
- [OpenAI API](https://platform.openai.com/api-keys)

### 3. Start the Backend Server

```bash
node server.js
```

You should see:
```
============================================================
RAG Backend Server
============================================================
Environment: development
Server URL: http://localhost:3000
Health Check: http://localhost:3000/health
Pinecone Index: rag-exercise-768
============================================================
```

### 4. Open the Frontend

Option A: Open directly in your browser
```
file:///path/to/index.html
```

Option B: Serve via HTTP server (recommended)
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server

# Then visit: http://localhost:8000/index.html
```

## Usage

### Indexing Documents

1. Navigate to the **Document Indexing** panel (left side)
2. Either:
   - **Upload a file**: Click the file input to select a document
   - **Paste text**: Enter document text directly in the text area
3. Click **Index Document**
4. Monitor the processing in the **Backend Logs** panel (right side)

**Document Limits:**
- Maximum document size: 500,000 characters
- Supports plain text format

### Asking Questions

1. Navigate to the **Question** panel (middle)
2. Enter your question (max 1,000 characters)
3. Click **Ask Question**
4. View the answer and retrieved context chunks below

**Features:**
- Automatic source citations with relevant chunks
- Performance metrics showing query and response time
- Full conversation history in the backend logs

## Project Structure

```
RAG example/
├── server.js                 # Express.js backend server (349 lines)
├── index.html               # Interactive web UI (279 lines)
├── documentProcessing.ts    # Reference RAG implementation
├── package.json             # Node.js dependencies
├── .env                      # Environment variables (API keys)
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

## API Endpoints

### Health Check
```http
GET /health
```
Check if the server is running.

### Index Document
```http
POST /api/index-document
Content-Type: application/json

{
  "document": "Your document text here..."
}
```
Processes and indexes a document into the vector database.

**Response:**
```json
{
  "success": true,
  "documentsIndexed": 5,
  "chunkIds": ["chunk-1", "chunk-2", ...],
  "processingTime": 2.345
}
```

### Answer Question
```http
POST /api/answer-question
Content-Type: application/json

{
  "question": "Your question here?",
  "topK": 3
}
```
Queries the vector database and generates an answer.

**Response:**
```json
{
  "question": "Your question here?",
  "answer": "The generated answer with citations...",
  "retrievedChunks": [
    { "content": "...", "score": 0.95 },
    ...
  ],
  "processingTime": 1.234
}
```

## Configuration Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Chunk Size | 500 chars | Document split size |
| Chunk Overlap | 100 chars | Context overlap between chunks |
| Top-K Retrieval | 3 | Number of retrieved chunks for answer generation |
| Embedding Model | embedding-001 | Google Gemini embeddings |
| LLM Model | gemini-2.5-flash | Google Gemini for answer generation |
| Pinecone Index | rag-exercise-768 | Vector database index name |
| Server Port | 3000 | HTTP server port |

## Security Considerations

⚠️ **Important**: This is an educational implementation. Before production use:

1. **Rotate API Keys**: The exposed keys in `.env` should be regenerated immediately
2. **Add Authentication**: Implement API key validation for endpoints
3. **Restrict CORS**: Limit cross-origin requests to trusted domains in production
4. **Environment-based Config**: Never commit `.env` files with real credentials
5. **Input Validation**: Already implemented (500KB max, 1KB question limit)
6. **Rate Limiting**: Implement rate limiting to prevent abuse
7. **Error Handling**: Reduce detailed error messages in production mode

## Troubleshooting

### "Cannot connect to Pinecone"
- Verify `PINECONE_API_KEY` is correct in `.env`
- Check Pinecone index name: `rag-exercise-768`
- Ensure your Pinecone account is active

### "Invalid Google Gemini API key"
- Regenerate key from [Google AI Studio](https://aistudio.google.com/apikey)
- Verify the key is set in `GEMINI_API_KEY` in `.env`

### Frontend not connecting to backend
- Ensure server is running on `localhost:3000`
- Check browser console for CORS errors
- Verify `NODE_ENV` is set to `development` for open CORS

### Document indexing fails
- Check document size (max 500,000 characters)
- Verify all API keys are valid
- Check backend logs for detailed error messages

## Development

### Project Setup
```bash
npm install
```

### Run Server
```bash
node server.js
```

### Monitor Backend
The backend logs all requests, processing steps, and performance metrics. Check the **Backend Logs** panel in the UI or server console.

### Testing
Currently, no test suite is configured. Add tests with:
```bash
npm install --save-dev jest
```

## Performance Notes

- **Cold Start**: First request may take 2-3 seconds for API initialization
- **Document Processing**: ~0.5-1.5s per 500KB document depending on API latency
- **Query Processing**: ~1-2s for embedding + retrieval + LLM generation
- **Vector Search**: Pinecone queries typically complete in <100ms

## References

- [LangChain Documentation](https://js.langchain.com/)
- [Google Generative AI](https://ai.google.dev/)
- [Pinecone Vector Database](https://www.pinecone.io/)
- [RAG Concept Overview](https://www.promptingguide.ai/techniques/rag)

## License

Educational use. Modify and extend as needed for learning purposes.

## Author

Gowthamraj Srinivasa

---

**Last Updated**: October 2025
