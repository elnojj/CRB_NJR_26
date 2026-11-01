--- a/src/App.tsx
+++ b/src/App.tsx
@@ -181,7 +181,7 @@
     cde: DomainMaterialPreset;
   }>({
     hq: 'cobalt-glass',
-    cde: 'amber-crystal',
+    cde: 'cobalt-glass',
   });
   const [showCerebro39Modal, setShowCerebro39Modal] = useState<boolean>(false);
   const [visualAuthorityScope, setVisualAuthorityScope] =
@@ -354,9 +354,12 @@
     activeLoopMode: 'off',
   });
   const telemetryRef = useRef<CameraTelemetry>(telemetry);
-  useEffect(() => {
-    telemetryRef.current = telemetry;
-  }, [telemetry]);
+  const [telemetryReceived, setTelemetryReceived] = useState(false);
+  const handleTelemetryChange = useCallback((next: CameraTelemetry) => {
+    telemetryRef.current = next;
+    setTelemetryReceived(true);
+    setTelemetry(next);
+  }, []);
 
   const cameraSettledListenersRef = useRef<Array<() => void>>([]);
   const handleCameraSettled = useCallback(() => {
@@ -368,10 +371,13 @@
   // 4. 18-Screen Wireframe v1.1 + CTA Choreographer Tour State (S01–S18 across 4 modes)
   const screenStore = useCerebroScreenStore();
   const tourSubStepTimersRef = useRef<number[]>([]);
+  const tourGenerationRef = useRef(0);
   const clearTourSubStepTimers = useCallback(() => {
+    tourGenerationRef.current += 1;
     tourSubStepTimersRef.current.forEach((id) => window.clearTimeout(id));
     tourSubStepTimersRef.current = [];
   }, []);
+  useEffect(() => () => clearTourSubStepTimers(), [clearTourSubStepTimers]);
 
   const [tourState, setTourState] = useState<{
     active: boolean;
@@ -714,27 +720,25 @@
   );
 
   const handleNavigateBack = useCallback(() => {
-    setNavHistory((prev) => {
-      if (prev.length === 0) return prev;
-      const last = prev[prev.length - 1];
-      setActiveSphere(last.sphere);
-      setFocusedNodeId(last.focusedNodeId);
-      setOpenPanels(last.openPanels);
-      setSelectedProjectId(last.selectedProjectId);
-      setProjectTabsById((tabs) => ({
-        ...tabs,
-        [last.selectedProjectId]: last.activeProjectTab,
-      }));
-      setSelectedDimensionId(last.selectedDimensionId);
-      setSelectedSubdomainId(last.selectedSubdomainId);
-      setActiveChapterIndex(last.activeChapterIndex);
-      dispatchCamera('focus_node', {
-        targetSphere: last.sphere,
-        targetNodeId: last.focusedNodeId || (last.sphere === 'hq' ? 'projects' : 'strategy'),
-      });
-      return prev.slice(0, -1);
+    const last = navHistory[navHistory.length - 1];
+    if (!last) return;
+    setNavHistory((previous) => previous.slice(0, -1));
+    setActiveSphere(last.sphere);
+    setFocusedNodeId(last.focusedNodeId);
+    setOpenPanels(last.openPanels);
+    setSelectedProjectId(last.selectedProjectId);
+    setProjectTabsById((tabs) => ({
+      ...tabs,
+      [last.selectedProjectId]: last.activeProjectTab,
+    }));
+    setSelectedDimensionId(last.selectedDimensionId);
+    setSelectedSubdomainId(last.selectedSubdomainId);
+    setActiveChapterIndex(last.activeChapterIndex);
+    dispatchCamera(last.focusedNodeId ? 'focus_node' : 'center', {
+      targetSphere: last.sphere,
+      targetNodeId: last.focusedNodeId,
     });
-  }, [dispatchCamera]);
+  }, [dispatchCamera, navHistory]);
 
   const handleMediaControl = useCallback(
     (
@@ -791,6 +795,7 @@
   const applyTourStop = useCallback(
     (stepNumber: number, modeOverride?: TourMode) => {
       clearTourSubStepTimers();
+      const generation = tourGenerationRef.current;
       const activeMode = modeOverride || tourState.mode || 'full-18-screen';
       const steps = getTourStepsForMode(activeMode);
       const clampedIdx = Math.max(0, Math.min(steps.length - 1, stepNumber - 1));
@@ -849,6 +854,7 @@
       // Schedule timed sub-step CTA pulses & auto-clicks for this screen
       stop.subSteps.forEach((sub) => {
         const tid = window.setTimeout(() => {
+          if (generation !== tourGenerationRef.current) return;
           const res = pulseAndTriggerCta(sub.ctaId, sub.spokenNote, sub.autoClick);
           if (res.ok) {
             setCaptionBubble(`${stop.screenId} · ${res.label} — ${sub.spokenNote}`);
@@ -860,6 +866,7 @@
 
       let attempts = 0;
       const verifyBoundsAndNarrate = () => {
+        if (generation !== tourGenerationRef.current) return;
         attempts += 1;
         const targetPanelId = stop.panelsToOpen[0];
         const panelEl = targetPanelId
@@ -867,9 +874,9 @@
           : (document.querySelector('[data-testid="voice-card"]') as HTMLElement | null);
         const rect = panelEl?.getBoundingClientRect();
         const isVisible = Boolean(rect && rect.width > 0 && rect.height > 0);
-        const cameraReady = !telemetryRef.current.isMoving || reducedMotion || attempts >= 6;
+        const cameraReady = attempts >= 3 && (!telemetryRef.current.isMoving || reducedMotion);
 
-        if ((isVisible && cameraReady) || attempts >= 10) {
+        if (isVisible && cameraReady) {
           setTourControllerPhase('presenting');
           setTourHighlightId(stop.targetNodeId || stop.screenId);
           setCaptionBubble(stop.captionBubbleText);
@@ -884,9 +891,17 @@
             `start_tour(${activeMode} · ${stop.screenId} · step=${clampedIdx + 1}/${steps.length} · ctas=${stop.subSteps.length})`
           );
           // Hold after narration (minimumDwellMs: 1200 + postNarrationHoldMs: 900)
-          window.setTimeout(() => setVoiceState('Ready'), 1200);
+          const hold = window.setTimeout(() => {
+            if (generation === tourGenerationRef.current) setVoiceState('Ready');
+          }, 1200);
+          tourSubStepTimersRef.current.push(hold);
+        } else if (attempts < 100) {
+          const retry = window.setTimeout(verifyBoundsAndNarrate, 60);
+          tourSubStepTimersRef.current.push(retry);
         } else {
-          window.setTimeout(verifyBoundsAndNarrate, 60);
+          setTourControllerPhase('paused');
+          setTourState((previous) => ({ ...previous, paused: true }));
+          setCaptionBubble(`Tour paused: ${stop.screenId} target or camera did not settle`);
         }
       };
 
@@ -927,111 +942,76 @@
   }, [clearTourSubStepTimers]);
 
   const handleNextTourStop = useCallback(() => {
-    setTourState((prev) => {
-      const steps = getTourStepsForMode(prev.mode);
-      const nextStep = prev.step + 1;
-      if (nextStep > steps.length) {
-        clearTourSubStepTimers();
-        cerebroScreenStore.setPulsedCta(null);
-        setTourHighlightId(null);
-        setCaptionBubble('18-Screen Wireframe v1.1 Tour complete · Centred on HQ');
-        dispatchCamera('center', { targetSphere: 'hq' });
-        appendTranscript(
-          'Cerebro',
-          `Completed the ${prev.mode} tour across ${steps.length} screens. Returning to centred HQ overview.`,
-          'tour_control(completed)'
-        );
-        return {
-          ...prev,
-          active: false,
-          paused: false,
-          step: 1,
-          total: steps.length,
-          secondsLeft: steps[0]?.durationSec || 10,
-          currentScreenId: steps[0]?.screenId || 'S01',
-        };
-      }
-      const nextStopObj = steps[nextStep - 1] || steps[0];
-      applyTourStop(nextStep, prev.mode);
-      return {
-        ...prev,
-        active: true,
+    const steps = getTourStepsForMode(tourState.mode);
+    const nextStep = tourState.step + 1;
+    if (nextStep > steps.length) {
+      clearTourSubStepTimers();
+      cerebroScreenStore.setPulsedCta(null);
+      setTourHighlightId(null);
+      setTourControllerPhase('idle');
+      setCaptionBubble('Tour complete · Centred on HQ');
+      setActiveSphere('hq');
+      dispatchCamera('center', { targetSphere: 'hq' });
+      appendTranscript(
+        'Cerebro',
+        `Completed the ${tourState.mode} tour across ${steps.length} screens.`,
+        'tour_control(completed)'
+      );
+      setTourState((previous) => ({
+        ...previous,
+        active: false,
         paused: false,
-        step: nextStep,
+        step: 1,
         total: steps.length,
-        secondsLeft: nextStopObj.durationSec || 10,
-        currentScreenId: nextStopObj.screenId,
-      };
-    });
-  }, [applyTourStop, appendTranscript, clearTourSubStepTimers, dispatchCamera]);
+        secondsLeft: steps[0]?.durationSec || 10,
+        currentScreenId: steps[0]?.screenId || 'S01',
+      }));
+      return;
+    }
+    const stop = steps[nextStep - 1];
+    setTourState((previous) => ({
+      ...previous,
+      active: true,
+      paused: false,
+      step: nextStep,
+      total: steps.length,
+      secondsLeft: stop.durationSec || 10,
+      currentScreenId: stop.screenId,
+    }));
+    applyTourStop(nextStep, tourState.mode);
+  }, [appendTranscript, applyTourStop, clearTourSubStepTimers, dispatchCamera, tourState.mode, tourState.step]);
 
   const handlePrevTourStop = useCallback(() => {
-    setTourState((prev) => {
-      const steps = getTourStepsForMode(prev.mode);
-      const prevStep = Math.max(1, prev.step - 1);
-      const prevStopObj = steps[prevStep - 1] || steps[0];
-      applyTourStop(prevStep, prev.mode);
-      return {
-        ...prev,
-        active: true,
-        paused: false,
-        step: prevStep,
-        total: steps.length,
-        secondsLeft: prevStopObj.durationSec || 10,
-        currentScreenId: prevStopObj.screenId,
-      };
-    });
-  }, [applyTourStop]);
+    const steps = getTourStepsForMode(tourState.mode);
+    const previousStep = Math.max(1, tourState.step - 1);
+    const stop = steps[previousStep - 1];
+    setTourState((previous) => ({
+      ...previous,
+      active: true,
+      paused: false,
+      step: previousStep,
+      total: steps.length,
+      secondsLeft: stop.durationSec || 10,
+      currentScreenId: stop.screenId,
+    }));
+    applyTourStop(previousStep, tourState.mode);
+  }, [applyTourStop, tourState.mode, tourState.step]);
 
-  // Guided Tour countdown timer (respects autoAdvance & paused)
+  // Countdown updates state; navigation and narration run outside state updaters.
   useEffect(() => {
     if (!tourState.active || tourState.paused || !tourState.autoAdvance) return;
-
-    const timer = window.setInterval(() => {
-      setTourState((prev) => {
-        if (!prev.active || prev.paused || !prev.autoAdvance) return prev;
-        if (prev.secondsLeft > 1) {
-          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
-        }
-        const steps = getTourStepsForMode(prev.mode);
-        const nextStep = prev.step + 1;
-        if (nextStep > steps.length) {
-          clearTourSubStepTimers();
-          cerebroScreenStore.setPulsedCta(null);
-          setTourHighlightId(null);
-          setCaptionBubble('18-Screen Wireframe v1.1 Tour complete · Centred on HQ');
-          dispatchCamera('center', { targetSphere: 'hq' });
-          return {
-            ...prev,
-            active: false,
-            paused: false,
-            step: 1,
-            total: steps.length,
-            secondsLeft: steps[0]?.durationSec || 10,
-            currentScreenId: steps[0]?.screenId || 'S01',
-          };
-        }
-        const nextStopObj = steps[nextStep - 1] || steps[0];
-        applyTourStop(nextStep, prev.mode);
-        return {
-          ...prev,
-          step: nextStep,
-          total: steps.length,
-          secondsLeft: nextStopObj.durationSec || 10,
-          currentScreenId: nextStopObj.screenId,
-        };
-      });
+    const timer = window.setTimeout(() => {
+      if (tourState.secondsLeft > 1) {
+        setTourState((previous) => ({
+          ...previous,
+          secondsLeft: previous.secondsLeft - 1,
+        }));
+      } else {
+        handleNextTourStop();
+      }
     }, 1000);
-
-    return () => window.clearInterval(timer);
-  }, [
-    tourState.active,
-    tourState.paused,
-    tourState.autoAdvance,
-    applyTourStop,
-    clearTourSubStepTimers,
-    dispatchCamera,
-  ]);
+    return () => window.clearTimeout(timer);
+  }, [handleNextTourStop, tourState.active, tourState.paused, tourState.autoAdvance, tourState.secondsLeft]);
 
   // Keep activeScreenCtas synced in cerebroScreenStore whenever openPanels or activeSphere changes
   useEffect(() => {
@@ -1042,15 +1022,12 @@
   }, [activeSphere, openPanels, selectedProjectId, tourState.active, tourState.currentScreenId]);
 
   const handleUserTouchPauseTour = useCallback(() => {
-    setTourState((prev) => {
-      if (prev.active && !prev.paused) {
-        clearTourSubStepTimers();
-        setCaptionBubble('Tour paused — press Resume to continue');
-        return { ...prev, paused: true };
-      }
-      return prev;
-    });
-  }, [clearTourSubStepTimers]);
+    if (!tourState.active || tourState.paused) return;
+    clearTourSubStepTimers();
+    setTourControllerPhase('paused');
+    setCaptionBubble('Tour paused — press Resume to continue');
+    setTourState((previous) => ({ ...previous, paused: true }));
+  }, [clearTourSubStepTimers, tourState.active, tourState.paused]);
 
   // UNIFIED TYPED ACTION EXECUTOR — Single dispatcher for Voice Tools, Natural Language, Touch, Keyboard, Tour & Self-Tests
   const executeTypedAction = useCallback(
@@ -1477,23 +1454,19 @@
             setTourState((prev) => ({ ...prev, paused: true }));
             setCaptionBubble('Tour paused');
           } else if (action.action === 'resume') {
-            setTourState((prev) => {
-              if (!prev.active) {
-                const steps = getTourStepsForMode(prev.mode);
-                applyTourStop(1, prev.mode);
-                return {
-                  ...prev,
-                  active: true,
-                  paused: false,
-                  step: 1,
-                  total: steps.length,
-                  secondsLeft: steps[0]?.durationSec || 10,
-                  currentScreenId: steps[0]?.screenId || 'S01',
-                };
-              }
-              applyTourStop(prev.step, prev.mode);
-              return { ...prev, paused: false };
-            });
+            const steps = getTourStepsForMode(tourState.mode);
+            const step = tourState.active ? tourState.step : 1;
+            const stop = steps[step - 1] || steps[0];
+            setTourState((previous) => ({
+              ...previous,
+              active: true,
+              paused: false,
+              step,
+              total: steps.length,
+              secondsLeft: tourState.active ? previous.secondsLeft : stop?.durationSec || 10,
+              currentScreenId: stop?.screenId || 'S01',
+            }));
+            applyTourStop(step, tourState.mode);
           } else if (action.action === 'next') {
             handleNextTourStop();
           } else if (action.action === 'prev') {
@@ -1573,10 +1546,8 @@
             };
           }
           if (dir === 'resume') {
-            setTourState((prev) => {
-              applyTourStop(prev.step, prev.mode);
-              return { ...prev, active: true, paused: false };
-            });
+            setTourState((previous) => ({ ...previous, active: true, paused: false }));
+            applyTourStop(tourState.step, tourState.mode);
             return {
               ok: true,
               action: 'step_tour',
@@ -2331,17 +2302,17 @@
   const handleSelectNode = useCallback(
     (id: string, nodeType: AnchoredLabel2D['nodeType'], sphere: 'hq' | 'cde') => {
       handleUserTouchPauseTour();
-      setActiveSphere(sphere);
-      const action = buildNodeSelectionAction(id, nodeType, sphere);
-      executeTypedAction(action, 'sphere_node');
       if (nodeType === 'core') {
+        pushNavSnapshot();
+        setActiveSphere(sphere);
         setFocusedNodeId(null);
+        setOpenPanels([]);
         dispatchCamera('center', { targetSphere: sphere });
-      } else {
-        dispatchCamera('focus_node', { targetSphere: sphere, targetNodeId: id });
+        return;
       }
+      executeTypedAction(buildNodeSelectionAction(id, nodeType, sphere), 'sphere_node');
     },
-    [dispatchCamera, executeTypedAction, handleUserTouchPauseTour]
+    [dispatchCamera, executeTypedAction, handleUserTouchPauseTour, pushNavSnapshot]
   );
 
   // Live Page State Snapshot for Developer View & `get_page_state` (cerebro-ui/4)
@@ -2583,9 +2554,11 @@
               attachmentName: pendingTaskProposal.attachmentName,
             }),
           });
