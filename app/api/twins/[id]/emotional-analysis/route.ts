import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function POST(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const { id } = context.params;
        const twinId = parseInt(id);

        // Create admin client
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Get recent messages
        const { data: messages, error: messagesError } = await adminClient
            .from('messages')
            .select('*')
            .eq('twin_id', twinId)
            .order('created_at', { ascending: true })
            .limit(50);

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
        }

        // Get twin data
        const { data: twin, error: twinError } = await adminClient
            .from('twins')
            .select('*')
            .eq('id', twinId)
            .single();

        if (twinError || !twin) {
            console.error('Twin not found:', twinError);
            return NextResponse.json({ error: 'Twin not found' }, { status: 404 });
        }

        // Create analysis prompt
        const prompt = `Analyze the following conversation between a user and their digital twin. Focus ONLY on observable patterns in the conversation, not psychological interpretations.

Messages (in chronological order):
${messages.map(m => `${m.is_user ? 'User' : 'Twin'}: ${m.content}`).join('\n')}

Based on these messages, identify:
1. Most frequently discussed topics (with exact count of occurrences)
2. Response length patterns (e.g., "Typically gives brief responses to technical questions", with count of observations)
3. Common response types (e.g., "Often asks follow-up questions", with count of occurrences)

IMPORTANT:
- Only include patterns that appear at least once in the actual messages
- For each pattern, provide the exact number of times it was observed
- Do not make psychological interpretations or assumptions
- Base everything on concrete evidence from the messages
- If a pattern appears only once, mark it as a single observation

Format your response as a JSON object with these fields:
{
  "conversationPatterns": [
    { "topic": "string", "frequency": number }
  ],
  "topicPreferences": [
    { "pattern": "string", "frequency": number }
  ],
  "responseStyles": [
    { "type": "string", "frequency": number }
  ]
}`;

        // Generate analysis
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 1000
        });

        const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');

        // Update twin's personality data
        const { error: updateError } = await adminClient
            .from('twins')
            .update({
                twin_personality: {
                    ...twin.twin_personality,
                    ...analysis,
                    lastUpdated: new Date().toISOString()
                }
            })
            .eq('id', twinId);

        if (updateError) {
            console.error('Error updating twin personality:', updateError);
            return NextResponse.json({ error: 'Failed to update twin personality' }, { status: 500 });
        }

        return NextResponse.json(analysis);
    } catch (error) {
        console.error('Error in emotional analysis:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 