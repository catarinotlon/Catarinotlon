import QRCode from 'qrcode';

/**
 * Replaces the camera with one that films a QR code, for stories in a real browser.
 *
 * @param text - What the QR code carries, such as a ticket UUID.
 * @param options - `withoutNativeDetector` pretends to be Safari, which has no `BarcodeDetector`.
 * @returns A cleanup that restores the real camera.
 */
export async function filmQrCode(
  text: string,
  options: { withoutNativeDetector?: boolean } = {},
): Promise<() => void> {
  const original = Object.getOwnPropertyDescriptor(window, 'BarcodeDetector');
  const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  if (options.withoutNativeDetector) Reflect.deleteProperty(window, 'BarcodeDetector');

  const camera = document.createElement('canvas');
  await QRCode.toCanvas(camera, text, { width: 480, margin: 4 });
  // A canvas stream only emits a frame when the canvas is painted.
  const repaint = setInterval(() => camera.getContext('2d')?.drawImage(camera, 0, 0), 100);
  navigator.mediaDevices.getUserMedia = async () => camera.captureStream(10);

  return () => {
    clearInterval(repaint);
    navigator.mediaDevices.getUserMedia = getUserMedia;
    if (original) Object.defineProperty(window, 'BarcodeDetector', original);
  };
}

/**
 * Blocks the camera, as when the admin denies the permission.
 *
 * @returns A cleanup that restores the real camera.
 */
export function blockCamera(): () => void {
  const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = () =>
    Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  return () => {
    navigator.mediaDevices.getUserMedia = getUserMedia;
  };
}
