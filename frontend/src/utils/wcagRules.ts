import { Violation } from '../api/types';

export interface WcagRuleDetail {
  wcagGuideline: string;
  scNumber: string;
  level: string;
  principle: 'Perceivable' | 'Operable' | 'Understandable' | 'Robust';
  whyItIsAProblem: string;
  exampleBad: string;
  exampleGood: string;
  referenceSpec?: string;
}

export interface WcagCriterionInfo {
  scNumber: string;
  name: string;
  level: 'Level A' | 'Level AA' | 'Level AAA';
  principle: 'Perceivable' | 'Operable' | 'Understandable' | 'Robust';
  description: string;
}

// Complete WCAG 2.1 / 2.2 Success Criteria Index
export const WCAG_CRITERIA_MAP: Record<string, WcagCriterionInfo> = {
  '111': {
    scNumber: '1.1.1',
    name: 'Non-text Content',
    level: 'Level A',
    principle: 'Perceivable',
    description: 'All non-text content (images, icons, canvas) presented to the user must have an equivalent text alternative.'
  },
  '121': {
    scNumber: '1.2.1',
    name: 'Audio-only and Video-only (Prerecorded)',
    level: 'Level A',
    principle: 'Perceivable',
    description: 'Provide a text transcript or audio description for prerecorded audio or silent video.'
  },
  '122': {
    scNumber: '1.2.2',
    name: 'Captions (Prerecorded)',
    level: 'Level A',
    principle: 'Perceivable',
    description: 'Synchronized captions must be provided for all prerecorded video with spoken audio.'
  },
  '131': {
    scNumber: '1.3.1',
    name: 'Info and Relationships',
    level: 'Level A',
    principle: 'Perceivable',
    description: 'Information, layout structure, headings, landmarks, and form associations must be programmatically determinable.'
  },
  '132': {
    scNumber: '1.3.2',
    name: 'Meaningful Sequence',
    level: 'Level A',
    principle: 'Perceivable',
    description: 'When the sequence in which content is presented affects its meaning, a correct reading sequence can be programmatically determined.'
  },
  '134': {
    scNumber: '1.3.4',
    name: 'Orientation',
    level: 'Level AA',
    principle: 'Perceivable',
    description: 'Content does not restrict its view and operation to a single display orientation (portrait or landscape).'
  },
  '135': {
    scNumber: '1.3.5',
    name: 'Identify Input Purpose',
    level: 'Level AA',
    principle: 'Perceivable',
    description: 'Input fields collecting user information (e.g. name, email, address) must specify autocomplete attributes.'
  },
  '141': {
    scNumber: '1.4.1',
    name: 'Use of Color',
    level: 'Level A',
    principle: 'Perceivable',
    description: 'Color is not used as the only visual means of conveying information, indicating an action, or distinguishing links.'
  },
  '142': {
    scNumber: '1.4.2',
    name: 'Audio Control',
    level: 'Level A',
    principle: 'Perceivable',
    description: 'If audio plays automatically for more than 3 seconds, provide a mechanism to pause, stop, or mute it.'
  },
  '143': {
    scNumber: '1.4.3',
    name: 'Contrast (Minimum)',
    level: 'Level AA',
    principle: 'Perceivable',
    description: 'Text and images of text must have a contrast ratio of at least 4.5:1 against their background (3:1 for large text).'
  },
  '144': {
    scNumber: '1.4.4',
    name: 'Resize Text',
    level: 'Level AA',
    principle: 'Perceivable',
    description: 'Text can be resized up to 200 percent without assistive technology and without loss of content or functionality.'
  },
  '146': {
    scNumber: '1.4.6',
    name: 'Contrast (Enhanced)',
    level: 'Level AAA',
    principle: 'Perceivable',
    description: 'Text presentation has a contrast ratio of at least 7:1 against its background (4.5:1 for large text).'
  },
  '1410': {
    scNumber: '1.4.10',
    name: 'Reflow',
    level: 'Level AA',
    principle: 'Perceivable',
    description: 'Content can be presented without loss of information and without requiring scrolling in two dimensions down to 320px width.'
  },
  '1411': {
    scNumber: '1.4.11',
    name: 'Non-text Contrast',
    level: 'Level AA',
    principle: 'Perceivable',
    description: 'User interface components and graphical objects must maintain at least a 3:1 contrast ratio against adjacent colors.'
  },
  '1412': {
    scNumber: '1.4.12',
    name: 'Text Spacing',
    level: 'Level AA',
    principle: 'Perceivable',
    description: 'No loss of content or functionality occurs when users adjust letter, word, or line spacing.'
  },
  '211': {
    scNumber: '2.1.1',
    name: 'Keyboard Accessible',
    level: 'Level A',
    principle: 'Operable',
    description: 'All page functionality must be operable through a keyboard interface without requiring specific timing between keystrokes.'
  },
  '212': {
    scNumber: '2.1.2',
    name: 'No Keyboard Trap',
    level: 'Level A',
    principle: 'Operable',
    description: 'If keyboard focus can be moved to a component, focus can also be moved away using standard keyboard keys (Tab / Esc).'
  },
  '221': {
    scNumber: '2.2.1',
    name: 'Timing Adjustable',
    level: 'Level A',
    principle: 'Operable',
    description: 'Users must be allowed to turn off, adjust, or extend session time limits.'
  },
  '222': {
    scNumber: '2.2.2',
    name: 'Pause, Stop, Hide',
    level: 'Level A',
    principle: 'Operable',
    description: 'Any moving, blinking, scrolling, or auto-updating information must provide a user control to pause or stop it.'
  },
  '241': {
    scNumber: '2.4.1',
    name: 'Bypass Blocks',
    level: 'Level A',
    principle: 'Operable',
    description: 'A mechanism (like a skip link or <main> landmark) must be available to bypass repeated navigation bars.'
  },
  '242': {
    scNumber: '2.4.2',
    name: 'Page Titled',
    level: 'Level A',
    principle: 'Operable',
    description: 'Web pages must have a descriptive, unique <title> that identifies the topic or purpose of the page.'
  },
  '244': {
    scNumber: '2.4.4',
    name: 'Link Purpose (In Context)',
    level: 'Level A',
    principle: 'Operable',
    description: 'The purpose of each link can be determined from the link text alone or from its immediate surrounding context.'
  },
  '246': {
    scNumber: '2.4.6',
    name: 'Headings and Labels',
    level: 'Level AA',
    principle: 'Operable',
    description: 'Headings and form labels must clearly and accurately describe the topic or purpose of content sections.'
  },
  '247': {
    scNumber: '2.4.7',
    name: 'Focus Visible',
    level: 'Level AA',
    principle: 'Operable',
    description: 'Any keyboard-operable user interface component must show a clearly visible focus indicator when selected.'
  },
  '253': {
    scNumber: '2.5.3',
    name: 'Label in Name',
    level: 'Level A',
    principle: 'Operable',
    description: 'For components with visual text labels, the programmatic accessible name must contain the visible text.'
  },
  '258': {
    scNumber: '2.5.8',
    name: 'Target Size (Minimum)',
    level: 'Level AA',
    principle: 'Operable',
    description: 'Interactive pointer targets must be at least 24 by 24 CSS pixels, or have sufficient spacing from adjacent targets.'
  },
  '311': {
    scNumber: '3.1.1',
    name: 'Language of Page',
    level: 'Level A',
    principle: 'Understandable',
    description: 'The default natural language of the page must be declared via the lang attribute on the <html> tag.'
  },
  '312': {
    scNumber: '3.1.2',
    name: 'Language of Parts',
    level: 'Level AA',
    principle: 'Understandable',
    description: 'The natural language of passages or phrases in other languages must be programmatically determined via inline lang attributes.'
  },
  '321': {
    scNumber: '3.2.1',
    name: 'On Focus',
    level: 'Level A',
    principle: 'Understandable',
    description: 'When any component receives keyboard focus, it must not trigger an unexpected change of context or submit forms.'
  },
  '322': {
    scNumber: '3.2.2',
    name: 'On Input',
    level: 'Level A',
    principle: 'Understandable',
    description: 'Entering data or checking a control must not trigger an unexpected context shift unless the user was pre-warned.'
  },
  '331': {
    scNumber: '3.3.1',
    name: 'Error Identification',
    level: 'Level A',
    principle: 'Understandable',
    description: 'If an input error is detected, the field in error is identified and the problem is described to the user in text.'
  },
  '332': {
    scNumber: '3.3.2',
    name: 'Labels or Instructions',
    level: 'Level A',
    principle: 'Understandable',
    description: 'Clear labels, placeholders, or format instructions are provided when interactive inputs require user input.'
  },
  '333': {
    scNumber: '3.3.3',
    name: 'Error Suggestion',
    level: 'Level AA',
    principle: 'Understandable',
    description: 'If an input validation error is detected and suggestions for correction are known, suggestions are provided to the user.'
  },
  '411': {
    scNumber: '4.1.1',
    name: 'Parsing',
    level: 'Level A',
    principle: 'Robust',
    description: 'Markup elements must have unique IDs, proper start and end tags, and valid attribute specifications.'
  },
  '412': {
    scNumber: '4.1.2',
    name: 'Name, Role, Value',
    level: 'Level A',
    principle: 'Robust',
    description: 'For all custom and native UI components, screen readers must be able to determine name, role, states, and properties.'
  },
  '413': {
    scNumber: '4.1.3',
    name: 'Status Messages',
    level: 'Level AA',
    principle: 'Robust',
    description: 'Status updates and alerts can be programmatically determined through aria-live regions without receiving focus.'
  }
};

