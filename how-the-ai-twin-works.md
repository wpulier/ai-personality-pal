# How the AI Twin Works

## Overview
The AI twin is a digital version of yourself that learns from your preferences, interests, and conversation style. It uses your data from services like Spotify and Letterboxd to create a personalized experience.

## Three Main Scenarios

### 1. Creating Your Twin
When you create your twin, here's what happens:

1. **Data Collection**:
   - You provide your bio and optionally connect your Spotify and Letterboxd accounts
   - The system collects your music preferences, favorite films, and other interests

2. **Personality Generation**:
   - The system analyzes your data to create a basic personality profile
   - This includes your interests, communication style, and preferences
   - The personality is stored in the database and will evolve as you chat

### 2. First Message
When you first start chatting with your twin:

1. **Initial Greeting**:
   - The twin introduces itself using your name
   - It shares what it knows about you from your profile
   - It makes some initial observations based on your preferences

2. **Message Generation**:
   - The system uses a special template for the first message
   - It includes your name, interests, and preferences
   - The message is saved in the conversation history

### 3. Normal Conversations
During regular chats:

1. **Context Management**:
   - The system keeps track of your last 10 messages
   - It uses this context to maintain conversation flow
   - Every 10 messages, it updates the conversation analysis

2. **Response Generation**:
   - The twin uses your personality profile and conversation history
   - It maintains your communication style and preferences
   - Responses are generated in real-time and streamed to you

3. **Analysis Updates**:
   - After every 10 messages, the system analyzes:
     - Topics you frequently discuss
     - Your response patterns
     - Common conversation themes
   - This analysis helps the twin better understand your communication style

## Technical Details (For Developers)

### APIs Used
- OpenAI GPT-4 for conversation generation
- Supabase for data storage
- Spotify API for music preferences
- Letterboxd API for film preferences

### System Prompts
The system uses different prompts for different scenarios:
1. **First Message**: A template-based prompt that introduces the twin
2. **Normal Conversations**: A dynamic prompt that includes:
   - Your personality profile
   - Recent conversation history
   - Your preferences and interests

### Context Management
- Recent messages (last 10) are used for immediate context
- Personality profile is updated based on conversation patterns
- Analysis is generated every 10 messages to track patterns

### Data Storage
- Messages are stored in a Supabase database
- Personality data is updated regularly
- Conversation analysis is stored with the twin's profile
