import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readChatAttachment } from '../services/google-ai-studio/chatAttachment';
import { readVoiceReadiness } from '../services/openai-realtime/server/readiness';
import chatHandler from '../../api/gemini/chat.js';

test('the shipped legacy chat URL requires owner access and never invents an offline AI reply', async () => {
  let status = 0;
  let body: any;
  const res = { setHeader() {}, status(value: number) { status = value; return this; }, json(value: unknown) { body = value; } };
  await chatHandler({ method: 'POST', headers: {}, body: { message: '[project:SEVEN] Return exactly KR-AUDIT-39.' } } as any, res as any);
  assert.equal(status, 401);
  assert.equal(body.reply, undefined);
  assert.match(body.error, /Unlock owner access/);
});

test('text attachments include their contents and unsupported or oversized files fail explicitly', async () => {
  const text = await readChatAttachment({ name: 'brief.md', size: 22, text: async () => 'A real production brief' });
  assert.match(text, /A real production brief/);
  await assert.rejects(readChatAttachment({ name: 'brief.pdf', size: 22, text: async () => 'not read' }), /PDF and image analysis is not available/);
  await assert.rejects(readChatAttachment({ name: 'huge.txt', size: 300000, text: async () => 'not read' }), /256 KB/);
});

test('voice readiness reports configuration presence without exposing any values', () => {
  assert.equal(readVoiceReadiness({}).configured, false);
  const result = readVoiceReadiness({ OPENAI_API_KEY: 'private-test-value', CEREBRO_OWNER_ACCESS_CODE: 'owner-access-code-for-tests-1234567890' });
  assert.equal(result.configured, true);
  assert.equal(result.signInRequired, false);
  assert.ok(!JSON.stringify(result).includes('private-test-value'));
});

test('workspace views render real project destinations and protect locked register details', async () => {
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
      import { WorkspaceContent } from './src/components/WorkspaceContent';
      const props = { projectId: 'SEVEN', projectTab: 'overview', audience: 'Owner only', tasks: [], language: 'en', ownerUnlocked: false,
        onLanguage() {}, onClose() {}, onOpen() {}, onProject() {}, onProjectTab() {}, onMedia() {} };
      console.log(JSON.stringify({
        projects: renderToStaticMarkup(<WorkspaceContent {...props} panel="projects" />),
        details: renderToStaticMarkup(<WorkspaceContent {...props} panel="project-detail" />),
        tasks: renderToStaticMarkup(<WorkspaceContent {...props} panel="tasks" />),
        signedTasks: renderToStaticMarkup(<WorkspaceContent {...props} panel="tasks" ownerUnlocked={true} />),
      }));` },
    bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false,
    loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' }, logLevel: 'silent',
  });
  const output = execFileSync(process.execPath, ['--input-type=module'], { input: result.outputFiles![0].text, encoding: 'utf8' });
  const views = JSON.parse(output);
  assert.match(views.projects, /workspace-project-SEVEN/);
  assert.match(views.projects, /Workspace view/);
  assert.doesNotMatch(views.details, /550 5\.1\.1/);
  assert.match(views.tasks, /Use Call to unlock owner access/);
  assert.match(views.signedTasks, /Source evidence/);
});

test('shipped Vercel JavaScript loads natively and rejects unauthenticated calls without a provider request', async () => {
  const { default: handler } = await import('../../api/openai/realtime/session.js');
  let code = 0;
  const res = { setHeader() {}, status(n: number) { code = n; return this; }, json() {} };
  await handler({ method: 'POST', headers: {}, body: {} } as any, res as any);
  assert.equal(code, 401);
});
