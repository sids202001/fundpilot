// WebGL Capability Detector
// Detects whether WebGL context creation is supported and enabled in the browser

export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl && (window.WebGLRenderingContext && gl instanceof WebGLRenderingContext));
  } catch (e) {
    return false;
  }
}
