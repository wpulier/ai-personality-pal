/**
 * Conversation State Management for AI Twin
 * 
 * This service tracks and manages the state of conversations between users and their digital twins,
 * enabling structured conversation flows and personalized interactions.
 */

import { createClient } from '@supabase/supabase-js';
import { detectParentMention, detectResponse } from '../templates/conversation-templates';

export interface ConversationState {
    twinId: string | number;
    currentPhase: 'INITIAL' | 'YES_RESPONSE' | 'NO_RESPONSE' | 'DIGGING_DEEPER' | 'PARENT_MENTION' | 'CLOSURE';
    lastResponseType: string;
    insights: string[];
    parentMentioned: boolean;
    updatedAt: string;
}

/**
 * Get the current conversation state for a twin
 */
export async function getConversationState(twinId: string | number): Promise<ConversationState | null> {
    try {
        // Create admin client for direct database access
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Check if a state already exists
        const { data, error } = await adminClient
            .from('conversation_states')
            .select('*')
            .eq('twin_id', twinId)
            .single();

        if (error && error.code !== 'PGRST116') {  // PGRST116 is "no rows returned" error
            console.error('Error fetching conversation state:', error);
            return null;
        }

        if (data) {
            return {
                twinId,
                currentPhase: data.current_phase,
                lastResponseType: data.last_response_type,
                insights: data.insights || [],
                parentMentioned: data.parent_mentioned || false,
                updatedAt: data.updated_at
            };
        }

        // If no state exists, create an initial state
        const initialState: ConversationState = {
            twinId,
            currentPhase: 'INITIAL',
            lastResponseType: 'NONE',
            insights: [],
            parentMentioned: false,
            updatedAt: new Date().toISOString()
        };

        // Save the initial state
        const { error: insertError } = await adminClient
            .from('conversation_states')
            .insert({
                twin_id: twinId,
                current_phase: initialState.currentPhase,
                last_response_type: initialState.lastResponseType,
                insights: initialState.insights,
                parent_mentioned: initialState.parentMentioned
            });

        if (insertError) {
            console.error('Error creating initial conversation state:', insertError);
            return null;
        }

        return initialState;
    } catch (error) {
        console.error('Error in getConversationState:', error);
        return null;
    }
}

/**
 * Update the conversation state based on user message
 */
export async function updateConversationState(
    twinId: string | number,
    userMessage: string,
    currentState?: ConversationState
): Promise<ConversationState | null> {
    try {
        // Create admin client for direct database access
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Get current state if not provided
        let stateToUpdate: ConversationState;
        if (!currentState) {
            const retrievedState = await getConversationState(twinId);
            if (!retrievedState) {
                console.error(`Couldn't retrieve conversation state for twin ${twinId}`);
                return null;
            }
            stateToUpdate = retrievedState;
        } else {
            stateToUpdate = currentState;
        }

        // Detect response type
        const responseType = detectResponse(userMessage);

        // Detect parent mention
        const parentMentioned = detectParentMention(userMessage) || stateToUpdate.parentMentioned;

        // Determine next phase based on current phase and response type
        let nextPhase = stateToUpdate.currentPhase;

        switch (stateToUpdate.currentPhase) {
            case 'INITIAL':
                nextPhase = responseType === 'YES' ? 'YES_RESPONSE' : 'NO_RESPONSE';
                break;
            case 'YES_RESPONSE':
            case 'NO_RESPONSE':
                nextPhase = 'DIGGING_DEEPER';
                break;
            case 'DIGGING_DEEPER':
                if (parentMentioned) {
                    nextPhase = 'PARENT_MENTION';
                }
                break;
            case 'PARENT_MENTION':
                nextPhase = 'CLOSURE';
                break;
            default:
                // If in an unknown state, reset to initial
                nextPhase = 'INITIAL';
        }

        // Update the state
        const newState: ConversationState = {
            twinId,
            currentPhase: nextPhase,
            lastResponseType: responseType,
            insights: stateToUpdate.insights,
            parentMentioned,
            updatedAt: new Date().toISOString()
        };

        // Save to database
        const { error: updateError } = await adminClient
            .from('conversation_states')
            .update({
                current_phase: newState.currentPhase,
                last_response_type: newState.lastResponseType,
                insights: newState.insights,
                parent_mentioned: newState.parentMentioned,
                updated_at: newState.updatedAt
            })
            .eq('twin_id', twinId);

        if (updateError) {
            console.error('Error updating conversation state:', updateError);
            return null;
        }

        return newState;
    } catch (error) {
        console.error('Error in updateConversationState:', error);
        return null;
    }
}

/**
 * Reset the conversation state for a twin (for testing or troubleshooting)
 */
export async function resetConversationState(twinId: string | number): Promise<boolean> {
    try {
        // Create admin client for direct database access
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Delete existing state
        const { error } = await adminClient
            .from('conversation_states')
            .delete()
            .eq('twin_id', twinId);

        if (error) {
            console.error('Error resetting conversation state:', error);
            return false;
        }

        // Create new initial state
        const { error: insertError } = await adminClient
            .from('conversation_states')
            .insert({
                twin_id: twinId,
                current_phase: 'INITIAL',
                last_response_type: 'NONE',
                insights: [],
                parent_mentioned: false
            });

        if (insertError) {
            console.error('Error creating new conversation state:', insertError);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in resetConversationState:', error);
        return false;
    }
} 