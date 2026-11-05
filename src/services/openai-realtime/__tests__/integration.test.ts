import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

test('the browser voice entry bundles without server handlers or API-key environment reads', async () => {
  const result = await build({
    entryPoints: ['src/services/voice/index.ts'], bundle: true, platform: 'browser',
    format: 'esm', packages: 'external', write: false, metafile: true,
    define: { 'import.meta.env': '{}' }, logLevel: 'silent',
  });
  const inputs = Object.keys(result.metafile!.inputs);
  assert.ok(inputs.some(path => path.endsWith('OpenAiRealtimeVoiceBridge.ts')));
  assert.ok(inputs.every(path => !/services\/.*\/server\//.test(path)));
  assert.ok(!result.outputFiles![0].text.includes('process.env.OPENAI_API_KEY'));
});

test('the Vercel route bundles and loads its server service independently', async () => {
  const result = await build({
    entryPoints: ['src/services/openai-realtime/server/vercelSession.ts'], bundle: true,
    platform: 'node', format: 'esm', write: false, logLevel: 'silent',
    define: { 'import.meta.env': '{}' },
  });
  const server = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles![0].text).toString('base64')}`);
  assert.equal(typeof server.default, 'function');
});

test('both provider badges and the custom label render with preserved control IDs and aria labels', async () => {
  for (const [provider, label] of [
    ['openai-realtime', 'OpenAI Voice'],
    ['google-ai-studio', 'Google Voice'],
    ['openai-realtime', 'Cerebro Studio Voice'],
  ]) {
    const result = await build({
      stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
        import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { VoiceCard } from './src/components/VoiceCard.tsx';
        import { formatVoiceStatus } from './src/services/voice';
        console.log(JSON.stringify({
          status: formatVoiceStatus('OpenAI Voice · listening', 'Listening'),
          html: renderToStaticMarkup(React.createElement(VoiceCard, {
            voiceState: 'Ready', handsActive: false, tourState: { active: false },
            onToggleHands() {}, onSimulateCommand() {}, onSendCompose() {},
          })),
        }));
      ` },
      bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false,
      loader: { '.css': 'empty' }, logLevel: 'silent',
      define: { 'import.meta.env': JSON.stringify({
        VITE_CEREBRO_VOICE_PROVIDER: provider,
        VITE_CEREBRO_VOICE_LABEL: label === 'Cerebro Studio Voice' ? label : '',
      }) },
    });
    const output = execFileSync(process.execPath, ['--input-type=module'], {
      cwd: process.cwd(), input: result.outputFiles![0].text, encoding: 'utf8',
    });
    const { html, status } = JSON.parse(output);
    assert.ok(html.includes(label));
    assert.equal(status, `${label} · listening`);
    for (const id of ['voice-card', 'cerebro-btn-call', 'cerebro-btn-hands', 'cerebro-btn-chat']) {
      assert.ok(html.includes(`data-testid="${id}"`));
    }
    for (const aria of ['Call', 'Turn on hand camera', 'Chat']) assert.ok(html.includes(`aria-label="${aria}"`));
  }
});