+          if (!res.ok) throw new Error(`Task save failed (HTTP ${res.status})`);
           const data = await res.json();
+          if (!data?.task?.id) throw new Error('Task save returned no task ID');
           const newTask: CustomTaskItem = {
-            id: data?.task?.id || `task-${Date.now()}`,
+            id: String(data.task.id),
             title: pendingTaskProposal.summary,
             projectCode: pendingTaskProposal.projectCode,
             owner: '39 (Tarek Nojara) — Founder and Culture and Design Engineer',
@@ -2598,11 +2571,17 @@
             'Cerebro',
             `Created task "${newTask.title}" under ${newTask.projectCode}.`
           );
-        } catch {}
+          setPendingTaskProposal(null);
+        } catch (error) {
+          appendTranscript(
+            'Cerebro',
+            error instanceof Error ? error.message : 'Task save failed. Please retry.'
+          );
+        }
       } else {
         appendTranscript('Cerebro', 'Kept as a saved note without creating a task.');
+        setPendingTaskProposal(null);
       }
-      setPendingTaskProposal(null);
     },
     [audienceLevel, pendingTaskProposal, appendTranscript, ensurePanelOpen]
   );
@@ -2624,7 +2603,7 @@
     [activeSphere, dispatchCamera, ensurePanelOpen, handleUserTouchPauseTour]
   );
 
