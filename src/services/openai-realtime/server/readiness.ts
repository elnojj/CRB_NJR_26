import { ownerConfigurationIssue } from './ownerAccess';

/** Configuration only: never a claim that account quota, audio, or model access was tested. */
export function readVoiceReadiness(env: NodeJS.ProcessEnv = process.env) {
  const issues: { variable: string; reason: string; message: string }[] = [];
  if (!env.OPENAI_API_KEY?.trim()) issues.push({ variable: 'OPENAI_API_KEY', reason: 'missing', message: 'OPENAI_API_KEY is missing from this deployment. Save it in the server environment and redeploy.' });
  const ownerIssue = ownerConfigurationIssue(env);
  if (ownerIssue) issues.push(ownerIssue);
  const missing = issues.filter(issue => issue.reason === 'missing').map(issue => issue.variable);
  const invalid = issues.filter(issue => issue.reason !== 'missing').map(issue => issue.variable);
  return { provider: 'openai-realtime', configured: issues.length === 0, signInRequired: false, ownerAccessRequired: true, missing, invalid, issues };
}
