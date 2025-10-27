# 🚀 AI Interactive Experiment Platform

> An AI-powered interactive experiment generation platform with Perplexity MCP integration for real-time knowledge retrieval and intelligent code generation

## 📖 Project Overview

This is an innovative AI-driven platform that allows users to generate interactive HTML/CSS/JavaScript experiments through natural language descriptions. The platform integrates OpenAI GPT models and Perplexity MCP client to retrieve real-time knowledge and generate high-quality interactive content.

### 🎯 Core Features

- **Intelligent Conversation Generation**: Natural language interaction powered by OpenAI GPT
- **Real-time Knowledge Retrieval**: Integrated Perplexity MCP protocol for latest information
- **Interactive Experiment Generation**: Automatically generates runnable HTML/CSS/JavaScript code
- **Code Quality Assurance**: Automatic JavaScript syntax validation and repair
- **Streaming Response**: Real-time display of generation process for enhanced user experience

## 🛠️ Technology Stack

### Frontend Technologies
- **React 18** - Modern frontend framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern icon library
- **React Router DOM** - Client-side routing
- **Zustand** - Lightweight state management

### Backend Technologies
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Server-side type safety
- **Nodemon** - Auto-restart during development
- **CORS** - Cross-origin resource sharing

### Database & Storage
- **Supabase** - Open-source Firebase alternative
- **PostgreSQL** - Relational database (via Supabase)

### AI Integration
- **OpenAI API** - GPT model integration
- **Model Context Protocol (MCP)** - AI model context protocol
- **Perplexity MCP Client** - Real-time knowledge retrieval

### Development Tools
- **ESLint** - Code quality checking
- **Concurrently** - Run multiple commands in parallel
- **Zod** - Runtime type validation

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Express Backend│    │  Perplexity     │
│   TypeScript    │◄──►│   TypeScript     │◄──►│  MCP Client     │
│   Tailwind CSS │    │   Node.js        │    │  Knowledge API  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   OpenAI API     │
                       │   GPT Models     │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Supabase       │
                       │   PostgreSQL     │
                       └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **pnpm** (recommended) or npm
- **Supabase** account
- **OpenAI API** key

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/your-username/hackathone2.git
cd hackathone2
```

2. **Install dependencies**
```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

3. **Environment setup**
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your API keys
```

**Environment variables explanation:**
```env
# OpenRouter API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://openrouter.ai/api/v1

# Server Configuration
PORT=8769

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. **Database setup**

Use the Supabase CLI to apply the migrations shipped with this repository:

```bash
supabase db push
```

This command creates all required tables (including `messages`, `surveys`, and `user_profiles`), indexes, and triggers. If you already ran an earlier migration that removed `user_profiles`, ensure you apply the latest migrations so the table is restored.

5. **Start development servers**
```bash
# Start both frontend and backend
pnpm dev

# Or start separately
pnpm client:dev  # Frontend: http://localhost:5173
pnpm server:dev  # Backend: http://localhost:8769
```

## 📱 Usage Guide

### Basic Usage Flow

1. **Access the app**: Open your browser and visit `http://localhost:5173`
2. **Start conversation**: Describe the experiment or functionality you want in the input box
3. **View generation**: AI will generate responses and interactive experiments in real-time
4. **Experience experiments**: Click the "View Interactive Demo" button to experience generated experiments
5. **Continue conversation**: You can continue asking questions or request modifications

### Example Prompts

```
Create a simple calculator with basic arithmetic operations

Make a colorful particle animation effect

Create a todo list that can add, delete, and mark items as complete

Design a responsive card layout showcase
```

## 🔧 API Endpoints

### Conversation Management
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id/messages` - Get conversation messages

### Message Processing
- `POST /api/messages` - Send message (supports streaming response)
- `GET /api/messages/:id` - Get specific message

### Experiment Management
- `POST /api/experiments/generate` - Generate experiment
- `GET /api/experiments/:id` - Get experiment details

## 🧪 Development & Testing

### Code Quality Checks
```bash
# TypeScript type checking
pnpm check

# ESLint code quality check
pnpm lint
```

### Build Project
```bash
# Build production version
pnpm build

# Preview build result
pnpm preview
```

## 📦 Deployment

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy to Vercel**
```bash
vercel --prod
```

3. **Configure environment variables**
Set the same environment variables in the Vercel console.

### Other Deployment Platforms

The project supports deployment to any Node.js-compatible platform, such as:
- **Netlify**
- **Railway**
- **Render**
- **Heroku**

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** - For providing powerful GPT models
- **Perplexity AI** - For real-time knowledge retrieval services
- **Supabase** - For modern database solutions
- **Vercel** - For excellent deployment platform

---

**Built with ❤️ - Showcasing the future of AI-driven interactive content generation!**