-  // 16-Point Real Assertion-Based Self-Test Suite (Runs inside Developer View using isolated isTest: true data + cleanup)
+  // 21-Point Assertion-Based Self-Test Suite (Runs inside Developer View using isolated isTest: true data + cleanup)
   const runAutomatedJourneySelfTest = useCallback(async () => {
     setShowDeveloperDrawer(true);
     setSelfTestRunning(true);
@@ -2766,8 +2745,8 @@
       await wait(100);
       updateCheck(
         '06',
-        'PASS',
-        'Switched HQ -> CDE and restored previous HQ context via navigation history stack'
+        telemetryRef.current.sphere === 'hq' ? 'PASS' : 'FAIL',
+        `Camera sphere after back: ${telemetryRef.current.sphere}`
       );
 
       // 07: Panel Minimise & Restore with Unsent Draft, Tab & Scroll Preservation
@@ -2880,7 +2859,7 @@
       updateCheck(
         '11',
         persistedOk ? 'PASS' : 'FAIL',
-        `Verified in .cerebro-data/store.json (notes=${stateData?.notes?.length}, tasks=${stateData?.tasks?.length})`
+        `API state returned notes=${stateData?.notes?.length}, tasks=${stateData?.tasks?.length}`
       );
 
       // 12: Real Binary File Upload with SHA-256 Verification
@@ -2921,7 +2900,7 @@
       updateCheck(
         '13',
         failRes.status === 503 ? 'PASS' : 'FAIL',
-        `Server returned HTTP ${failRes.status} on simulated failure (client preserves draft)`
+        `Server returned HTTP ${failRes.status}; UI draft preservation needs separate verification`
       );
 
       // 14: Truthful Meeting Notes Recipient Validation & Draft Status
@@ -3021,7 +3000,7 @@
       updateCheck(
         '18',
         Boolean(orbEl) && orbLines === 16 ? 'PASS' : 'FAIL',
-        `Living Lens radial bars=${orbLines}/16 · 6,400-particle GPU Bokeh Galaxy & Bloom active`
+        `Living Lens radial bars=${orbLines}/16; particle count and bloom are unverified here`
       );
 
       // 19: GUI Amendment v3.0 Zero-Overlap Layout & 36x24mm Optical Matrix
@@ -3159,9 +3138,9 @@
       } else if (screenId === 'S03') {
         ensurePanelOpen('projects', true);
       } else if (screenId === 'S04') {
-        dispatchCamera('switch_sphere', {
-          targetSphere: activeSphere === 'hq' ? 'cde' : 'hq',
-        });
+        const targetSphere = activeSphere === 'hq' ? 'cde' : 'hq';
+        setActiveSphere(targetSphere);
+        dispatchCamera('switch_sphere', { targetSphere });
       } else if (screenId === 'S05') {
         ensurePanelOpen('project-detail', true);
       } else if (screenId === 'S08') {
@@ -3230,7 +3209,7 @@
           setPortalHudOpen(true);
         }}
         onUserTouchPauseTour={handleUserTouchPauseTour}
