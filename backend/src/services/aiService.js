const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const enhanceViolationWithAI = async (violation) => {
    try {
        const prompt = `
You are an expert web accessibility (WCAG) and full-stack engineer. 
Analyze the failing HTML snippet and return a structured JSON response.

Violation Rule ID: ${violation.id}
Description: ${violation.description}
Help text: ${violation.help}
Failing HTML:
\`\`\`html
${violation.originalSnippet || 'Target selector: ' + violation.target.join(', ')}
\`\`\`

Respond strictly in valid JSON format with no extra markdown text outside the JSON block, structured like this:
{
    "aiExplanation": "A concise 1-2 sentence explanation of why this fails accessibility.",
    "aiCodeFix": "The exact corrected HTML snippet ready for one-click replacement.",
    "preventionTip": "A quick best-practice rule so developers don't make this mistake again.",
    "effort": "Low"
}
        `;

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "You are a helpful coding assistant that returns strictly valid JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 400
        });

        let rawContent = completion.choices[0].message.content.trim();
        
        // 🛡️ Safe JSON extraction: strip markdown wrappers if the model includes them
        if (rawContent.startsWith('```json')) {
            rawContent = rawContent.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (rawContent.startsWith('```')) {
            rawContent = rawContent.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const result = JSON.parse(rawContent);
        
        return {
            aiExplanation: result.aiExplanation || "Review WCAG guidelines for this element.",
            aiCodeFix: result.aiCodeFix || "Update HTML attributes to comply with standards.",
            preventionTip: result.preventionTip || "Always include semantic accessibility attributes.",
            effort: result.effort || "Low"
        };

    } catch (error) {
        // 🔍 This will print the exact reason Groq failed in your terminal
        console.error(`❌ AI Enhancement failed for rule ${violation.id}:`, error.message);
        return {
            aiExplanation: `AI Error: ${error.message}`,
            aiCodeFix: "Please refer to official documentation.",
            preventionTip: "Check WCAG documentation.",
            effort: "Low"
        };
    }
};



module.exports = { enhanceAllViolations };