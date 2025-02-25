import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { insertMessageSchema, messages, users } from '@/lib/db/schema';
import { streamChatResponse } from '@/lib/services/openai';
import { eq, desc } from 'drizzle-orm';
import { ZodError } from 'zod';

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
      orderBy: [desc(messages.createdAt)]
    });
    
    return NextResponse.json(userMessages);
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
      ...validatedData,
      isUser: true
    }).returning();
    
    // Get previous messages for context (limited to last 10)
    const previousMessages = await db.query.messages.findMany({
      where: eq(messages.userId, validatedData.userId),
      orderBy: [desc(messages.createdAt)],
      limit: 10
    });
    
    // Format messages for OpenAI
    const chatHistory = previousMessages.reverse().map(msg => ({
      content: msg.content,
      isUser: msg.isUser
    }));
    
    // Get user details for personality context
    const user = await db.query.users.findFirst({
      where: eq(users.id, validatedData.userId),
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Stream is not directly supported in Next.js API routes
    // For a real implementation, use a streaming response or WebSocket
    // This is a simplified example
    const aiResponse = await streamChatResponse(
      validatedData.userId, 
      validatedData.content, 
      chatHistory
    );
    
    // In a real implementation, you'd process the stream
    // Here we're just collecting the first response
    let responseText = '';
    for await (const chunk of aiResponse) {
      responseText += chunk.choices[0]?.delta?.content || '';
    }
    
    // Save the AI response
    const assistantMessage = await db.insert(messages).values({
      userId: validatedData.userId,
      content: responseText,
      isUser: false
    }).returning();
    
    return NextResponse.json({
      userMessage: userMessage[0],
      assistantMessage: assistantMessage[0]
    }, { status: 201 });
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