import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('Testing OpenAI API configuration...\n');

// Check environment variables
console.log('Environment variables check:');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');

if (!process.env.OPENAI_API_KEY) {
  console.error('\n❌ OPENAI_API_KEY is not set!');
  console.log('Please create a .env file with your OpenAI API key.');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

console.log('\n✅ OpenAI client initialized successfully');

// Test API connection
async function testConnection() {
  try {
    console.log('\nTesting API connection...');
    
    const models = await openai.models.list();
    console.log('✅ API connection successful!');
    console.log('Available models:', models.data.slice(0, 5).map(m => m.id).join(', '), '...');
    
    // Test a simple completion
    console.log('\nTesting simple completion...');
    const completion = await openai.chat.completions.create({
      model: 'openrouter/andromeda-alpha', // Use available model from the list
      messages: [{ role: 'user', content: 'Say "Hello, world!"' }],
      max_tokens: 10,
    });
    
    console.log('✅ Completion successful!');
    console.log('Response:', completion.choices[0].message.content);
    
  } catch (error) {
    console.error('\n❌ API test failed:');
    console.error('Error:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    
    if (error.status === 401) {
      console.error('\nThis is an authentication error. Please check your API key.');
    } else if (error.status === 403) {
      console.error('\nThis is a permission error. Possible causes:');
      console.error('1. Invalid API key');
      console.error('2. API key does not have access to this model');
      console.error('3. Account has insufficient credits');
      console.error('4. Model is not available on OpenRouter');
    } else if (error.status === 429) {
      console.error('\nThis is a rate limit error. Please check your quota.');
    }
    
    // Log the full error for debugging
    console.error('\nFull error details:', JSON.stringify(error, null, 2));
  }
}

testConnection();
