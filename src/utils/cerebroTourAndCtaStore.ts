import { useEffect, useState } from 'react';

export type TourMode = 'full-18-screen' | 'hq-ops' | 'cde-bio' | 'executive-fast';

export interface ActiveScreenCtaMeta {
  ctaId: string;
  label: string;
  panelId: string;
  state: 'idle' | 'active' | 'armed' | 'disabled';
  requiresTwoTap: boolean;
}

export interface TourCtaSubStep {
  delayMs: number;
  ctaId: string;
  spokenNote: string;
  autoClick?: boolean;
}

export interface TourScreenStepSpec {
  screenId:
    | 'S01'
    | 'S02'
    | 'S03'
    | 'S04'
    | 'S05'
    | 'S06'
    | 'S07'
    | 'S08'
    | 'S09'
    | 'S10'
    | 'S11'
    | 'S12'
    | 'S13'
    | 'S14'
    | 'S15'
    | 'S16'
    | 'S17'
    | 'S18';
  stepNumber: number; // 1..18
  panelNumber: string;
  title: string;
  sphere: 'hq' | 'cde';
  panelsToOpen: string[];
  targetNodeId: string | null;
  durationSec: number;
  primaryCtaId: string;
  captionBubbleText: string;
  narrationEn: string;
  narrationAr: string;
  subSteps: TourCtaSubStep[];
  modes: TourMode[];
}

