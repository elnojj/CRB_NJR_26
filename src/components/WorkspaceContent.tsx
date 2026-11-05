import React from 'react';
import {
  VISIBLE_PROJECTS_DATA, REGISTER_RECORDS, PEOPLE_DATA, FILES_DATA,
  MEDIA_ITEMS, STORY_CHAPTERS, CDE_DIMENSIONS, type RegisterRecord,
} from '../data/sourceData';
import { selectLatestSnapshotTimestamp } from '../data/projectPlanModel';
import { PROJECTS_PANELS, NASA_PANELS } from '../data/hqNodeWiring';
import type { AudienceLevel, CustomTaskItem, ProjectWorkspaceTab } from '../state/panelTypes';
import './workspaceContent.css';
import { CONTRACT_INTERACTIVE, CONTRACT_TYPOGRAPHY } from '../design/systemContract';

export interface WorkspaceContentProps {
  panel: string;
  projectId: string;
  projectTab: ProjectWorkspaceTab;
  tasks: CustomTaskItem[];
  audience: AudienceLevel;
  signedIn: boolean;
  language: 'en' | 'ar';
  onLanguage: (language: 'en' | 'ar') => void;
  onClose: () => void;
  onOpen: (panel: string) => void;
  onProject: (id: string) => void;
  onProjectTab: (tab: ProjectWorkspaceTab) => void;
  onMedia: (id: string) => void;
}

const TITLES: Record<string, string> = {
  ...Object.fromEntries([...PROJECTS_PANELS, ...NASA_PANELS].map(p => [p.panelId, p.label])),
  'project-detail': 'Project workspace', settings: 'Settings', 'cde-explorer': 'CDE Universe',
  'story-journey': 'Studio story', calendar: 'Calendar', 'file-viewer': 'File viewer',
};

function RecordList({ records }: { records: RegisterRecord[] }) {
  if (!records.length) return <p>No matching records in this snapshot.</p>;
  return <ul className="workspace-records">{records.map(record => <li key={record.id}>
    <strong>{record.summary}</strong>
    <p>{record.detail}</p>
    <p className="workspace-meta">{record.projectId} · {record.recordType} · {record.workStatus} · {record.reviewStatus}</p>
    <p className="workspace-meta">Owner: {record.owner} · Due: {record.dueText}</p>
    <details><summary>Source evidence</summary><p className="workspace-meta">{record.evidenceLocator} · Updated {record.updatedAt}</p></details>
  </li>)}</ul>;
}

