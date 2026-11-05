import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readChatAttachment } from '../services/google-ai-studio/chatAttachment';
import { readVoiceReadiness } from '../services/openai-realtime/server/readiness';
import chatHandler from '../../api/gemini/chat.js';

test('legacy project context cannot turn an unrelated question into a scripted project answer', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    let body: any;
    const res = { setHeader() {}, status() { return this; }, json(value: unknown) { body = value; } };
    await chatHandler({ method: 'POST', body: { message: '[project:SEVEN] Return exactly KR-AUDIT-39.' } } as any, res as any);
    assert.equal(body.mode, 'offline');
    assert.match(body.reply, /KR-AUDIT-39/);
    assert.doesNotMatch(body.reply, /Register workstreams are live/);
    assert.equal(body.model, 'cerebro-local-fallback');
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test('text attachments include their contents and unsupported or oversized files fail explicitly', async () => {
  const text = await readChatAttachment({ name: 'brief.md', size: 22, text: async () => 'A real production brief' });
  assert.match(text, /A real production brief/);
  await assert.rejects(readChatAttachment({ name: 'brief.pdf', size: 22, text: async () => 'not read' }), /PDF and image analysis is not available/);
  await assert.rejects(readChatAttachment({ name: 'huge.txt', size: 300000, text: async () => 'not read' }), /256 KB/);
});

test('voice readiness reports configuration presence without exposing any values', () => {
  assert.equal(readVoiceReadiness({}).configured, false);
  const result = readVoiceReadiness({ OPENAI_API_KEY: 'private-test-value', VITE_FIREBASE_API_KEY: 'public-test-value', VITE_FIREBASE_PROJECT_ID: 'test-project' });
  assert.equal(result.configured, true);
  assert.equal(result.signInRequired, true);
  assert.ok(!JSON.stringify(result).includes('private-test-value'));
});

test('workspace views render real project destinations and protect unsigned register details', async () => {
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server';
      import { WorkspaceContent } from './src/components/WorkspaceContent';
      const props = { projectId: 'SEVEN', projectTab: 'overview', audience: 'Owner only', tasks: [], language: 'en', signedIn: false,
        onLanguage() {}, onClose() {}, onOpen() {}, onProject() {}, onProjectTab() {}, onMedia() {} };
      console.log(JSON.stringify({
        projects: renderToStaticMarkup(<WorkspaceContent {...props} panel="projects" />),
        tasks: renderToStaticMarkup(<WorkspaceContent {...props} panel="tasks" />),
        signedTasks: renderToStaticMarkup(<WorkspaceContent {...props} panel="tasks" signedIn={true} />),
      }));` },
    bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false,
    loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' }, logLevel: 'silent',
  });
  const output = execFileSync(process.execPath, ['--input-type=module'], { input: result.outputFiles![0].text, encoding: 'utf8' });
  const views = JSON.parse(output);
  assert.match(views.projects, /workspace-project-SEVEN/);
  assert.match(views.tasks, /Sign in through Call/);
  assert.match(views.signedTasks, /Source evidence/);
});

test('shipped Vercel JavaScript loads natively and rejects unauthenticated calls without a provider request', async () => {
  const { default: handler } = await import('../../api/openai/realtime/session.js');
  let code = 0;
  const res = { setHeader() {}, status(n: number) { code = n; return this; }, json() {} };
  await handler({ method: 'POST', headers: {}, body: {} } as any, res as any);
  assert.equal(code, 401);
});