export const CEREBRO_18_TOUR_CHOREOGRAPHY: TourScreenStepSpec[] = [
  {
    screenId: 'S01',
    stepNumber: 1,
    panelNumber: 'Panel #17',
    title: 'S01 · Gate 3939 & 8s Square-Kufic Bismillah Loader',
    sphere: 'hq',
    panelsToOpen: [],
    targetNodeId: null,
    durationSec: 12,
    primaryCtaId: 'loader-take-off',
    captionBubbleText: 'S01 · Panel #17 · Gate 3939 & Square-Kufic Bismillah Loader ("Take off →")',
    narrationEn:
      'Screen 01, Panel 17: Sovereign 3939 PIN Gate and the 8-second Square-Kufic Bismillah telemetry loader with instant Take off bypass.',
    narrationAr:
      'الشاشة الأولى، لوحة ١٧: بوابة المالك ٣٩٣٩ وشاشة التحميل بالخط الكوفي المربع مع زر الإقلاع الفوري.',
    subSteps: [
      {
        delayMs: 400,
        ctaId: 'loader-take-off',
        spokenNote: 'Highlighting Take off → CTA on the 8-second Bismillah loader',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen'],
  },
  {
    screenId: 'S02',
    stepNumber: 2,
    panelNumber: 'Panel #1',
    title: 'S02 · Mid-Orbit Arrival & z-110 #9AFFE0 Voice Orb',
    sphere: 'hq',
    panelsToOpen: [],
    targetNodeId: null,
    durationSec: 12,
    primaryCtaId: 'privacy-owner-only',
    captionBubbleText: 'S02 · Panel #1 · Mid-Orbit Arrival & #9AFFE0 Voice Orb + Privacy Gates',
    narrationEn:
      'Screen 02, Panel 1: Mid-orbit arrival on Sphere 01 CEREBRO HQ in refractive cobalt glass, highlighting the #9AFFE0 Voice Orb, Audience Privacy CTAs (Owner only 39, Partner, Public), and emergency Voice Stop.',
    narrationAr:
      'الشاشة الثانية، لوحة ١: الوصول المداري حول كرة القيادة الزرقاء مع كرة الصوت وأزرار الخصوصية وإيقاف الصوت الفوري.',
    subSteps: [
      {
        delayMs: 400,
        ctaId: 'privacy-owner-only',
        spokenNote: 'Highlighting Owner only 39 privacy gate',
        autoClick: false,
      },
      {
        delayMs: 1400,
        ctaId: 'privacy-partner',
        spokenNote: 'Highlighting Partner privacy gate',
        autoClick: false,
      },
      {
        delayMs: 2400,
        ctaId: 'voice-stop',
        spokenNote: 'Highlighting z-70 Voice Stop CTA',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'hq-ops', 'executive-fast'],
  },
  {
    screenId: 'S03',
    stepNumber: 3,
    panelNumber: 'Panel #6',
    title: 'S03 · Cairo 08:00 Morning Briefing',
    sphere: 'hq',
    panelsToOpen: ['briefing'],
    targetNodeId: 'projects',
    durationSec: 14,
    primaryCtaId: 'briefing-approve-lotus',
    captionBubbleText: 'S03 · Panel #6 · Cairo 08:00 Morning Briefing · Today (3), Meetings (2), Approvals (4)',
    narrationEn:
      'Screen 03, Panel 6: Cairo 08:00 Morning Briefing mounting Today (3), Meetings (2), and Approvals (4) columns alongside the Mission Lotus & SEVEN approval CTA.',
    narrationAr:
      'الشاشة الثالثة، لوحة ٦: موجز الصباح بتوقيت القاهرة ٠٨:٠٠ يعرض أولويات اليوم والاجتماعات والموافقات الفورية.',
    subSteps: [
      {
        delayMs: 500,
        ctaId: 'briefing-tab-today',
        spokenNote: 'Highlighting Today (3) column',
        autoClick: true,
      },
      {
        delayMs: 1800,
        ctaId: 'briefing-tab-meetings',
        spokenNote: 'Switching to Meetings (2) column',
        autoClick: true,
      },
      {
        delayMs: 3200,
        ctaId: 'briefing-tab-approvals',
        spokenNote: 'Switching to Approvals (4) column',
        autoClick: true,
      },
      {
        delayMs: 4400,
        ctaId: 'briefing-approve-lotus',
        spokenNote: 'Highlighting briefing-approve-lotus approval gate',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'hq-ops', 'executive-fast'],
  },
  {
    screenId: 'S04',
    stepNumber: 4,
    panelNumber: 'Panel #2',
    title: 'S04 · Portfolio · All 17 Projects Uncapped',
    sphere: 'hq',
    panelsToOpen: ['portfolio'],
    targetNodeId: 'projects',
    durationSec: 14,
    primaryCtaId: 'portfolio-filter-all',
    captionBubbleText: 'S04 · Panel #2 · Portfolio · All 17 Uncapped Projects & Status Filter Chips',
    narrationEn:
      'Screen 04, Panel 2: Uncapped 17-project NOJARA portfolio stepping through All (17), Active (11), Waiting on 39 (4), and Blocked (1) filter chip CTAs.',
    narrationAr:
      'الشاشة الرابعة، لوحة ٢: سجل المشاريع الكامل بعدد ١٧ مشروعاً مع فلاتر النشط وبانتظار ٣٩ والمتوقف.',
    subSteps: [
      {
        delayMs: 500,
        ctaId: 'portfolio-filter-active',
        spokenNote: 'Clicking Active (11) filter chip',
        autoClick: true,
      },
      {
        delayMs: 1900,
        ctaId: 'portfolio-filter-waiting-on-39',
        spokenNote: 'Clicking Waiting on 39 (4) filter chip',
        autoClick: true,
      },
      {
        delayMs: 3300,
        ctaId: 'portfolio-filter-blocked',
        spokenNote: 'Clicking Blocked (1) filter chip',
        autoClick: true,
      },
      {
        delayMs: 4700,
        ctaId: 'portfolio-filter-all',
        spokenNote: 'Restoring All (17) uncapped projects',
        autoClick: true,
      },
    ],
    modes: ['full-18-screen', 'hq-ops', 'executive-fast'],
  },
  {
    screenId: 'S05',
    stepNumber: 5,
    panelNumber: 'Panel #3',
    title: 'S05 · Unified Project Detail Page (SEVEN · 9 Tabs + 3 KPIs)',
    sphere: 'hq',
    panelsToOpen: ['project-detail'],
    targetNodeId: 'SEVEN',
    durationSec: 16,
    primaryCtaId: 'project-tab-overview',
    captionBubbleText: 'S05 · Panel #3 · SEVEN Sun @ 9.2u · 9 Section Tabs & 3 KPI Cards (68% · 12 Open · 3 Overdue)',
    narrationEn:
      'Screen 05, Panel 3: Close 9.2-unit inspection on SEVEN Sun, cycling all 9 section tab CTAs (Overview, Tasks, People, Files, Media, Budget, Timeline, Approvals, Decisions) and highlighting the 3 KPI cards plus Back pose CTA.',
    narrationAr:
      'الشاشة الخامسة، لوحة ٣: صفحة تفاصيل مشروع سفن عن قرب مع الأقسام التسعة ومؤشرات الأداء الثلاثة.',
    subSteps: [
      {
        delayMs: 400,
        ctaId: 'project-kpi-cards',
        spokenNote: 'Highlighting 3 KPI cards (68% Progress, 12 Open, 3 Overdue)',
        autoClick: false,
      },
      {
        delayMs: 1400,
        ctaId: 'project-tab-tasks',
        spokenNote: 'Selecting Tasks tab',
        autoClick: true,
      },
      {
        delayMs: 2400,
        ctaId: 'project-tab-people',
        spokenNote: 'Selecting People tab',
        autoClick: true,
      },
      {
        delayMs: 3400,
        ctaId: 'project-tab-files',
        spokenNote: 'Selecting Files tab',
        autoClick: true,
      },
      {
        delayMs: 4400,
        ctaId: 'project-tab-media',
        spokenNote: 'Selecting Media tab',
        autoClick: true,
      },
      {
        delayMs: 5400,
        ctaId: 'project-tab-budget',
        spokenNote: 'Selecting Budget tab',
        autoClick: true,
      },
      {
        delayMs: 6400,
        ctaId: 'project-tab-timeline',
        spokenNote: 'Selecting Timeline tab',
        autoClick: true,
      },
      {
        delayMs: 7400,
        ctaId: 'project-tab-approvals',
        spokenNote: 'Selecting Approvals tab',
        autoClick: true,
      },
      {
        delayMs: 8400,
        ctaId: 'project-tab-decisions',
        spokenNote: 'Selecting Decisions tab',
        autoClick: true,
      },
      {
        delayMs: 9500,
        ctaId: 'project-tab-overview',
        spokenNote: 'Returning to Overview tab & highlighting ← Back pose CTA',
        autoClick: true,
      },
    ],
    modes: ['full-18-screen', 'hq-ops', 'executive-fast'],
  },
  {
    screenId: 'S06',
    stepNumber: 6,
    panelNumber: 'Panel #4',
    title: 'S06 · 4-Column Task Board + Task Detail Sheet',
    sphere: 'hq',
    panelsToOpen: ['tasks'],
    targetNodeId: 'tasks',
    durationSec: 14,
    primaryCtaId: 'task-save-patch',
    captionBubbleText: 'S06 · Panel #4 · 4-Column Task Board (To do · Doing · Waiting · Done) + Save Task PATCH',
    narrationEn:
      'Screen 06, Panel 4: 4-column Task Board mounting To do, Doing, Waiting, and Done columns, opening the inline Task Detail sheet CTA (Save Task PATCH) and Zebda’s Make this a task? prompt.',
    narrationAr:
      'الشاشة السادسة، لوحة ٤: لوحة المهام ذات الأعمدة الأربعة مع نافذة تفاصيل المهمة واقتراح زبدة لتحويل الملاحظة إلى مهمة.',
    subSteps: [
      {
        delayMs: 600,
        ctaId: 'task-open-detail-TSK-101',
        spokenNote: 'Opening Task Detail drawer for TSK-101',
        autoClick: true,
      },
      {
        delayMs: 2000,
        ctaId: 'task-save-patch',
        spokenNote: 'Highlighting Save Task PATCH CTA',
        autoClick: false,
      },
      {
        delayMs: 3400,
        ctaId: 'zebda-make-this-a-task',
        spokenNote: 'Highlighting Zebda "Make this a task?" CTA',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'hq-ops'],
  },
  {
    screenId: 'S07',
    stepNumber: 7,
    panelNumber: 'Panel #5',
    title: 'S07 · Insight Cards · "What Needs You" 6 Signals',
    sphere: 'hq',
    panelsToOpen: ['insights'],
    targetNodeId: 'decisions',
    durationSec: 14,
    primaryCtaId: 'insight-inspect-blocked',
    captionBubbleText: 'S07 · Panel #5 · Insights · "What Needs You" 6 Signals & #FF5666 Blocked Inspect Drawer',
    narrationEn:
      'Screen 07, Panel 5: Executive Insight Cards displaying What Needs You across 6 signals, highlighting Blocked in #FF5666 system error red and triggering its Inspect drawer.',
    narrationAr:
      'الشاشة السابعة، لوحة ٥: بطاقات الرؤى الست مع إبراز حالة التوقف باللون الأحمر وفتح درج الفحص التفصيلي.',
    subSteps: [
      {
        delayMs: 700,
        ctaId: 'insight-inspect-blocked',
        spokenNote: 'Triggering Inspect drawer on Blocked (#FF5666) signal',
        autoClick: true,
      },
    ],
    modes: ['full-18-screen', 'hq-ops', 'executive-fast'],
  },
  {
    screenId: 'S08',
    stepNumber: 8,
    panelNumber: 'Panel #7',
    title: 'S08 · Gmail me@nojara.com Split View + Two-Tap Readback',
    sphere: 'hq',
    panelsToOpen: ['gmail'],
    targetNodeId: 'workspace',
    durationSec: 14,
    primaryCtaId: 'gmail-two-tap-arm',
    captionBubbleText: 'S08 · Panel #7 · Gmail me@nojara.com Split View · Two-Tap 4000ms Confirm / 5000ms Undo',
    narrationEn:
      'Screen 08, Panel 7: Gmail split view for me@nojara.com opening the executive thread and reply composer, demonstrating the Two-Tap Readback safety gate (4000ms confirm window and 5000ms undo window).',
    narrationAr:
      'الشاشة الثامنة، لوحة ٧: بريد جيميل المقسم مع بوابة الأمان المزدوجة للإرسال والتراجع.',
    subSteps: [
      {
        delayMs: 700,
        ctaId: 'gmail-two-tap-arm',
        spokenNote: 'Arming Two-Tap Send gate (4000ms confirmation window)',
        autoClick: true,
      },
      {
        delayMs: 2200,
        ctaId: 'gmail-two-tap-confirm',
        spokenNote: 'Highlighting Confirm Send / Cancel Two-Tap gate',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'hq-ops'],
  },
  {
    screenId: 'S09',
    stepNumber: 9,
    panelNumber: 'Panel #8',
    title: 'S09 · Calendar 7-Day Week Grid + Google Meet',
    sphere: 'hq',
    panelsToOpen: ['calendar'],
    targetNodeId: 'calendar',
    durationSec: 14,
    primaryCtaId: 'calendar-confirm-create',
    captionBubbleText: 'S09 · Panel #8 · Calendar 7-Day Week Grid (Mon–Sun 09:00–19:00) & Two-Tap Confirm Create',
    narrationEn:
      'Screen 09, Panel 8: Calendar switching between Today List and the 7-day Week Grid (Monday to Sunday, 09:00 to 19:00) and demonstrating the Two-Tap Confirm Create event CTA.',
    narrationAr:
      'الشاشة التاسعة، لوحة ٨: التقويم الأسبوعي من الاثنين إلى الأحد مع إنشاء الاجتماعات ببوابة التأكيد المزدوجة.',
    subSteps: [
      {
        delayMs: 600,
        ctaId: 'calendar-view-today',
        spokenNote: 'Switching to Today List view',
        autoClick: true,
      },
      {
        delayMs: 1800,
        ctaId: 'calendar-view-week',
        spokenNote: 'Switching to 7-Day Week Grid (Mon–Sun 09:00–19:00)',
        autoClick: true,
      },
      {
        delayMs: 3200,
        ctaId: 'calendar-arm-create',
        spokenNote: 'Arming Two-Tap Confirm Create calendar event CTA',
        autoClick: true,
      },
    ],
    modes: ['full-18-screen', 'hq-ops'],
  },
  {
    screenId: 'S10',
    stepNumber: 10,
    panelNumber: 'Panel #9',
    title: 'S10 · Drive Files ST-04 (NOJARA_HQ_26 / CEREBRO / refs)',
    sphere: 'hq',
    panelsToOpen: ['files'],
    targetNodeId: 'files',
    durationSec: 13,
    primaryCtaId: 'open-in-file-viewer',
    captionBubbleText: 'S10 · Panel #9 · Drive Files ST-04 · Allowlisted Search & Open in File Viewer',
    narrationEn:
      'Screen 10, Panel 9: Google Drive station ST-04 running allowlisted breadcrumb search across NOJARA_HQ_26 / CEREBRO / refs and triggering Open in File Viewer.',
    narrationAr:
      'الشاشة العاشرة، لوحة ٩: ملفات جوجل درايف المعتمدة مع البحث المباشر وفتح عارض المستندات.',
    subSteps: [
      {
        delayMs: 600,
        ctaId: 'drive-run-load',
        spokenNote: 'Running allowlisted Drive search (NOJARA_HQ_26 / CEREBRO / refs)',
        autoClick: true,
      },
      {
        delayMs: 2200,
        ctaId: 'open-in-file-viewer',
        spokenNote: 'Highlighting Open in File Viewer CTA',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'hq-ops'],
  },
  {
    screenId: 'S11',
    stepNumber: 11,
    panelNumber: 'Panel #11',
    title: 'S11 · File Viewer (PDF · doc · image · sheet · Page 2 / 14)',
    sphere: 'hq',
    panelsToOpen: ['file-viewer'],
    targetNodeId: 'files',
    durationSec: 13,
    primaryCtaId: 'file-viewer-zoom-in',
    captionBubbleText: 'S11 · Panel #11 · File Viewer · ‹ Prev / Next Page › & Zoom + at 125%',
    narrationEn:
      'Screen 11, Panel 11: Multi-format File Viewer for PDF, doc, image, and sheet plates, triggering Prev/Next Page pagination and Zoom + to 125%.',
    narrationAr:
      'الشاشة الحادية عشرة، لوحة ١١: عارض الملفات متعدد الصيغ مع التنقل بين الصفحات والتكبير إلى ١٢٥٪.',
    subSteps: [
      {
        delayMs: 600,
        ctaId: 'file-viewer-next-page',
        spokenNote: 'Stepping to Next Page ›',
        autoClick: true,
      },
      {
        delayMs: 1800,
        ctaId: 'file-viewer-prev-page',
        spokenNote: 'Stepping back to ‹ Prev Page (Page 2 / 14)',
        autoClick: true,
      },
      {
        delayMs: 3000,
        ctaId: 'file-viewer-zoom-in',
        spokenNote: 'Triggering Zoom + to 125%',
        autoClick: true,
      },
    ],
    modes: ['full-18-screen', 'hq-ops'],
  },
  {
    screenId: 'S12',
    stepNumber: 12,
    panelNumber: 'Panel #10',
    title: 'S12 · Media Player + Locked Amber #F2B66D 3D Showreel Carousel',
    sphere: 'hq',
    panelsToOpen: ['media'],
    targetNodeId: 'media',
    durationSec: 14,
    primaryCtaId: 'media-fullscreen',
    captionBubbleText: 'S12 · Panel #10 · Locked Amber #F2B66D 3D Showreel Carousel & z-210 Fullscreen CTA',
    narrationEn:
      'Screen 12, Panel 10: Media Player and locked Warm Amber #F2B66D 3D Showreel Carousel stepping through the 5 glassmorphism reel cards (Prev, Next, Play/Pause, + Add URL, and z-210 Fullscreen).',
    narrationAr:
      'الشاشة الثانية عشرة، لوحة ١٠: مشغل الوسائط وعرض الشوريل ثلاثي الأبعاد باللون الكهرماني المعتمد.',
    subSteps: [
      {
        delayMs: 600,
        ctaId: 'media-next-reel',
        spokenNote: 'Stepping to next showreel card ›',
        autoClick: true,
      },
      {
        delayMs: 1800,
        ctaId: 'media-prev-reel',
        spokenNote: 'Stepping to previous showreel card ‹',
        autoClick: true,
      },
      {
        delayMs: 3000,
        ctaId: 'media-add-url',
        spokenNote: 'Highlighting + Add URL CTA',
        autoClick: false,
      },
      {
        delayMs: 4200,
        ctaId: 'media-fullscreen',
        spokenNote: 'Highlighting z-210 Fullscreen CTA',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'hq-ops', 'executive-fast'],
  },
  {
    screenId: 'S13',
    stepNumber: 13,
    panelNumber: 'Panel #12',
    title: 'S13 · People, Workload Bars & 12-Member RACI Matrix',
    sphere: 'hq',
    panelsToOpen: ['people'],
    targetNodeId: 'people',
    durationSec: 14,
    primaryCtaId: 'people-pin-3939',
    captionBubbleText: 'S13 · Panel #12 · 5 Human Leads (39, GD, BL, RS, MU) + 7 AI Agents & PIN 3939 Vault',
    narrationEn:
      'Screen 13, Panel 12: People, Workload Bars, and 12-member RACI Matrix highlighting the 5 human leads (39, GD, BL, RS, MU), 7 AI agents (KT, FK, NQ, WS, ZB, BG, KZ), and the PIN 3939 contract unlock CTA.',
    narrationAr:
      'الشاشة الثالثة عشرة، لوحة ١٢: فريق العمل ومصفوفة المسؤوليات لـ ١٢ عضواً مع قفل العقود السيادي ٣٩٣٩.',
    subSteps: [
      {
        delayMs: 600,
        ctaId: 'crew-chip-39',
        spokenNote: 'Highlighting Owner 39 & human leads (39, GD, BL, RS, MU)',
        autoClick: true,
      },
      {
        delayMs: 1800,
        ctaId: 'people-tab-raci',
        spokenNote: 'Switching to 12-member RACI Matrix',
        autoClick: true,
      },
      {
        delayMs: 3200,
        ctaId: 'people-tab-contracts',
        spokenNote: 'Opening PIN 3939 contract unlock vault',
        autoClick: true,
      },
    ],
    modes: ['full-18-screen', 'hq-ops'],
  },
  {
    screenId: 'S14',
    stepNumber: 14,
    panelNumber: 'Panel #13',
    title: 'S14 · Crew 2×2 Live SSE Streaming Grid ("Draft only · needs your approval")',
    sphere: 'hq',
    panelsToOpen: ['crew'],
    targetNodeId: 'people',
    durationSec: 14,
    primaryCtaId: 'crew-approve-draft',
    captionBubbleText: 'S14 · Panel #13 · Crew 2×2 Live SSE Grid (RS · KT · FK · ZB) · Draft only · needs your approval',
    narrationEn:
      'Screen 14, Panel 13: Crew 2×2 Live SSE Streaming Grid mounting RS, KT, FK, and ZB around the clear center sphere under the mandatory "Draft only · needs your approval" banner with Approve Draft, Copy, and Stop Stream CTAs.',
    narrationAr:
      'الشاشة الرابعة عشرة، لوحة ١٣: شبكة البث الحي ٢×٢ للوكلاء مع شريط مسودة فقط تحتاج لموافقتك.',
    subSteps: [
      {
        delayMs: 600,
        ctaId: 'crew-approve-draft',
        spokenNote: 'Highlighting [Approve Draft] CTA',
        autoClick: false,
      },
      {
        delayMs: 1800,
        ctaId: 'crew-copy-draft',
        spokenNote: 'Highlighting [Copy] CTA',
        autoClick: false,
      },
      {
        delayMs: 3000,
        ctaId: 'crew-stop-stream',
        spokenNote: 'Highlighting [Stop Stream] CTA',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'hq-ops'],
  },
  {
    screenId: 'S15',
    stepNumber: 15,
    panelNumber: 'Panels #14 & #15',
    title: 'S15 · Baghira Gantt & Kinzo Crew Bots',
    sphere: 'hq',
    panelsToOpen: ['baghira', 'kinzo'],
    targetNodeId: 'projects',
    durationSec: 14,
    primaryCtaId: 'baghira-tab-timeline',
    captionBubbleText: 'S15 · Panels #14 & #15 · Baghira [Plan] / [Timeline (Gantt)] & Kinzo Crew Bot Toggles',
    narrationEn:
      'Screen 15, Panels 14 and 15: Baghira master planner toggling between Plan and Timeline Gantt bars alongside Kinzo’s PROPOSED crew-bot roster toggles.',
    narrationAr:
      'الشاشة الخامسة عشرة، لوحتا ١٤ و١٥: مخطط باغيرا الزمني ولوحة تحكم كينزو لروبوتات الطاقم المقترحة.',
    subSteps: [
      {
        delayMs: 600,
        ctaId: 'baghira-tab-plan',
        spokenNote: 'Toggling Baghira [Plan] sub-tab',
        autoClick: true,
      },
      {
        delayMs: 1800,
        ctaId: 'baghira-tab-timeline',
        spokenNote: 'Toggling Baghira [Timeline (Gantt)] sub-tab',
        autoClick: true,
      },
      {
        delayMs: 3000,
        ctaId: 'kinzo-toggle-BOT-01',
        spokenNote: 'Highlighting Kinzo crew-bot sandbox toggle',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'hq-ops'],
  },
  {
    screenId: 'S16',
    stepNumber: 16,
    panelNumber: 'Panel #16',
    title: 'S16 · Unified Settings + 21-Landmark Hand Rig & Pentatonic Synth',
    sphere: 'hq',
    panelsToOpen: ['settings'],
    targetNodeId: 'settings',
    durationSec: 14,
    primaryCtaId: 'synth-note-C4',
    captionBubbleText: 'S16 · Panel #16 · Settings (General · Camera · Hands) & Pentatonic Synth (C4–A4)',
    narrationEn:
      'Screen 16, Panel 16: Unified Settings across General, Camera, and Hands controls (EN LTR / AR RTL, Standard / Reduced Motion) and firing the 5 pentatonic fingertip synth notes C4, D4, E4, G4, and A4.',
    narrationAr:
      'الشاشة السادسة عشرة، لوحة ١٦: الإعدادات الموحدة وتتبع اليد بـ ٢١ نقطة مع السلم الموسيقي الخماسي.',
    subSteps: [
      {
        delayMs: 500,
        ctaId: 'settings-tab-hands',
        spokenNote: 'Switching to Hands & Pentatonic Synth tab',
        autoClick: true,
      },
      {
        delayMs: 1500,
        ctaId: 'synth-note-C4',
        spokenNote: 'Firing pentatonic fingertip note C4 (261.6Hz)',
        autoClick: true,
      },
      {
        delayMs: 2200,
        ctaId: 'synth-note-E4',
        spokenNote: 'Firing pentatonic fingertip note E4 (329.6Hz)',
        autoClick: true,
      },
      {
        delayMs: 2900,
        ctaId: 'synth-note-G4',
        spokenNote: 'Firing pentatonic fingertip note G4 (392.0Hz)',
        autoClick: true,
      },
      {
        delayMs: 3600,
        ctaId: 'synth-note-A4',
        spokenNote: 'Firing pentatonic fingertip note A4 (440.0Hz)',
        autoClick: true,
      },
    ],
    modes: ['full-18-screen', 'hq-ops'],
  },
  {
    screenId: 'S17',
    stepNumber: 17,
    panelNumber: 'Sphere 02 · CDE',
    title: 'S17 · Sphere 02 · CDE Universe [38, 4, -22] & Biography Chapters',
    sphere: 'cde',
    panelsToOpen: ['cde-explorer', 'story-journey'],
    targetNodeId: 'strategy',
    durationSec: 16,
    primaryCtaId: 'cde-dim-strategy',
    captionBubbleText: 'S17 · Sphere 02 CDE Universe [38, 4, -22] · 2400ms CatmullRomCurve3 Flight · DIM-01..04 & ch-01..08',
    narrationEn:
      'Screen 17, Sphere 02: Executing the 2400-millisecond CatmullRomCurve3 flight to CDE Universe at [38, 4, -22] in Warm Amber Caustic Crystal, stepping through Dimensions 01 to 04 and Biography Chapters ch-01 through ch-08.',
    narrationAr:
      'الشاشة السابعة عشرة، الكرة الثانية: رحلة الكاميرا إلى عالم هندسة الثقافة والتصميم واستعراض الأبعاد الأربعة وفصول السيرة الثمانية.',
    subSteps: [
      {
        delayMs: 800,
        ctaId: 'cde-dim-strategy',
        spokenNote: 'Highlighting DIM-01 Strategy & Direction',
        autoClick: false,
      },
      {
        delayMs: 2200,
        ctaId: 'cde-ch-01',
        spokenNote: 'Highlighting Biography Chapter ch-01..ch-08 navigator',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'cde-bio', 'executive-fast'],
  },
  {
    screenId: 'S18',
    stepNumber: 18,
    panelNumber: 'Multi-Domain OS',
    title: 'S18 · Multi-Domain Spatial OS · Sphere 03 (MISSION LOTUS OPS) & Responsive Breakpoints',
    sphere: 'hq',
    panelsToOpen: ['portfolio'],
    targetNodeId: 'MISSION-LOTUS',
    durationSec: 16,
    primaryCtaId: 's18-spawn-lotus-sphere',
    captionBubbleText: 'S18 · Multi-Domain Spatial OS · Sphere 03 (MISSION LOTUS OPS #7CE0B8) & Breakpoint Switcher',
    narrationEn:
      'Screen 18, Multi-Domain Spatial OS: Spawning Sphere 03 (MISSION LOTUS OPS) in Mint Plasma (#7CE0B8) linked via cardiac spline and demonstrating Desktop 1440×900 4-Quadrant, iPad 1180×820 2-Flanking, and Phone 390×844 1-Sheet breakpoint CTAs.',
    narrationAr:
      'الشاشة الثامنة عشرة: نظام الفضاء متعدد النطاقات مع إطلاق الكرة الثالثة لمهمة لوتس واستعراض أوضاع الشاشات المتجاوبة.',
    subSteps: [
      {
        delayMs: 600,
        ctaId: 's18-spawn-lotus-sphere',
        spokenNote: 'Spawning Sphere 03 (MISSION LOTUS OPS) in Mint Plasma #7CE0B8',
        autoClick: false,
      },
      {
        delayMs: 2000,
        ctaId: 's18-bp-desktop',
        spokenNote: 'Highlighting Desktop 1440×900 4-Quadrant layout CTA',
        autoClick: false,
      },
      {
        delayMs: 3200,
        ctaId: 's18-bp-ipad',
        spokenNote: 'Highlighting iPad 1180×820 2-Flanking layout CTA',
        autoClick: false,
      },
      {
        delayMs: 4400,
        ctaId: 's18-bp-phone',
        spokenNote: 'Highlighting Phone 390×844 1-Sheet layout CTA',
        autoClick: false,
      },
    ],
    modes: ['full-18-screen', 'cde-bio', 'executive-fast'],
  },
];

export function getTourStepsForMode(mode: TourMode): TourScreenStepSpec[] {
  if (mode === 'full-18-screen') {
    return CEREBRO_18_TOUR_CHOREOGRAPHY;
  }
  const filtered = CEREBRO_18_TOUR_CHOREOGRAPHY.filter((s) => s.modes.includes(mode));
  return filtered.length > 0 ? filtered : CEREBRO_18_TOUR_CHOREOGRAPHY;
}

/**
 * Scans the live DOM for all visible interactive CTAs carrying `data-cta-id` or `data-testid`
 * and returns a structured `ActiveScreenCtaMeta[]` array for `get_page_state()` and `useCerebroScreenStore`.
 */
export function collectActiveScreenCtas(): ActiveScreenCtaMeta[] {
  if (typeof document === 'undefined') return [];

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-cta-id], button[data-testid]')
  );
  const seen = new Set<string>();
  const result: ActiveScreenCtaMeta[] = [];

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const ctaId =
      el.getAttribute('data-cta-id') || el.getAttribute('data-testid') || '';
    if (!ctaId || seen.has(ctaId)) continue;
    seen.add(ctaId);

    const panelHost = el.closest('[data-panel-id]');
    const panelId = panelHost?.getAttribute('data-panel-id') || 'hud';
    const rawLabel = (el.textContent || el.getAttribute('aria-label') || ctaId)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 64);

    const requiresTwoTap =
      el.getAttribute('data-requires-two-tap') === 'true' ||
      ctaId.includes('two-tap') ||
      ctaId.includes('confirm-send') ||
      ctaId.includes('confirm-create');

    const isDisabled =
      (el as HTMLButtonElement).disabled ||
      el.getAttribute('aria-disabled') === 'true';
    const isArmed =
      el.getAttribute('data-cta-state') === 'armed' ||
      ctaId.includes('step-2') ||
      ctaId.includes('confirm');
    const isActive =
      el.getAttribute('aria-pressed') === 'true' ||
      el.getAttribute('data-cta-state') === 'active' ||
      el.className.includes('bg-[#4C8DFF]') ||
      el.className.includes('bg-[#36E88D]') ||
      el.className.includes('bg-[#5CC8D7]');

    result.push({
      ctaId,
      label: rawLabel || ctaId,
      panelId,
      state: isDisabled
        ? 'disabled'
        : isArmed
        ? 'armed'
        : isActive
        ? 'active'
        : 'idle',
      requiresTwoTap,
    });
  }

  return result;
}

export interface PulsedCtaBadgeState {
  ctaId: string;
  spokenReason: string;
  rect: { top: number; left: number; width: number; height: number } | null;
  timestamp: number;
}

type ScreenStoreListener = () => void;

class CerebroScreenStoreManager {
  private activeScreenId: string = 'S02';
  private activeTourMode: TourMode = 'full-18-screen';
  private activePulsedCta: PulsedCtaBadgeState | null = null;
  private listeners = new Set<ScreenStoreListener>();

  public getState() {
    return {
      activeScreenId: this.activeScreenId,
      activeTourMode: this.activeTourMode,
      activePulsedCta: this.activePulsedCta,
      activeScreenCtas: collectActiveScreenCtas(),
    };
  }

  public setActiveScreenId(screenId: string) {
    this.activeScreenId = screenId;
    this.notify();
  }

  public setActiveTourMode(mode: TourMode) {
    this.activeTourMode = mode;
    this.notify();
  }

  public setPulsedCta(pulsed: PulsedCtaBadgeState | null) {
    this.activePulsedCta = pulsed;
    this.notify();
  }

  public subscribe(listener: ScreenStoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const cerebroScreenStore = new CerebroScreenStoreManager();

export function useCerebroScreenStore() {
  const [snapshot, setSnapshot] = useState(() => cerebroScreenStore.getState());

  useEffect(() => {
    return cerebroScreenStore.subscribe(() => {
      setSnapshot(cerebroScreenStore.getState());
    });
  }, []);

  return snapshot;
}

/**
 * Finds a live CTA element by `data-cta-id`, `data-testid`, or fuzzy label match,
 * applies a 2px solid #65ACFF focus ring pulse, scrolls it into view if inside a panel,
 * and optionally triggers `.click()`.
 */
export function pulseAndTriggerCta(
  ctaIdOrQuery: string,
  spokenReason = 'Voice CTA Choreography',
  shouldClick = true
): { ok: boolean; matchedCtaId: string; label: string; panelId: string } {
  if (typeof document === 'undefined') {
    return {
      ok: false,
      matchedCtaId: ctaIdOrQuery,
      label: ctaIdOrQuery,
      panelId: 'none',
    };
  }

  const clean = ctaIdOrQuery.trim();
  const lower = clean.toLowerCase();

  let targetEl =
    document.querySelector<HTMLElement>(`[data-cta-id="${clean}"]`) ||
    document.querySelector<HTMLElement>(`[data-testid="${clean}"]`);

  if (!targetEl) {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>('[data-cta-id], [data-testid], button')
    );
    targetEl =
      candidates.find((el) => {
        const cid = (el.getAttribute('data-cta-id') || '').toLowerCase();
        const tid = (el.getAttribute('data-testid') || '').toLowerCase();
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        return (
          cid === lower ||
          tid === lower ||
          cid.includes(lower) ||
          tid.includes(lower) ||
          (txt.length > 0 && txt.includes(lower))
        );
      }) || null;
  }

  if (!targetEl) {
    cerebroScreenStore.setPulsedCta({
      ctaId: clean,
      spokenReason,
      rect: null,
      timestamp: Date.now(),
    });
    window.setTimeout(() => {
      cerebroScreenStore.setPulsedCta(null);
    }, 2200);
    return {
      ok: false,
      matchedCtaId: clean,
      label: clean,
      panelId: 'none',
    };
  }

  try {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  } catch {
    // ignore scroll errors
  }

  const prevOutline = targetEl.style.outline;
  const prevOutlineOffset = targetEl.style.outlineOffset;
  const prevBoxShadow = targetEl.style.boxShadow;
  const prevTransition = targetEl.style.transition;

  targetEl.style.transition = 'all 180ms cubic-bezier(0.22, 1, 0.36, 1)';
  targetEl.style.outline = '2px solid #65ACFF';
  targetEl.style.outlineOffset = '2px';
  targetEl.style.boxShadow =
    '0 0 0 2px #65ACFF, 0 0 24px rgba(101, 172, 255, 0.78)';

  const rect = targetEl.getBoundingClientRect();
  const matchedCtaId =
    targetEl.getAttribute('data-cta-id') ||
    targetEl.getAttribute('data-testid') ||
    clean;
  const panelHost = targetEl.closest('[data-panel-id]');
  const panelId = panelHost?.getAttribute('data-panel-id') || 'hud';
  const label =
    (targetEl.textContent || matchedCtaId).replace(/\s+/g, ' ').trim() ||
    matchedCtaId;

  cerebroScreenStore.setPulsedCta({
    ctaId: matchedCtaId,
    spokenReason,
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    timestamp: Date.now(),
  });

  if (shouldClick) {
    try {
      targetEl.click();
    } catch {
      // ignore click errors
    }
  }

  window.setTimeout(() => {
    targetEl.style.outline = prevOutline;
    targetEl.style.outlineOffset = prevOutlineOffset;
    targetEl.style.boxShadow = prevBoxShadow;
    targetEl.style.transition = prevTransition;
    cerebroScreenStore.setPulsedCta(null);
  }, 2000);

  return {
    ok: true,
    matchedCtaId,
    label,
    panelId,
  };
}
