'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';

const SCAN_INTERVAL_MS = 300;

interface DetectedBarcode {
  readonly rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/** Reads the QR code in the video's current frame, if there is one. */
type FrameReader = (video: HTMLVideoElement) => Promise<string | undefined>;

/**
 * Uses the browser's native barcode detector where it exists (Chrome on Android)
 * and the jsQR decoder elsewhere (Safari, every browser on iPhone, Firefox).
 */
async function createFrameReader(): Promise<FrameReader> {
  const Native = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  if (Native) {
    const detector = new Native({ formats: ['qr_code'] });
    return async (video) => {
      const [code] = await detector.detect(video).catch(() => []);
      return code?.rawValue || undefined;
    };
  }

  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    const { videoWidth: width, videoHeight: height } = video;
    if (!context || width === 0 || height === 0) return undefined;
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    return jsQR(data, width, height, { inversionAttempts: 'dontInvert' })?.data || undefined;
  };
}

/** Props of {@link TicketScanner}. */
export interface TicketScannerProps {
  /** Called with the UUID read from the ticket's QR code. */
  onTicket: (ticketId: string) => void;
}

/**
 * Reads a ticket's QR code with the device camera.
 *
 * @remarks
 * It uses the browser's native barcode detector where there is one and the
 * jsQR decoder everywhere else, so it works on iPhone too. When the camera
 * cannot be opened (permission denied, no camera, or a page without HTTPS), it
 * says so and the admin searches by name or bib number instead.
 *
 * @param props - The callback for a scanned ticket.
 * @returns The scanner.
 */
export function TicketScanner({ onTicket }: TicketScannerProps) {
  const t = useTranslations('admin.kits');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!scanning) return;

    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const video = videoRef.current;
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play();

        const read = await createFrameReader();
        if (cancelled) return;
        timer = setInterval(async () => {
          const ticketId = await read(video);
          if (ticketId) {
            setScanning(false);
            onTicket(ticketId);
          }
        }, SCAN_INTERVAL_MS);
      } catch {
        setUnavailable(true);
        setScanning(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning, onTicket]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-3xl bg-ink p-8 text-center">
        {scanning && (
          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {!scanning && <p className="m-0 font-semibold text-primary-foreground">{t('scanHint')}</p>}
        {[
          'top-5 left-5 rounded-tl-lg border-t-3 border-l-3',
          'top-5 right-5 rounded-tr-lg border-t-3 border-r-3',
          'bottom-5 left-5 rounded-bl-lg border-b-3 border-l-3',
          'right-5 bottom-5 rounded-br-lg border-r-3 border-b-3',
        ].map((corner) => (
          <span
            key={corner}
            aria-hidden="true"
            className={cn('pointer-events-none absolute size-9 border-white', corner)}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="inverse"
        fullWidth
        onClick={() => setScanning((value) => !value)}
      >
        {scanning ? t('stopScan') : t('scan')}
      </Button>
      {unavailable && <p className="m-0 text-sm text-muted-foreground">{t('cameraUnavailable')}</p>}
    </div>
  );
}
