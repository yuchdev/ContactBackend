import type { ContactFormData, Env } from '../types';

/**
 * Creates a new GitHub issue based on the contact form submission data.
 * 
 * @param {ContactFormData} data - The submission data.
 * @param {Env} env - Environment variables containing GitHub credentials and repository info.
 * @returns {Promise<string | null>} The HTML URL of the created issue, or null if creation failed.
 */
export async function createGitHubIssue(
  data: ContactFormData,
  env: Env
): Promise<string | null> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    console.warn('GitHub configuration not available');
    return null;
  }

  // Obfuscate email for privacy
  const obfuscatedEmail = data.email ? obfuscateEmail(data.email) : 'Not provided';
  
  const title = `Contact: ${data.subject} (from ${data.name})`;
  const body = `
**Contact Form Submission**

**From:** ${data.name}
**Email:** ${obfuscatedEmail}
**Subject:** ${data.subject}

**Message:**
${data.message}

---
**Metadata:**
- Timestamp: ${new Date().toISOString()}
- Origin: ${data.ts ? new Date(data.ts * 1000).toISOString() : 'Not provided'}
  `.trim();

  try {
    // Create AbortController for timeout (6-10 seconds recommended)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'ContactBackend/1.0',
        },
        body: JSON.stringify({
          title,
          body,
          labels: ['contact'],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub API error:', response.status, error);
      return null;
    }

    const result = await response.json() as { html_url: string };
    return result.html_url;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('GitHub API timeout');
    } else {
      console.error('Failed to create GitHub issue:', error);
    }
    return null;
  }
}

/**
 * Simple email obfuscation for privacy in GitHub issues.
 * 
 * @param {string} email - The email address to obfuscate.
 * @returns {string} The obfuscated email address.
 */
function obfuscateEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  
  return `${local[0]}***@${domain}`;
}
