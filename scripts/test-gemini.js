// Try to load .env.local first (Next.js convention), then fall back to .env
const fs = require('fs');
const path = require('path');

let envFile = null;
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
  envFile = '.env.local';
  console.log('📁 Loaded environment from .env.local\n');
} else if (fs.existsSync('.env')) {
  require('dotenv').config({ path: '.env' });
  envFile = '.env';
  console.log('📁 Loaded environment from .env\n');
} else {
  console.error('❌ Error: Neither .env.local nor .env file found');
  console.log('\nPlease create a .env or .env.local file with:');
  console.log('  GOOGLE_GEMINI_API_KEY=your_api_key_here');
  console.log('  or');
  console.log('  GOOGLE_API_KEY=your_api_key_here');
  process.exit(1);
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('🔍 Testing Google Gemini API in isolation...\n');

// Check for API key (supporting both possible env var names)
const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error(`❌ Error: GOOGLE_GEMINI_API_KEY or GOOGLE_API_KEY not found in ${envFile}`);
  console.log(`\nPlease ensure your ${envFile} file contains one of:`);
  console.log('  GOOGLE_GEMINI_API_KEY=your_api_key_here');
  console.log('  GOOGLE_API_KEY=your_api_key_here');
  process.exit(1);
}

// Log first 4 characters for verification (masking the rest)
const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
console.log(`✅ API Key found: ${maskedKey}`);
console.log(`   Key length: ${apiKey.length} characters\n`);

// Initialize the Gemini client
console.log('📡 Initializing GoogleGenerativeAI client...');
let genAI;
try {
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('✅ Client initialized successfully\n');
} catch (error) {
  console.error('❌ Failed to initialize client:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}

// First, discover available models by calling ListModels API
async function listAvailableModels() {
  console.log('🔍 Fetching list of available models from Google API...\n');
  
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch models list: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    console.log(`✅ Found ${models.length} available models:\n`);
    
    // Filter models that support generateContent
    const generateContentModels = models.filter(model => {
      const methods = model.supportedGenerationMethods || [];
      return methods.includes('generateContent');
    });
    
    console.log(`📝 Models supporting generateContent (${generateContentModels.length}):`);
    generateContentModels.forEach(model => {
      console.log(`   - ${model.name}`);
      if (model.displayName) {
        console.log(`     Display: ${model.displayName}`);
      }
    });
    
    // Extract just the model names (without "models/" prefix)
    const modelNames = generateContentModels.map(model => {
      // Model name is typically like "models/gemini-1.5-flash" - extract just "gemini-1.5-flash"
      return model.name.replace('models/', '');
    });
    
    return modelNames;
  } catch (error) {
    console.error('❌ Error fetching models list:', error.message);
    return null;
  }
}

async function testModel(modelName) {
  console.log(`\n🧪 Testing model: ${modelName}`);
  console.log('─'.repeat(50));
  
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    console.log(`✅ Model instance created: ${modelName}`);
    
    console.log('📤 Sending test request: "Test"');
    const result = await model.generateContent('Test');
    const response = await result.response;
    const text = response.text();
    
    console.log(`✅ SUCCESS! Model ${modelName} responded:`);
    console.log(`   Response: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    return { success: true, modelName, response: text };
  } catch (error) {
    console.error(`❌ FAILED for model ${modelName}:`);
    console.error(`   Error Type: ${error.constructor.name}`);
    console.error(`   Error Message: ${error.message}`);
    
    // Check for specific error properties
    if (error.status) {
      console.error(`   HTTP Status: ${error.status}`);
    }
    if (error.statusText) {
      console.error(`   Status Text: ${error.statusText}`);
    }
    
    return { success: false, modelName, error: error.message };
  }
}

// Run tests
async function runTests() {
  // First, try to get the list of available models
  const availableModels = await listAvailableModels();
  
  let modelsToTest;
  if (availableModels && availableModels.length > 0) {
    console.log(`\n✅ Will test ${availableModels.length} discovered models\n`);
    modelsToTest = availableModels;
  } else {
    console.log('\n⚠️  Could not fetch available models, falling back to common model names\n');
    // Fallback to common model names
    modelsToTest = [
      'gemini-1.5-flash-001',
      'gemini-1.5-flash',
      'gemini-1.5-pro-001',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-1.0-pro',
    ];
  }
  
  console.log(`🚀 Starting tests with ${modelsToTest.length} models...\n`);
  
  const results = [];
  for (const modelName of modelsToTest) {
    const result = await testModel(modelName);
    results.push(result);
    
    // If one succeeds, stop testing
    if (result.success) {
      console.log(`\n✅ Found working model: ${modelName}. Stopping tests.`);
      break;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`\n✅ Successful models (${successful.length}):`);
    successful.forEach(r => console.log(`   - ${r.modelName}`));
    console.log(`\n💡 Use this model in your code: ${successful[0].modelName}`);
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed models (${failed.length}):`);
    failed.slice(0, 3).forEach(r => console.log(`   - ${r.modelName}`));
    if (failed.length > 3) {
      console.log(`   ... and ${failed.length - 3} more`);
    }
  }
  
  if (successful.length === 0) {
    console.log('\n⚠️  No models worked. Please check:');
    console.log('   1. API key is valid and has proper permissions');
    console.log('   2. Check Google AI Studio: https://aistudio.google.com');
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Unexpected error during test execution:');
  console.error(error);
  process.exit(1);
});
