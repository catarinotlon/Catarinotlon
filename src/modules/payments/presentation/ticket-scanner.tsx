'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';

const SCAN_INTERVAL_MS = 300;
const REJECTED_FOR_MS = 2400;
const VIBRATION_MS = 30;

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

/** What the scanner's owner decided about a code it read. */
export type CodeOutcome = 'accepted' | 'rejected' | 'ignored';

/** Props of {@link TicketScanner}. */
export interface TicketScannerProps {
  /**
   * Called with every QR code read. `accepted` marks it as read (green frame and
   * a short vibration), `rejected` says it is not a ticket, `ignored` does nothing.
   */
  onCode: (code: string) => CodeOutcome;
  /** Stops reading without turning the camera off, while a result is open. */
  paused?: boolean;
}

const CORNERS = [
  'top-0 left-0 rounded-tl-xl border-t-4 border-l-4',
  'top-0 right-0 rounded-tr-xl border-t-4 border-r-4',
  'bottom-0 left-0 rounded-bl-xl border-b-4 border-l-4',
  'right-0 bottom-0 rounded-br-xl border-r-4 border-b-4',
];

/**
 * Reads QR codes with the device camera and keeps it on between runners.
 *
 * @remarks
 * It uses the browser's native barcode detector where there is one and the
 * jsQR decoder everywhere else, so it works on iPhone too. When the camera
 * cannot be opened (permission denied, no camera, or a page without HTTPS), it
 * says so and the admin searches by name or bib number instead. Its owner
 * decides what each code is; the frame closes in green on an accepted code and
 * turns red, with a notice, on a rejected one.
 *
 * @param props - The callback for each code and whether reading is paused.
 * @returns The scanner.
 */
export function TicketScanner({ onCode, paused = false }: TicketScannerProps) {
  const t = useTranslations('admin.kits');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [feedback, setFeedback] = useState<'accepted' | 'rejected' | null>(null);
  const pausedRef = useRef(paused);
  const onCodeRef = useRef(onCode);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused)
      queueMicrotask(() => setFeedback((current) => (current === 'accepted' ? null : current)));
  }, [paused]);

  useEffect(() => {
    if (feedback !== 'rejected') return;
    const timer = setTimeout(() => setFeedback(null), REJECTED_FOR_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

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
          if (pausedRef.current) return;
          const code = await read(video);
          if (!code || pausedRef.current) return;
          const outcome = onCodeRef.current(code);
          if (outcome === 'accepted') {
            pausedRef.current = true;
            navigator.vibrate?.(VIBRATION_MS);
            setFeedback('accepted');
          } else if (outcome === 'rejected') {
            setFeedback('rejected');
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
  }, [scanning]);

  const cornerColor =
    feedback === 'accepted'
      ? 'border-success-glow'
      : feedback === 'rejected'
        ? 'border-on-ink-accent'
        : scanning
          ? 'border-white'
          : 'border-white/60';

  return (
    <div className="ph-no-capture flex flex-col gap-3">
      <div className="relative flex h-[min(60dvh,30rem)] items-center justify-center overflow-hidden rounded-3xl bg-ink p-8 text-center md:aspect-[4/3] md:h-auto">
        {scanning && (
          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {!scanning && (
          <p className="relative m-0 max-w-60 font-semibold text-primary-foreground">
            {t('scanHint')}
          </p>
        )}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[min(70%,16rem)] -translate-x-1/2 -translate-y-1/2 transition-transform duration-180 ease-out motion-reduce:transition-none',
            feedback === 'accepted' && 'scale-75',
          )}
        >
          {CORNERS.map((corner) => (
            <span
              key={corner}
              className={cn(
                'absolute size-9 transition-colors duration-150 motion-reduce:transition-none',
                corner,
                cornerColor,
              )}
            />
          ))}
        </div>
        {scanning && (
          <span
            className={cn(
              'absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors duration-150',
              feedback === 'accepted'
                ? 'bg-success text-success-foreground'
                : 'bg-ink/75 text-primary-foreground',
            )}
          >
            {feedback === 'accepted' ? t('ticketRead') : t('pointAtTicket')}
          </span>
        )}
        {feedback === 'rejected' && (
          <p
            role="status"
            className="absolute inset-x-3 top-3 m-0 flex animate-toast-in items-center gap-2 rounded-2xl bg-surface p-3 text-left text-sm font-bold text-foreground shadow-lg"
          >
            <svg
              aria-hidden="true"
              className="size-5 shrink-0 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l10 18H2z" />
              <path d="M12 10v5M12 18v.01" />
            </svg>
            {t('notTicket')}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant={scanning ? 'outline' : 'inverse'}
        fullWidth
        onClick={() => {
          setUnavailable(false);
          setScanning((value) => !value);
        }}
      >
        {scanning ? t('stopScan') : t('scan')}
      </Button>
      {unavailable && <p className="m-0 text-sm text-muted-foreground">{t('cameraUnavailable')}</p>}
    </div>
  );
}