-        onTelemetryChange={setTelemetry}
+        onTelemetryChange={handleTelemetryChange}
         onCameraSettled={handleCameraSettled}
         unobstructedRect={guiLayout.centerSafeRect}
         guiCameraPreset={guiCameraPreset}
@@ -4322,7 +4301,7 @@
                   onClick={runAutomatedJourneySelfTest}
                   className="min-h-[40px] px-3.5 py-1.5 rounded-lg font-mono text-xs bg-[#D4AF37] text-[#101622] font-semibold cursor-pointer disabled:opacity-50"
                 >
-                  {selfTestRunning ? 'Running 16 Assertions...' : 'Run 16-Point Self-Test'}
+                  {selfTestRunning ? 'Running 21 Assertions...' : 'Run 21-Point Self-Test'}
                 </button>
                 <button
                   type="button"
@@ -4407,7 +4386,7 @@
                       Unmapped Tools:{' '}
                       {unmappedTools.length === 0 ? '0 (All 18 verified)' : unmappedTools.join(', ')}
                     </div>
-                    <div>WebGL Active: {String(telemetry.webglActive ?? true)}</div>
+                    <div>WebGL Active: {telemetryReceived ? String(telemetry.webglActive ?? 'unknown') : 'waiting for telemetry'}</div>
                   </div>
                 </div>
 
@@ -4427,11 +4406,11 @@
                   </div>
                 </div>
 
-                {/* 16-Point Real Assertion-Based Self-Test Results */}
+                {/* 21-Point Assertion-Based Self-Test Results */}
                 {selfTestResults.length > 0 && (
                   <div className="space-y-1.5">
                     <div className="font-mono text-xs text-[#D4AF37] font-semibold">
-                      16-POINT ASSERTION-BASED SELF-TEST RESULTS (ISOLATED TEST DATA CLEANED UP)
+                      21-POINT ASSERTION-BASED SELF-TEST RESULTS (ISOLATED TEST DATA CLEANED UP)
                     </div>
                     {selfTestResults.map((chk) => (
                       <div
