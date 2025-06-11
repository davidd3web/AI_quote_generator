// app/api/generate-quote/route.ts
import { quoteFormSchema } from '@/lib/validators'; // Adjust path if necessary
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// --- Heuristics for AI Output (as before) ---
const unhelpfulResponseIndicators = [
    "i cannot create a quote", "i'm unable to generate", "i am unable to generate",
    "i'm sorry, i can't", "i am sorry, i cannot", "not possible to provide a quote",
    "cannot provide a quote for that", "i do not understand the request",
    "could not generate a quote", "unable to create a quote"
];

function isAiOutputUnhelpful(text: string): boolean {
    const lowercasedText = text.toLowerCase();
    for (const indicator of unhelpfulResponseIndicators) {
        if (lowercasedText.includes(indicator)) return true;
    }
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 4 && text.length < 30) return true;
    if (text.length > 10) {
        const alphanumericChars = text.replace(/[^a-zA-Z0-9]/g, "").length;
        const totalCharsExcludingSpaces = text.replace(/\s/g, "").length;
        if (totalCharsExcludingSpaces > 0 && (alphanumericChars / totalCharsExcludingSpaces) < 0.3) {
            return true;
        }
    }
    return false;
}

// --- New Heuristics for User Input Gibberish Detection ---
function isInputLikelyGibberish(text: string, fieldName: string): string | null {
    if (!text || text.trim().length === 0) {
        return null; // Not gibberish if empty (Zod handles required)
    }

    const normalizedText = text.toLowerCase().trim();

    // 1. Check for very short input that isn't a common word (relevant for 'tone')
    if (fieldName === 'tone' && normalizedText.length < 3 && !['sad', 'mad', 'fun', 'joy', 'awe', 'dry'].includes(normalizedText)) {
         // Allow some short, common tone words
    } else if (normalizedText.length < 3) { // For quoteType, less than 3 is too short.
         return `The ${fieldName} you entered ("${text}") is too short to be meaningful.`;
    }


    // 2. Vowel to Alphabetic Character Ratio (for longer strings)
    const alphaChars = normalizedText.replace(/[^a-z]/g, '');
    if (alphaChars.length > 3) { // Only apply to strings with enough letters
        const vowels = alphaChars.match(/[aeiou]/g);
        const vowelCount = vowels ? vowels.length : 0;
        if (alphaChars.length > 0 && (vowelCount / alphaChars.length < 0.15)) { // Less than 15% vowels
            return `The ${fieldName} you entered ("${text}") seems to contain too few vowels to form recognizable words.`;
        }
    } else if (alphaChars.length > 0 && !alphaChars.match(/[aeiouy]/g)) {
        // Short string with no vowels at all (e.g. "rhythm" is fine due to 'y')
         return `The ${fieldName} you entered ("${text}") appears to be missing vowels.`;
    }


    // 3. Consecutive Consonants
    const consecutiveConsonants = alphaChars.match(/[^aeiou]{5,}/g); // 5 or more consecutive consonants
    if (consecutiveConsonants) {
        return `The ${fieldName} you entered ("${text}") contains sequences of letters that are unlikely in real words (e.g., many consonants together).`;
    }

    // 4. Repetitive character sequences (e.g., "aaaaa", "abcabcabc")
    if (/(.)\1{4,}/.test(normalizedText)) { // 5 or more identical characters in a row
        return `The ${fieldName} you entered ("${text}") contains highly repetitive characters.`;
    }
    if (normalizedText.length > 8) { // Check for repeating patterns in longer strings
        const half = Math.floor(normalizedText.length / 2);
        const firstHalf = normalizedText.substring(0, half);
        if (normalizedText.substring(half).startsWith(firstHalf) && firstHalf.length > 2) {
             return `The ${fieldName} you entered ("${text}") appears to be a repetitive pattern.`;
        }
    }
    
    // 5. Check if it consists only of punctuation or symbols (after Zod says it's a string)
    if (/^[^\w\s]+$/.test(normalizedText) && normalizedText.length > 1) { // More than 1 char and all are non-word, non-space
        return `The ${fieldName} ("${text}") appears to consist only of symbols. Please use words.`;
    }


    return null; // No gibberish detected
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Step 1: Zod validation (structural)
        const validatedData = quoteFormSchema.parse(body);
        const { famousPerson, tone, quoteType } = validatedData;

        // Step 2: Gibberish check for user inputs 'tone' and 'quoteType'
        if (tone) { // Tone is optional, so only check if provided
            const toneGibberishError = isInputLikelyGibberish(tone, "tone");
            if (toneGibberishError) {
                console.warn("Input 'tone' deemed gibberish:", tone, "Error:", toneGibberishError);
                return NextResponse.json({ message: toneGibberishError }, { status: 400 });
            }
        }

        const quoteTypeGibberishError = isInputLikelyGibberish(quoteType, "quote description"); // quoteType is required
        if (quoteTypeGibberishError) {
            console.warn("Input 'quoteType' deemed gibberish:", quoteType, "Error:", quoteTypeGibberishError);
            return NextResponse.json({ message: quoteTypeGibberishError }, { status: 400 });
        }

        // Step 3: Construct prompt (if inputs are okay)
        let prompt = `Generate a quote about: "${quoteType}".`;
        if (tone) {
            prompt += ` The tone should be ${tone}.`;
        }
        if (famousPerson) {
            prompt += ` The quote should sound as if it were written or said by ${famousPerson}.`;
        }
        prompt += "\n\nQuote:"; 

        console.log("Generated Prompt for AI:", prompt);

        // Step 4: Call Gemini API
        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        const apiKey = process.env.GEMINI_API_KEY; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorResult = await geminiResponse.json();
            console.error("Gemini API Error:", errorResult);
            let errorMessage = "Failed to generate quote from AI service.";
            if (errorResult.error && errorResult.error.message) {
                errorMessage = errorResult.error.message;
            }
            return NextResponse.json({ message: errorMessage }, { status: geminiResponse.status });
        }

        const result = await geminiResponse.json();
        let generatedText = "Could not extract quote from AI response."; 

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            generatedText = result.candidates[0].content.parts[0].text.trim();
        } else {
            console.warn("Unexpected Gemini API response structure:", result);
        }

        // Step 5: Check if the AI's output itself is unhelpful (as before)
        if (isAiOutputUnhelpful(generatedText)) {
            console.warn("AI response deemed unhelpful/gibberish:", generatedText);
            return NextResponse.json({ 
                message: "The AI couldn't generate a meaningful quote for this input. Please try a more descriptive or different request." 
            }, { status: 400 });
        }
        
        return NextResponse.json({ quote: generatedText });

    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation Error:", error.errors);
            return NextResponse.json({ message: "Invalid input.", errors: error.flatten().fieldErrors }, { status: 400 });
        }
        console.error("Internal Server Error:", error);
        return NextResponse.json({ message: "An internal server error occurred." }, { status: 500 });
    }
}