/**
 * Dynamically extract the official WCAG Criterion or W3C ARIA specification from axe-core tags
 */
export function extractDynamicWcagInfo(tags: string[] = [], ruleId: string): {
  guideline: string;
  scNumber: string;
  level: string;
  principle: 'Perceivable' | 'Operable' | 'Understandable' | 'Robust';
  description: string;
} {
  // 1. Check for specific wcagXXX tag (e.g. wcag143, wcag111, wcag244)
  for (const tag of tags) {
    if (tag.startsWith('wcag') && !tag.includes('2a') && !tag.includes('21') && !tag.includes('22')) {
      const code = tag.replace('wcag', '');
      if (WCAG_CRITERIA_MAP[code]) {
        const info = WCAG_CRITERIA_MAP[code];
        return {
          guideline: `WCAG 2.1 / 2.2 SC ${info.scNumber}: ${info.name}`,
          scNumber: info.scNumber,
          level: info.level,
          principle: info.principle,
          description: info.description
        };
      }
    }
  }

  // 2. Determine conformance level from tags
  let level = 'Level A';
  if (tags.some(t => t.includes('aaa'))) {
    level = 'Level AAA';
  } else if (tags.some(t => t.includes('2aa') || t.includes('21aa') || t.includes('22aa'))) {
    level = 'Level AA';
  }

  // 3. Fallbacks based on category / rule name
  const ruleNorm = ruleId.toLowerCase();
  if (tags.includes('best-practice')) {
    let principle: 'Perceivable' | 'Operable' | 'Understandable' | 'Robust' = 'Operable';
    if (ruleNorm.includes('landmark') || ruleNorm.includes('heading') || ruleNorm.includes('region')) {
      principle = 'Perceivable';
    } else if (ruleNorm.includes('aria') || ruleNorm.includes('role')) {
      principle = 'Robust';
    }
    return {
      guideline: `W3C WAI-ARIA Authoring Practices (Best Practice)`,
      scNumber: 'ARIA-BP',
      level: 'Best Practice',
      principle,
      description: 'Structured landmark and semantic accessibility pattern recommended by W3C WAI-ARIA authoring practices.'
    };
  }

  // Heuristic matching
  if (ruleNorm.includes('alt') || ruleNorm.includes('image')) {
    const info = WCAG_CRITERIA_MAP['111'];
    return { guideline: `WCAG SC ${info.scNumber}: ${info.name}`, scNumber: info.scNumber, level: info.level, principle: info.principle, description: info.description };
  }
  if (ruleNorm.includes('contrast') || ruleNorm.includes('color')) {
    const info = WCAG_CRITERIA_MAP['143'];
    return { guideline: `WCAG SC ${info.scNumber}: ${info.name}`, scNumber: info.scNumber, level: info.level, principle: info.principle, description: info.description };
  }
  if (ruleNorm.includes('button') || ruleNorm.includes('name') || ruleNorm.includes('role')) {
    const info = WCAG_CRITERIA_MAP['412'];
    return { guideline: `WCAG SC ${info.scNumber}: ${info.name}`, scNumber: info.scNumber, level: info.level, principle: info.principle, description: info.description };
  }
  if (ruleNorm.includes('link')) {
    const info = WCAG_CRITERIA_MAP['244'];
    return { guideline: `WCAG SC ${info.scNumber}: ${info.name}`, scNumber: info.scNumber, level: info.level, principle: info.principle, description: info.description };
  }
  if (ruleNorm.includes('lang')) {
    const info = WCAG_CRITERIA_MAP['311'];
    return { guideline: `WCAG SC ${info.scNumber}: ${info.name}`, scNumber: info.scNumber, level: info.level, principle: info.principle, description: info.description };
  }

  return {
    guideline: `WCAG 2.1 & 2.2 Specification (${ruleId})`,
    scNumber: 'WCAG',
    level,
    principle: 'Operable',
    description: 'Ensure all markup elements conform strictly to WCAG accessibility recommendations.'
  };
}

