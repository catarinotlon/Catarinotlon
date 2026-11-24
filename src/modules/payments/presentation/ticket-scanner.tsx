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

/** Props of {@link TicketScanner}. */
export interface TicketScannerProps {
  /** Called with the UUID read from the ticket's QR code. */
  onTicket: (ticketId: string) => void;
}

/**
 * Reads a ticket's QR code with the device camera.
 *
 * @remarks
 * It uses the browser's native barcode detector. Where that is missing, it says
 * so and the admin searches by name or bib number instead.
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

    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
      .BarcodeDetector;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    async function start(DetectorClass: BarcodeDetectorConstructor) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const video = videoRef.current;
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play();

        const detector = new DetectorClass({ formats: ['qr_code'] });
        timer = setInterval(async () => {
          const [code] = await detector.detect(video).catch(() => []);
          if (code?.rawValue) {
            setScanning(false);
            onTicket(code.rawValue);
          }
        }, SCAN_INTERVAL_MS);
      } catch {
        setUnavailable(true);
        setScanning(false);
      }
    }

    if (Detector) {
      void start(Detector);
    } else {
      queueMicrotask(() => {
        setUnavailable(true);
        setScanning(false);
      });
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning, onTicket]);

  return (
    <div className="ph-no-capture flex flex-col gap-3">
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
      {unavailable && <p className="m-0 text-sm text-muted-foreground">{t('scanUnavailable')}</p>}
    </div>
  );
}
