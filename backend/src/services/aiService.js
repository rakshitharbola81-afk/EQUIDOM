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

const generateDeterministicFix = (violation) => {
    const rawHtml = (violation.html || '').trim();
    const ruleId = (violation.id || '').toLowerCase();
    const target = (violation.target && violation.target.length ? violation.target.join(' > ') : '');

    if (!rawHtml) {
        if (ruleId === 'document-title') {
            return '<title>Descriptive, Accessible Page Title</title>';
        }
        if (ruleId === 'html-has-lang') {
            return '<html lang="en">';
        }
        if (target) {
            return `<!-- Wrap or update target: ${target} -->\n<div role="region" aria-label="Accessible Content Section">\n  ...\n</div>`;
        }
        return '<!-- Add accessible label and semantic attributes -->';
    }

    // 1. image-alt
    if (ruleId === 'image-alt' || ruleId === 'area-alt') {
        if (!rawHtml.includes('alt=')) {
            return rawHtml.replace(/<img\b([^>]*)>/i, '<img$1 alt="Descriptive label for visual content">');
        }
        return rawHtml.replace(/alt=(["'])[\s]*\1/i, 'alt="Descriptive label for visual content"');
    }

    // 2. button-name
    if (ruleId === 'button-name' || ruleId === 'aria-dialog-name') {
        if (!rawHtml.includes('aria-label=')) {
            return rawHtml.replace(/<button\b([^>]*)>/i, '<button$1 aria-label="Perform action">');
        }
        return rawHtml;
    }

    // 3. link-name
    if (ruleId === 'link-name') {
        if (!rawHtml.includes('aria-label=')) {
            return rawHtml.replace(/<a\b([^>]*)>/i, '<a$1 aria-label="Navigate to destination">');
        }
        return rawHtml;
    }

    // 4. link-in-text-block
    if (ruleId === 'link-in-text-block') {
        if (rawHtml.includes('style=')) {
            return rawHtml.replace(/style=(["'])(.*?)\1/i, 'style=$1$2; text-decoration: underline;$1');
        }
        return rawHtml.replace(/<a\b([^>]*)>/i, '<a$1 style="text-decoration: underline;">');
    }

    // 5. color-contrast
    if (ruleId === 'color-contrast') {
        if (rawHtml.includes('style=')) {
            return rawHtml.replace(/style=(["'])(.*?)\1/i, 'style=$1$2; color: #0f172a; background-color: #ffffff;$1 /* 14.5:1 ratio */');
        }
        return rawHtml.replace(/<([a-z0-9]+)\b([^>]*)>/i, '<$1$2 style="color: #0f172a; background-color: #ffffff;">');
    }

    // 6. html-has-lang
    if (ruleId === 'html-has-lang' || ruleId === 'html-lang-valid') {
        if (rawHtml.includes('<html')) {
            if (rawHtml.includes('lang=')) {
                return rawHtml.replace(/lang=(["'])[\w-]*\1/i, 'lang="en"');
            }
            return rawHtml.replace(/<html\b([^>]*)>/i, '<html$1 lang="en">');
        }
        return '<html lang="en">';
    }

    // 7. landmark-one-main
    if (ruleId === 'landmark-one-main') {
        return `<main id="main-content" role="main">\n  ${rawHtml}\n</main>`;
    }

    // 8. page-has-heading-one
    if (ruleId === 'page-has-heading-one') {
        return `<h1 class="page-title">Main Content Heading</h1>\n${rawHtml}`;
    }

    // 9. region
    if (ruleId === 'region') {
        if (rawHtml.startsWith('<div')) {
            return rawHtml.replace(/<div\b([^>]*)>/i, '<section$1 role="region" aria-label="Content section">').replace(/<\/div>$/, '</section>');
        }
        return rawHtml.replace(/<([a-z0-9]+)\b([^>]*)>/i, '<$1$2 role="region" aria-label="Meaningful landmark">');
    }

    // 10. aria-allowed-role
    if (ruleId === 'aria-allowed-role') {
        return rawHtml.replace(/\s*role=(["'])[^"']*\1/i, '');
    }

    // 11. label / input
    if (ruleId === 'label' || ruleId === 'input-button-title') {
        if (rawHtml.includes('id=')) {
            const idMatch = rawHtml.match(/id=(["'])(.*?)\1/i);
            const idVal = idMatch ? idMatch[2] : 'form-input';
            return `<label for="${idVal}">Input description</label>\n${rawHtml}`;
        }
        return rawHtml.replace(/<input\b([^>]*)>/i, '<input$1 aria-label="Form field description">');
    }

    // 12. meta-viewport
    if (ruleId === 'meta-viewport') {
        return '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    }

    // 13. document-title
    if (ruleId === 'document-title') {
        return '<title>Descriptive, Accessible Page Title | Site Name</title>';
    }

    // 14. duplicate-id
    if (ruleId === 'duplicate-id') {
        return rawHtml.replace(/id=(["'])(.*?)\1/i, 'id="$2-unique-1"');
    }

    // Default fallback: inject aria-label
    return rawHtml.replace(/<([a-z0-9]+)\b([^>]*)>/i, '<$1$2 aria-label="Accessible element">');
};

const enhanceViolationWithAI = async (violation) => {
    const fallbackFix = generateDeterministicFix(violation);
    const fallbackExplanation = violation.help 
        ? `${violation.help}. Assistive technologies cannot properly parse or announce this element.` 
        : `Violation of accessibility rule '${violation.id}'.`;

    if (!groq) {
        return {
            aiExplanation: fallbackExplanation,
            aiCodeFix: fallbackFix,
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
Analyze the failing HTML element from the user's website and provide an actionable, concise diagnosis and code solution directly fixing their element.

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
    "aiCodeFix": "The exact corrected HTML snippet of the element ready for drop-in replacement.",
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
        
        const validFix = (result.aiCodeFix && !result.aiCodeFix.startsWith('Review fix at') && !result.aiCodeFix.startsWith('Refer to'))
            ? result.aiCodeFix
            : fallbackFix;

        return {
            aiExplanation: result.aiExplanation || `Fails rule '${violation.id}': ${violation.description}`,
            aiCodeFix: validFix,
            preventionTip: result.preventionTip || "Ensure all interactive elements have semantic labels and sufficient contrast.",
            effort: result.effort || "Low"
        };

    } catch (error) {
        console.error(`AI Enhancement note for rule ${violation.id}:`, error.message);
        return {
            aiExplanation: fallbackExplanation,
            aiCodeFix: fallbackFix,
            preventionTip: "Test components with keyboard navigation and screen readers during development.",
            effort: "Low"
        };
    }
};

const enhanceAllViolations = async (violations = []) => {
    // Enhance top 10 violations with Groq LLM in parallel
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

    // Provide contextual rule-based deterministic fixes for all remaining violations
    const enhancedRemaining = remaining.map(v => {
        const detFix = generateDeterministicFix(v);
        return {
            ...v,
            aiExplanation: v.help ? `${v.help}. Assistive technologies cannot properly parse or announce this element.` : v.description,
            aiCodeFix: detFix,
            preventionTip: "Maintain standard HTML attributes and accessible semantic structure.",
            effort: "Low"
        };
    });

    return [...enhancedTop, ...enhancedRemaining];
};

module.exports = { 
    enhanceViolationWithAI,
    enhanceAllViolations 
};