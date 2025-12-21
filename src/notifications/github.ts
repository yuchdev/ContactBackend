import type { ContactFormData, Env } from '../types';

/**
 * Create a GitHub issue for the contact form submission
 */
export async function createGitHubIssue(
  data: ContactFormData,
  env: Env
): Promise<boolean> {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    console.warn('GitHub configuration not available');
    return false;
  }

  const [owner, repo] = env.GITHUB_REPO.split('/');
  if (!owner || !repo) {
    console.error('Invalid GITHUB_REPO format. Expected "owner/repo"');
    return false;
  }

  const title = data.subject || `Contact form: ${data.name}`;
  const body = `
**Contact Form Submission**

**From:** ${data.name}
**Email:** ${data.email}
${data.subject ? `**Subject:** ${data.subject}` : ''}

**Message:**
${data.message}

---
*Submitted at: ${new Date().toISOString()}*
  `.trim();

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
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
          labels: ['contact-form'],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub API error:', response.status, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to create GitHub issue:', error);
    return false;
  }
}
