# Calm cinematic tour & hierarchy

## Hierarchy
- **Nav HUD** — `.lg-role-nav` frosted low-profile
- **Agent dock** — `.lg-role-agent` / `.lg-voice` indigo accent + glow; docks **bottom-left** during tours
- **Context panels** — `.lg-panel` / `.lg-card` warm slate borders (distinct from agent speech)

## Tour coordinator (`src/tour/tourStepCoordinator.ts`)
1. Camera settle ≥ ~1800ms before present  
2. Orient pause 400ms  
3. Speech hold — countdown **does not tick** while `Speaking` / `Thinking`  
4. Reading cushion 2000ms before next step  
5. Step duration × **1.45** (min 14s)  
6. Captions capped to 1 headline + ≤2 short lines  

## Voice calmness
- Browser TTS rate **0.9**, pitch 0.96  
- ElevenLabs stability **0.7**, similarity **0.65**  
- Sentence `<break time="750ms" />` in paced narration transcripts  

## Cinematic post (existing EffectComposer — no R3F)
- Bloom 0.42 / thresh 0.78 · vignette 0.22 · grain 0.015 · CA 0.001 · ACES exposure 1.1  
- DOM/text remain above the scene compositor (no grain on UI copy)
