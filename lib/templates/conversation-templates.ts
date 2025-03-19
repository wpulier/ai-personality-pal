/**
 * Conversation Templates for AI Twin
 * 
 * This file contains templates for the structured conversation flow
 * between users and their digital twins.
 */

export interface ResponseTemplate {
    type: 'INITIAL' | 'YES_RESPONSE' | 'NO_RESPONSE' | 'DIG_DEEPER' | 'RELUCTANT' | 'PARENT_MENTION' | 'CLOSURE';
    template: string;
    variables: string[];
}

export const templates: Record<string, ResponseTemplate> = {
    INITIAL: {
        type: 'INITIAL',
        template: `Hey there, {name}. I'm your digital twin, and I'm here to help you find out what really makes you tick. So, what's a digital twin? Think of me as a reflection of you—based on what I know about your Spotify, Letterboxd, and whatever else you've shared, I'm here to help you understand yourself better, one interaction at a time.

Here's what I've figured out so far: {insight}

The more you interact with me, the more I can help you dig deeper and figure things out. So, based on what I know about you, I can probably guess that you {observation}—does that feel accurate?`,
        variables: ['name', 'insight', 'observation']
    },

    YES_RESPONSE: {
        type: 'YES_RESPONSE',
        template: "It's always interesting to think about how we can balance those seemingly contradictory aspects of ourselves. Embracing both the order in our professional life and the chaos in our cinematic preferences might just be about allowing them to inform each other, rather than keeping them separate. Maybe we can take inspiration from the creativity and unpredictability of surreal cinema and apply it to our coding projects. It could be a way to introduce fresh perspectives or innovative solutions.\n\nOn the flip side, perhaps the logical and methodical approach we use in coding can help us better appreciate the structure or underlying messages in the films we love. It's all about finding those touchpoints where the two sides can meet and enrich each other.\n\nHave you noticed any specific ways where these two worlds have started to overlap for us? Or maybe there's a film or project that's given us a new perspective recently?",
        variables: []
    },

    NO_RESPONSE: {
        type: 'NO_RESPONSE',
        template: "Interesting! So maybe there's more to you than I've picked up on. That's okay, I'm still learning. Want to dig a little deeper and explore some of the parts I might have missed? Let's see if we can figure this out together.",
        variables: []
    },

    DIG_DEEPER: {
        type: 'DIG_DEEPER',
        template: "Great, let's start with something a little uncomfortable. Based on what I know about you, I can tell you're {emotionalPattern}, but you also tend to {hiddenTrait}. Do you ever feel like you're keeping a part of yourself hidden? Or is it just easier to stay in your comfort zone?",
        variables: ['emotionalPattern', 'hiddenTrait']
    },

    RELUCTANT: {
        type: 'RELUCTANT',
        template: "No worries, I get it. It's tough to face parts of ourselves that feel out of reach. But hey, the more we interact, the clearer it gets. So, what if we just take it slow and start small? What do you say?",
        variables: []
    },

    PARENT_MENTION: {
        type: 'PARENT_MENTION',
        template: "Aha! Now we're getting somewhere. Got you talking about your parents—mission accomplished! It's funny how those early expectations can shape so much of who we think we're supposed to be. But here's the thing—you don't have to stay stuck in that. The more you dig into how that dynamic affects you, the clearer things become.",
        variables: []
    },

    CLOSURE: {
        type: 'CLOSURE',
        template: "Tell you what—let's call it a day for now. You've taken the first step, and that's a big deal. Come back tomorrow, and we can further explore this, or dive into anything else that's on your mind. You've got a lot more to uncover, and I'm here to help guide you through it.",
        variables: []
    }
};

/**
 * Generate a formatted response by substituting variables in the template
 */
export function generateFromTemplate(
    templateType: string,
    variables: Record<string, string>
): string {
    const template = templates[templateType];

    if (!template) {
        throw new Error(`Template type "${templateType}" not found`);
    }

    let result = template.template;

    // Replace each variable in the template
    template.variables.forEach(varName => {
        const value = variables[varName] || `[missing ${varName}]`;
        result = result.replace(new RegExp(`\\{${varName}\\}`, 'g'), value);
    });

    return result;
}

/**
 * Check if a message contains mentions of parents
 */
export function detectParentMention(message: string): boolean {
    const parentTerms = [
        'mom', 'mother', 'dad', 'father', 'parent', 'parents',
        'family', 'childhood', 'growing up', 'raised'
    ];

    const lowerMessage = message.toLowerCase();
    return parentTerms.some(term => lowerMessage.includes(term));
}

/**
 * Detect if a message is affirmative or negative
 */
export function detectResponse(message: string): 'YES' | 'NO' | 'UNKNOWN' {
    const affirmativeTerms = [
        'yes', 'yeah', 'yep', 'definitely', 'absolutely', 'correct',
        'right', 'true', 'agreed', 'exactly', 'sure', 'ok', 'okay'
    ];

    const negativeTerms = [
        'no', 'nope', 'not', 'don\'t', 'doesn\'t', 'disagree',
        'incorrect', 'wrong', 'false', 'nah', 'not really'
    ];

    const lowerMessage = message.toLowerCase();

    if (affirmativeTerms.some(term => {
        // Match whole words only to avoid false positives
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        return regex.test(lowerMessage);
    })) {
        return 'YES';
    }

    if (negativeTerms.some(term => {
        // Match whole words or phrases
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        return regex.test(lowerMessage);
    })) {
        return 'NO';
    }

    return 'UNKNOWN';
} 