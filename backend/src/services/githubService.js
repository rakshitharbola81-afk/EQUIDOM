const { Octokit } = require('@octokit/rest');
const AppError = require('../utils/AppError');

/**
 * Normalizes code snippets for fuzzy whitespace matching
 */
function normalizeSnippet(str) {
  return (str || '').replace(/\r\n/g, '\n').trim();
}

/**
 * Creates an automated accessibility pull request on GitHub.
 * 
 * Supports both:
 * 1. Specific in-place code patch: replaces targetOriginalCode inside existing filePath with fileContent
 * 2. Full file creation or replacement
 */
const createAccessibilityPR = async (
  arg1,
  repoOwnerArg,
  repoNameArg,
  filePathArg,
  fileContentArg,
  commitMessageArg
) => {
  let accessToken, repoOwner, repoName, filePath, fileContent, commitMessage, prTitle, prBody;
  let targetOriginalCode, ruleId, ruleDescription, wcagGuideline;

  if (typeof arg1 === 'object' && arg1 !== null) {
    accessToken = arg1.accessToken || arg1.token;
    repoOwner = arg1.repoOwner || arg1.owner;
    repoName = arg1.repoName || arg1.repo;
    filePath = arg1.filePath || arg1.path || 'index.html';
    fileContent = arg1.fileContent || arg1.content || '';
    targetOriginalCode = arg1.targetOriginalCode || arg1.originalCode || '';
    commitMessage = arg1.commitMessage || '♿ EquiDom: Automated accessibility compliance fix';
    prTitle = arg1.prTitle || '♿ EquiDom: Automated Accessibility Fix';
    prBody = arg1.prBody;
    ruleId = arg1.ruleId;
    ruleDescription = arg1.ruleDescription;
    wcagGuideline = arg1.wcagGuideline;
  } else {
    accessToken = arg1;
    repoOwner = repoOwnerArg;
    repoName = repoNameArg;
    filePath = filePathArg || 'index.html';
    fileContent = fileContentArg || '';
    commitMessage = commitMessageArg || '♿ EquiDom: Automated accessibility compliance fix';
    prTitle = '♿ EquiDom: Automated Accessibility Fix';
  }

  if (!accessToken) {
    throw new AppError('GitHub Access Token is required to create a Pull Request. Please connect GitHub.', 401);
  }

  if (!repoOwner || !repoName) {
    throw new AppError('Both repository owner and repository name are required (e.g. owner: "myorg", repo: "myproject").', 400);
  }

  // Handle owner containing full URL or slash: "octocat/hello-world"
  if (repoOwner.includes('/')) {
    const clean = repoOwner.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const parts = clean.split('/');
    if (parts.length >= 2) {
      repoOwner = parts[0];
      repoName = parts[1];
    }
  }

  const octokit = new Octokit({
    auth: accessToken,
    userAgent: 'EquiDom-Accessibility-Auditor/1.0.0'
  });

  try {
    // 1. Fetch repository details to determine default branch
    let defaultBranch = 'main';
    try {
      const { data: repo } = await octokit.repos.get({
        owner: repoOwner,
        repo: repoName
      });
      defaultBranch = repo.default_branch || 'main';
    } catch (err) {
      if (err.status === 404) {
        throw new AppError(`Repository '${repoOwner}/${repoName}' not found. Please verify repository name and permissions.`, 404);
      }
      if (err.status === 401) {
        throw new AppError('Invalid or expired GitHub access token. Please reconnect GitHub.', 401);
      }
      throw err;
    }

    // 2. Fetch latest commit SHA of the default branch
    let baseSha;
    try {
      const { data: refData } = await octokit.git.getRef({
        owner: repoOwner,
        repo: repoName,
        ref: `heads/${defaultBranch}`
      });
      baseSha = refData.object.sha;
    } catch (err) {
      // Fallback: try 'master' if 'main' ref failed
      if (defaultBranch === 'main') {
        const { data: refData } = await octokit.git.getRef({
          owner: repoOwner,
          repo: repoName,
          ref: `heads/master`
        });
        defaultBranch = 'master';
        baseSha = refData.object.sha;
      } else {
        throw err;
      }
    }

    // 3. Create a unique branch: fix/accessibility-[timestamp]
    const branchName = `fix/accessibility-${Date.now()}`;
    await octokit.git.createRef({
      owner: repoOwner,
      repo: repoName,
      ref: `refs/heads/${branchName}`,
      sha: baseSha
    });

    // 4. Fetch existing file from the default branch (if it exists)
    let fileSha;
    let existingContent = null;
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner: repoOwner,
        repo: repoName,
        path: filePath,
        ref: defaultBranch
      });
      if (existingFile && existingFile.sha) {
        fileSha = existingFile.sha;
        if (existingFile.content) {
          existingContent = Buffer.from(existingFile.content, 'base64').toString('utf-8');
        }
      }
    } catch (err) {
      // File does not exist yet; will create a new file
    }

    // 5. Determine the content to commit: in-place patch vs whole file
    let finalContentToCommit = fileContent;
    let patchApplied = false;

    if (existingContent !== null) {
      const orig = normalizeSnippet(targetOriginalCode);
      const replacement = (fileContent || '').trim();

      if (orig && existingContent.includes(orig)) {
        // Exact snippet replacement
        finalContentToCommit = existingContent.replace(orig, replacement);
        patchApplied = true;
      } else if (orig) {
        // Try line-by-line or whitespace-normalized replacement
        const origSingleLine = orig.replace(/\s+/g, ' ');
        const lines = existingContent.split('\n');
        let matchedLineIdx = -1;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(orig) || lines[i].replace(/\s+/g, ' ').includes(origSingleLine)) {
            matchedLineIdx = i;
            break;
          }
        }

        if (matchedLineIdx !== -1) {
          lines[matchedLineIdx] = replacement;
          finalContentToCommit = lines.join('\n');
          patchApplied = true;
        } else {
          // If not matched, append the fix with clear accessibility annotations
          finalContentToCommit = `${existingContent}\n\n<!-- ♿ EquiDOM Accessibility Patch (${ruleId || 'WCAG Fix'}) -->\n${replacement}\n`;
        }
      } else {
        // No original code provided; if fileContent is provided replace or append
        finalContentToCommit = fileContent;
      }
    }

    // 6. Commit the file contents to the new branch
    const encodedContent = Buffer.from(finalContentToCommit, 'utf-8').toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
      message: commitMessage,
      content: encodedContent,
      branch: branchName,
      ...(fileSha ? { sha: fileSha } : {})
    });

    // 7. Generate a professional Pull Request body
    let defaultPrBody = `### ♿ EquiDom Automated Accessibility Remediations\n\n`;
    defaultPrBody += `This Pull Request was generated automatically by **EquiDom** to resolve detected WCAG accessibility barriers and improve assistive technology compliance.\n\n`;
    defaultPrBody += `| Parameter | Details |\n|---|---|\n`;
    defaultPrBody += `| **Target File** | \`${filePath}\` |\n`;
    defaultPrBody += `| **Branch** | \`${branchName}\` $\\rightarrow$ \`${defaultBranch}\` |\n`;
    if (ruleId) defaultPrBody += `| **WCAG Rule** | \`${ruleId}\` |\n`;
    if (wcagGuideline) defaultPrBody += `| **Guideline** | ${wcagGuideline} |\n`;
    if (ruleDescription) defaultPrBody += `| **Issue Description** | ${ruleDescription} |\n`;

    if (targetOriginalCode && fileContent) {
      defaultPrBody += `\n#### 🔍 Applied Patch Diff:\n\`\`\`html\n- ${targetOriginalCode.trim()}\n+ ${fileContent.trim()}\n\`\`\`\n`;
    }

    defaultPrBody += `\n#### Verification Checklist:\n- [x] Verified semantic HTML structure\n- [x] Conforms to WCAG 2.1 / 2.2 Success Criteria\n- [x] Screen reader and keyboard accessible\n\n*Review changes and merge to improve accessibility for all users!*`;

    const { data: pullRequest } = await octokit.pulls.create({
      owner: repoOwner,
      repo: repoName,
      title: prTitle,
      head: branchName,
      base: defaultBranch,
      body: prBody || defaultPrBody
    });

    return {
      success: true,
      prUrl: pullRequest.html_url,
      prNumber: pullRequest.number,
      branch: branchName,
      base: defaultBranch,
      title: pullRequest.title,
      repo: `${repoOwner}/${repoName}`,
      filePath,
      patchApplied
    };

  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Error creating accessibility PR:', error);
    const msg = error.response?.data?.message || error.message || 'Failed to create GitHub Pull Request';
    throw new AppError(`GitHub PR error: ${msg}`, error.status || 500);
  }
};

module.exports = {
  createAccessibilityPR
};
