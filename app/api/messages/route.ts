import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { insertMessageSchema, messages, users } from '@/lib/db/schema';
import { streamChatResponse } from '@/lib/services/openai';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';

// Add a role field to the response to indicate whether a message is from user or AI
interface MessageWithRole {
  id: number;
  userId: number;
  content: string;
  createdAt: Date | string; // Allow both Date and string types
  isUser: boolean; // This is added in memory, not from the database
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    
    // Get query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    
    // Get messages for the specific user
    const userMessages = await db.query.messages.findMany({
      where: eq(messages.userId, userIdNum),
      orderBy: [messages.createdAt]
    });
    
    // Convert to MessageWithRole type
    // In our simplified approach:
    // - First message is always from the AI
    // - Then they alternate: user, AI, user, AI, etc.
    const messagesWithRole: MessageWithRole[] = userMessages.map((msg, index) => ({
      ...msg,
      isUser: index % 2 !== 0 // Even indices (0, 2, 4...) are AI messages, odd indices are user messages
    }));
    
    return NextResponse.json(messagesWithRole);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    
    // Validate the request body against the schema
    const validatedData = insertMessageSchema.parse(body);
    
    // Save the user's message
    const userMessage = await db.insert(messages).values({
      userId: validatedData.userId,
      content: validatedData.content
    }).returning();
    
    // Get previous messages for context (limited to last 10)
    const previousMessages = await db.query.messages.findMany({
      where: eq(messages.userId, validatedData.userId),
      orderBy: [messages.createdAt],
      limit: 10
    });
    
    // Format messages for OpenAI - alternate between user and AI
    const chatHistory = previousMessages.map((msg, index) => ({
      content: msg.content,
      isUser: index % 2 === 0 // Alternate, starting with user
    }));
    
    // Add the current message
    chatHistory.push({
      content: validatedData.content,
      isUser: true
    });
    
    // Get user details for personality context
    const user = await db.query.users.findFirst({
      where: eq(users.id, validatedData.userId),
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('Using twin personality for response:', user.twinPersonality);
    
    // Generate AI response
    const aiResponse = await streamChatResponse(
      validatedData.userId, 
      validatedData.content, 
      chatHistory,
      user
    );
    
    // Process the response
    let responseText = '';
    for await (const chunk of aiResponse) {
      responseText += chunk.choices[0]?.delta?.content || '';
    }
    
    // Save the AI response
    const assistantMessage = await db.insert(messages).values({
      userId: validatedData.userId,
      content: responseText
    }).returning();
    
    // Add isUser field to the response (not saved in DB)
    const responseWithRoles = {
      userMessage: { ...userMessage[0], isUser: true },
      assistantMessage: { ...assistantMessage[0], isUser: false }
    };
    
    return NextResponse.json(responseWithRoles, { status: 201 });
  } catch (error) {
    console.error('Error processing message:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
} 