/** One content host shared by CSS3D panels and the reduced-graphics surface. No remote writes. */
export function WorkspaceContent(props: WorkspaceContentProps) {
  const { panel, projectId, projectTab, audience, onOpen, onClose } = props;
  const project = VISIBLE_PROJECTS_DATA.find(p => p.id === projectId);
  // Public visitors can browse the public portfolio, but private register details stay hidden.
  const canInspect = props.signedIn && audience === 'Owner only';
  const privateRecords = canInspect ? REGISTER_RECORDS : [];
  const scoped = privateRecords.filter(r => r.projectId === projectId);
  const title = panel === 'project-detail' ? project?.name || 'Project unavailable' : TITLES[panel] || panel;
  const recordPanel = ['tasks', 'timeline', 'roadmap', 'decisions', 'minutes', 'briefing', 'insights', 'baghira'].includes(panel);
  let records = privateRecords;
  if (panel === 'tasks') records = records.filter(r => r.recordType === 'Action');
  if (panel === 'decisions') records = records.filter(r => r.recordType === 'Decision' || /pending|review/i.test(r.reviewStatus));
  if (panel === 'minutes') records = records.filter(r => r.recordType === 'Update');
  if (panel === 'timeline' || panel === 'roadmap' || panel === 'baghira') records = [...records].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return <section style={{ fontSize: CONTRACT_TYPOGRAPHY.bodyFloorPx, '--workspace-padding': `${CONTRACT_INTERACTIVE.card.paddingPx}px` } as React.CSSProperties} className="workspace-content" data-panel-id={panel} data-testid={`workspace-${panel}`} aria-label={title}
    onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
    <header className="workspace-content__head">
      <div><span className="workspace-meta">CEREBRO · SNAPSHOT</span><h2>{title}</h2></div>
      <button type="button" onClick={onClose} aria-label="Close workspace content">Back</button>
    </header>
    <div className="workspace-content__body" data-detail="true">
      <p className="workspace-meta">Source snapshot: {selectLatestSnapshotTimestamp()} · No live sync established</p>
      {panel === 'projects' && <ul className="workspace-records">{VISIBLE_PROJECTS_DATA.map(p => <li key={p.id}>
        <button type="button" onClick={() => props.onProject(p.id)} data-testid={`workspace-project-${p.id}`}><strong>{p.name}</strong></button>
        <p>{p.subtitle}</p><p className="workspace-meta">{p.isSample ? 'Sample' : 'Register snapshot'} · {p.health} · Updated {p.lastActivity}</p>
      </li>)}</ul>}
      {panel === 'project-detail' && project && <>
        <p>{project.description}</p><p className="workspace-meta">{project.health} · {project.healthNote}</p>
        <nav className="workspace-content__tabs" aria-label="Project sections">{(['overview', 'tasks', 'decisions', 'minutes', 'files', 'team'] as const).map(tab =>
          <button key={tab} type="button" aria-pressed={tab === projectTab} onClick={() => props.onProjectTab(tab)}>{tab}</button>)}</nav>
        {projectTab === 'overview' && <><p>Owner: {project.owner}</p><p>Next deadline: {project.nextDeadline}</p><p>{project.description}</p></>}
        {['tasks', 'decisions', 'minutes'].includes(projectTab) && <RecordList records={scoped.filter(r => projectTab === 'tasks' ? r.recordType === 'Action' : projectTab === 'decisions' ? r.recordType === 'Decision' : r.recordType === 'Update')} />}
        {projectTab === 'files' && <button onClick={() => onOpen('files')}>Browse source files</button>}
        {projectTab === 'team' && <button onClick={() => onOpen('people')}>Open NASA roster</button>}
        <button type="button" onClick={() => props.onMedia(project.id)}>Open project media</button>
      </>}
      {recordPanel && <>
        {!canInspect && <p>Sign in through Call, then select Owner only to inspect register details.</p>}
        <RecordList records={records} />
        {panel === 'tasks' && props.tasks.length > 0 && <><h3>Session drafts</h3><ul>{props.tasks.map(t => <li key={t.id}>{t.title} · {t.projectCode} · Not confirmed saved remotely</li>)}</ul></>}
      </>}
      {['people', 'crew', 'kinzo'].includes(panel) && <ul className="workspace-records">{PEOPLE_DATA.map(p => <li key={p.id}>
        <strong>{p.name}</strong><p>{p.title}</p><p className="workspace-meta">{p.subGroup} · {p.isSample ? 'Sample entry' : 'Roster snapshot'} · Runtime presence unverified</p>
      </li>)}</ul>}
      {['files', 'file-viewer'].includes(panel) && <ul className="workspace-records">{FILES_DATA.filter(f => !f.restricted || canInspect).map(f => {
        const href = f.status === 'Missing from attachment' ? null : f.driveId.startsWith('local:/assets/') ? f.driveId.slice(6) : /^[\w-]{15,}$/.test(f.driveId) ? `https://drive.google.com/${f.type === 'Folder' ? 'drive/folders' : 'file/d'}/${f.driveId}` : null;
        return <li key={f.id}><strong>{f.name}</strong><p className="workspace-meta">{f.type} · {f.status} · {f.lastSaved}</p>
          {href ? <a href={href} target="_blank" rel="noreferrer">Open source file</a> : <p>Source file unavailable.</p>}</li>;
      })}</ul>}
      {['media', 'showreel'].includes(panel) && <ul className="workspace-records">{MEDIA_ITEMS.map(m => <li key={m.id}>
        <strong>{m.title}</strong><p>{m.subtitle}</p><p className="workspace-meta">{m.isSample ? 'Sample' : 'Catalog entry'} · {m.type}</p>
        {m.videoUrl || m.url ? <a href={m.videoUrl || m.url} target="_blank" rel="noreferrer">Open source media</a> : <p>Media unavailable.</p>}
      </li>)}</ul>}
      {panel === 'settings' && <>
        <h3>Language direction</h3><p>Changes the workspace direction. Source records retain their original language.</p>
        <button type="button" aria-pressed={props.language === 'en'} onClick={() => props.onLanguage('en')}>English · LTR</button>
        <button type="button" aria-pressed={props.language === 'ar'} onClick={() => props.onLanguage('ar')}>العربية · RTL</button>
        <h3>Voice</h3><p>Use Call to check the voice service, sign in, and start a microphone session.</p>
      </>}
      {panel === 'cde-explorer' && CDE_DIMENSIONS.map(d => <article key={d.id}><h3>{d.label}</h3>{d.subdomains.map(s => <p key={s.id}>{s.name}</p>)}</article>)}
      {panel === 'story-journey' && STORY_CHAPTERS.map(c => <article key={c.id}><h3>{c.title}</h3><p>{c.verifiedBody}</p></article>)}
      {['gmail', 'team-room', 'calendar'].includes(panel) && <p>{panel === 'gmail' ? 'No live mailbox is connected. No messages have been sent.' : panel === 'team-room' ? 'No live team channel is connected. No messages have been sent.' : 'No live calendar is connected. No events have been created.'}</p>}
      {!TITLES[panel] && !['showreel'].includes(panel) && <p>This view has no connected data source yet.</p>}
    </div>
  </section>;
}
