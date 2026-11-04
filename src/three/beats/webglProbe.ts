export interface WebglProbe {
  supported: boolean;
  softwareGl: boolean;
  reason: string;
}

const SOFTWARE_RENDERER = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i;

/** One throwaway context to learn whether WebGL exists and whether it is a software rasteriser. */
export function probeWebgl(): WebglProbe {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { supported: false, softwareGl: false, reason: 'WebGL context unavailable on this device/browser.' };
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { supported: true, softwareGl: SOFTWARE_RENDERER.test(renderer), reason: '' };
  } catch (err) {
    return { supported: false, softwareGl: false, reason: err instanceof Error ? err.message : 'WebGL probe failed' };
  }
}