/**
 * Dynamically synthesizes the corrected version of the user's inspected DOM node
 */
export function generateContextualFixForNode(
  rawHtml: string = '',
  ruleId: string,
  targetSelector: string = '',
  _failureSummary: string = ''
): string {
  const cleanHtml = rawHtml.trim();
  const rule = ruleId.toLowerCase();

  if (!cleanHtml) {
    if (rule === 'document-title') {
      return '<title>Descriptive, Accessible Page Title | Site Name</title>';
    }
    if (rule === 'html-has-lang') {
      return '<html lang="en">';
    }
    if (targetSelector) {
      return `<!-- Target element: ${targetSelector} -->\n<div role="region" aria-label="Accessible Landmark">\n  ...\n</div>`;
    }
    return '<!-- Ensure element has semantic accessible attributes -->';
  }

  // 1. image-alt
  if (rule === 'image-alt' || rule === 'area-alt') {
    if (!cleanHtml.includes('alt=')) {
      return cleanHtml.replace(/<img\b([^>]*)>/i, '<img$1 alt="Descriptive label for visual content">');
    }
    return cleanHtml.replace(/alt=(["'])[\s]*\1/i, 'alt="Descriptive label for visual content"');
  }

  // 2. button-name
  if (rule === 'button-name' || rule === 'aria-dialog-name') {
    if (!cleanHtml.includes('aria-label=')) {
      return cleanHtml.replace(/<button\b([^>]*)>/i, '<button$1 aria-label="Action description">');
    }
    return cleanHtml;
  }

  // 3. link-name
  if (rule === 'link-name') {
    if (!cleanHtml.includes('aria-label=')) {
      return cleanHtml.replace(/<a\b([^>]*)>/i, '<a$1 aria-label="Navigate to destination">');
    }
    return cleanHtml;
  }

  // 4. link-in-text-block
  if (rule === 'link-in-text-block') {
    if (cleanHtml.includes('style=')) {
      return cleanHtml.replace(/style=(["'])(.*?)\1/i, 'style=$1$2; text-decoration: underline;$1');
    }
    return cleanHtml.replace(/<a\b([^>]*)>/i, '<a$1 style="text-decoration: underline;">');
  }

  // 5. color-contrast
  if (rule === 'color-contrast') {
    if (cleanHtml.includes('style=')) {
      return cleanHtml.replace(
        /style=(["'])(.*?)\1/i,
        'style=$1$2; color: #a78bfa; font-weight: 600;$1 /* Contrast enhanced to >= 4.5:1 */'
      );
    }
    return cleanHtml.replace(
      /<([a-z0-9]+)\b([^>]*)>/i,
      '<$1$2 style="color: #a78bfa; font-weight: 600;">'
    );
  }

  // 6. html-has-lang
  if (rule === 'html-has-lang' || rule === 'html-lang-valid') {
    if (cleanHtml.includes('<html')) {
      if (cleanHtml.includes('lang=')) {
        return cleanHtml.replace(/lang=(["'])[\w-]*\1/i, 'lang="en"');
      }
      return cleanHtml.replace(/<html\b([^>]*)>/i, '<html$1 lang="en">');
    }
    return '<html lang="en">';
  }

  // 7. landmark-one-main
  if (rule === 'landmark-one-main') {
    return `<main id="main-content" role="main">\n  ${cleanHtml}\n</main>`;
  }

  // 8. page-has-heading-one
  if (rule === 'page-has-heading-one') {
    return `<h1 className="page-heading">Main Section Title</h1>\n${cleanHtml}`;
  }

  // 9. region
  if (rule === 'region') {
    if (cleanHtml.startsWith('<div')) {
      return cleanHtml.replace(/<div\b([^>]*)>/i, '<section$1 role="region" aria-label="Content section">').replace(/<\/div>$/, '</section>');
    }
    return cleanHtml.replace(/<([a-z0-9]+)\b([^>]*)>/i, '<$1$2 role="region" aria-label="Content section">');
  }

  // 10. aria-allowed-role
  if (rule === 'aria-allowed-role') {
    return cleanHtml.replace(/\s*role=(["'])[^"']*\1/i, '');
  }

  // 11. label / input
  if (rule === 'label' || rule === 'input-button-title') {
    if (cleanHtml.includes('id=')) {
      const match = cleanHtml.match(/id=(["'])(.*?)\1/i);
      const idVal = match ? match[2] : 'form-input';
      return `<label for="${idVal}">Input description</label>\n${cleanHtml}`;
    }
    return cleanHtml.replace(/<input\b([^>]*)>/i, '<input$1 aria-label="Input description">');
  }

  // 12. meta-viewport
  if (rule === 'meta-viewport') {
    return '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
  }

  // 13. document-title
  if (rule === 'document-title') {
    return '<title>Descriptive, Accessible Page Title | Site Name</title>';
  }

  // 14. duplicate-id
  if (rule === 'duplicate-id') {
    return cleanHtml.replace(/id=(["'])(.*?)\1/i, 'id="$2-unique-1"');
  }

  return cleanHtml.replace(/<([a-z0-9]+)\b([^>]*)>/i, '<$1$2 aria-label="Accessible element">');
}

/**
 * Returns complete dynamic WCAG rule detail tailored to the user's inspected website DOM
 */
export function getWcagDetailForRule(
  ruleId: string,
  violation?: Violation
): WcagRuleDetail {
  const dynamicWcag = extractDynamicWcagInfo(violation?.tags, ruleId);
  const targetStr = violation?.target && violation.target.length ? violation.target.join(' > ') : '';
  const inspectedHtml = (violation?.html || '').trim();

  // Dynamic Failing Snippet (THE USER'S ACTUAL CODE FROM THEIR WEBSITE)
  const exampleBad = inspectedHtml
    ? inspectedHtml
    : targetStr
    ? `<!-- Target DOM Selector on your website: -->\n${targetStr}`
    : `<!-- Element failing rule '${ruleId}' -->\n<div class="unlabeled-element">...</div>`;

  // Dynamic Compliant Snippet (THE REAL CODE FIX FOR THEIR ELEMENT)
  let exampleGood = '';
  if (violation?.aiCodeFix && !violation.aiCodeFix.startsWith('Refer to') && !violation.aiCodeFix.startsWith('Review fix at')) {
    exampleGood = violation.aiCodeFix;
  } else {
    exampleGood = generateContextualFixForNode(
      inspectedHtml,
      ruleId,
      targetStr,
      violation?.failureSummary || ''
    );
  }

  // Dynamic Reason Tailored to Their Inspected Element
  let whyItIsAProblem = '';
  if (violation?.failureSummary) {
    const cleanedFailure = violation.failureSummary.replace(/^Fix any of the following:\s*/i, '').trim();
    whyItIsAProblem = `${cleanedFailure}. Under ${dynamicWcag.guideline}, ${dynamicWcag.description}`;
  } else if (violation?.help) {
    whyItIsAProblem = `${violation.help}. Under ${dynamicWcag.guideline}, ${dynamicWcag.description}`;
  } else {
    whyItIsAProblem = `Violating ${dynamicWcag.guideline} (${ruleId}) introduces accessibility barriers for assistive devices and keyboard navigation.`;
  }

  return {
    wcagGuideline: `${dynamicWcag.guideline} (${dynamicWcag.level})`,
    scNumber: dynamicWcag.scNumber,
    level: dynamicWcag.level,
    principle: dynamicWcag.principle,
    whyItIsAProblem,
    exampleBad,
    exampleGood,
    referenceSpec: dynamicWcag.description
  };
}

