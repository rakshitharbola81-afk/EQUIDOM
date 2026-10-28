const Groq = require('groq-sdk');

const groq = process.env.GROQ_API_KEY ? new Groq({
    apiKey: process.env.GROQ_API_KEY
}) : null;

// Available Groq fast reasoning models
const MODEL_CANDIDATES = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'qwen/qwen3.8-27b'
];

const enhanceViolationWithAI = async (violation) => {
    if (!groq) {
        return {
            aiExplanation: violation.help ? `${violation.help}. Assistive technologies cannot properly parse or announce this element.` : `Violation of accessibility rule '${violation.id}'.`,
            aiCodeFix: violation.helpUrl ? `Review guidance at: ${violation.helpUrl}` : "Review WCAG accessibility guidelines.",
            preventionTip: "Test components with keyboard navigation and screen readers during development.",
            effort: "Low"
        };
    }

    try {
        const rawSnippet = violation.html || (violation.target && violation.target.length ? violation.target.join(', ') : 'Not available');
        // Prevent token budget blowout: truncate overly long raw HTML snippets to 450 chars
        const snippet = rawSnippet.length > 450 ? `${rawSnippet.slice(0, 450)}...` : rawSnippet;
        const failureDetails = violation.failureSummary ? `Issue specifics: ${violation.failureSummary}` : '';

        const prompt = `
You are an expert web accessibility (WCAG 2.1 / 2.2) engineer. 
Analyze the failing HTML element and provide an actionable, concise diagnosis and code solution.

Violation Rule: ${violation.id} (${violation.impact || 'moderate'})
Description: ${violation.description}
Guidance: ${violation.help}
${failureDetails}
Failing HTML / Selector:
\`\`\`html
${snippet}
\`\`\`

Respond strictly in valid JSON format with no extra markdown text outside the JSON block:
{
    "aiExplanation": "A concise 1-2 sentence explanation of why this specific element fails accessibility and how it affects assistive technology users.",
    "aiCodeFix": "The exact corrected HTML snippet ready for drop-in replacement.",
    "preventionTip": "A practical 1-sentence developer tip to prevent this mistake.",
    "effort": "Low"
}
        `;

        let rawContent = null;
        let lastError = null;

        for (const model of MODEL_CANDIDATES) {
            try {
                const completion = await groq.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: "You are a helpful web accessibility expert that returns strictly valid JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.2,
                    max_tokens: 650
                });

                rawContent = completion.choices[0]?.message?.content?.trim();
                if (rawContent) break;
            } catch (modelErr) {
                lastError = modelErr;
                continue;
            }
        }

        if (!rawContent) {
            throw lastError || new Error("Failed to get response from Groq models");
        }
        
        // Strip code block markers if present
        if (rawContent.startsWith('```json')) {
            rawContent = rawContent.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (rawContent.startsWith('```')) {
            rawContent = rawContent.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const result = JSON.parse(rawContent);
        
        return {
            aiExplanation: result.aiExplanation || `Fails rule '${violation.id}': ${violation.description}`,
            aiCodeFix: result.aiCodeFix || (violation.helpUrl ? `Review fix at ${violation.helpUrl}` : "Update element attributes to meet WCAG standards."),
            preventionTip: result.preventionTip || "Ensure all interactive elements have semantic labels and sufficient contrast.",
            effort: result.effort || "Low"
        };

    } catch (error) {
        console.error(`AI Enhancement note for rule ${violation.id}:`, error.message);
        return {
            aiExplanation: violation.help ? `${violation.help}. Assistive technologies cannot properly parse or announce this element.` : `Violation of accessibility rule '${violation.id}'.`,
            aiCodeFix: violation.helpUrl ? `Refer to specification: ${violation.helpUrl}` : "Ensure valid HTML semantics according to WCAG 2.1 guidelines.",
            preventionTip: "Test components with keyboard navigation and screen readers during development.",
            effort: "Low"
        };
    }
};

const enhanceAllViolations = async (violations = []) => {
    // Enhance top 10 violations in parallel to respect rate limits
    const topViolations = violations.slice(0, 10);
    const remaining = violations.slice(10);

    const enhancedTop = await Promise.all(
        topViolations.map(async (v) => {
            const aiData = await enhanceViolationWithAI(v);
            return {
                ...v,
                aiExplanation: aiData.aiExplanation,
                aiCodeFix: aiData.aiCodeFix,
                preventionTip: aiData.preventionTip,
                effort: aiData.effort
            };
        })
    );

    // Provide clean fallbacks for remaining violations
    const enhancedRemaining = remaining.map(v => ({
        ...v,
        aiExplanation: v.help || v.description,
        aiCodeFix: v.helpUrl ? `Refer to: ${v.helpUrl}` : "Apply WCAG semantic corrections.",
        preventionTip: "Maintain standard HTML attributes.",
        effort: "Low"
    }));

    return [...enhancedTop, ...enhancedRemaining];
};

module.exports = { 
    enhanceViolationWithAI,
    enhanceAllViolations 
};