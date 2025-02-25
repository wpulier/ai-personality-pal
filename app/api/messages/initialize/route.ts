import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { streamChatResponse } from '@/lib/services/openai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Schema for initialization request
const initializeSchema = z.object({
  userId: z.number().int().positive(),
  systemPrompt: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    
    // Validate the request
    const validatedData = initializeSchema.parse(body);
    
    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, validatedData.userId),
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`Initializing conversation for user ${validatedData.userId} with system prompt`);
    
    // Create a fake chat history just for prompting purposes
    // This won't be saved to the database
    const fakeHistory = [{
      content: validatedData.systemPrompt,
      isUser: true
    }];
    
    // Generate AI response directly without saving a user message
    const aiResponse = await streamChatResponse(
      validatedData.userId,
      validatedData.systemPrompt,
      fakeHistory,
      user
    );
    
    // Process the response
    let responseText = '';
    for await (const chunk of aiResponse) {
      responseText += chunk.choices[0]?.delta?.content || '';
    }
    
    console.log(`Generated AI response: ${responseText.substring(0, 50)}...`);
    
    // Save ONLY the AI response as the first message in the conversation
    const assistantMessage = await db.insert(messages).values({
      userId: validatedData.userId,
      content: responseText
    }).returning();
    
    return NextResponse.json({
      success: true,
      message: 'Conversation initialized successfully',
      assistantMessage: {
        ...assistantMessage[0],
        isUser: false
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error initializing conversation:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 