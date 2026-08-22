/*
 * CAMERA CAPTURE (2026-08-22, Programador 3)
 *
 * Two ways in, on purpose:
 *
 * 1. LIVE PREVIEW with `getUserMedia`. What you expect from an app: you see the
 *    frame before you take it, and you can flip to the front camera.
 * 2. THE SYSTEM PICKER as fallback (`<input type=file capture>`). It needs no
 *    permission prompt of its own, it works inside an installed PWA on iOS, and
 *    it still offers the photo library — which the live path cannot.
 *
 * The fallback is not a nicety: `getUserMedia` fails for reasons the user cannot
 * fix from here — permission denied at OS level, camera held by another app, an
 * iOS version that blocks it in standalone. When it fails, the component says so
 * and offers the picker instead of leaving a dead button. A camera that cannot
 * say "I could not open" is the same bug this project keeps finding elsewhere.
 *
 * Returns a real `File`, so it drops straight into the existing upload path.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onCaptura: (archivo: File) => void;
  onCerrar: () => void;
  /** Which camera to open first. Back by default: this is used to photograph things, not faces. */
  camaraInicial?: "environment" | "user";
};

export function CapturaCamara({ onCaptura, onCerrar, camaraInicial = "environment" }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  const entrada = useRef<HTMLInputElement | null>(null);
  const [cara, setCara] = useState<"environment" | "user">(camaraInicial);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const parar = useCallback(() => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setError(null);
      setListo(false);
      parar();

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no permite abrir la cámara.");
        return;
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cara },
          audio: false,
        });
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        flujo.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
        setListo(true);
      } catch (e) {
        const err = e as DOMException;
        // Say which wall we hit: the user can only act on the first two.
        const motivo =
          err.name === "NotAllowedError"
            ? "No nos has dado permiso para la cámara."
            : err.name === "NotFoundError"
              ? "No hemos encontrado ninguna cámara."
              : err.name === "NotReadableError"
                ? "La cámara la está usando otra aplicación."
                : "No hemos podido abrir la cámara.";
        setError(motivo);
      }
    })();

    return () => {
      cancelado = true;
      parar();
    };
  }, [cara, parar]);

  const disparar = useCallback(() => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const lienzo = document.createElement("canvas");
    lienzo.width = v.videoWidth;
    lienzo.height = v.videoHeight;
    lienzo.getContext("2d")!.drawImage(v, 0, 0);
    lienzo.toBlob(
      (b) => {
        if (!b) return;
        parar();
        onCaptura(new File([b], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }, [onCaptura, parar]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1">
        {!error && (
          <video
            ref={video}
            playsInline
            muted
            className="h-full w-full object-contain"
          />
        )}

        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-white">
            <p className="text-base">{error}</p>
            <button
              type="button"
              onClick={() => entrada.current?.click()}
              className="min-h-[44px] rounded-xl bg-white px-5 py-3 text-black"
            >
              Hacer la foto con la cámara del móvil
            </button>
          </div>
        )}
      </div>

      {/* The system picker: fallback when the live path fails, and the only way
          to reach the photo library. `capture` opens the camera straight away on
          a phone; on a desktop it is ignored and you get the file dialog. */}
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        capture={cara}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            parar();
            onCaptura(f);
          }
        }}
      />

      <div className="flex items-center justify-between gap-4 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            parar();
            onCerrar();
          }}
          className="min-h-[44px] min-w-[44px] px-3 text-white"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={disparar}
          disabled={!listo}
          aria-label="Hacer la foto"
          className="h-[72px] w-[72px] rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
        />

        <button
          type="button"
          onClick={() => setCara((c) => (c === "environment" ? "user" : "environment"))}
          className="min-h-[44px] min-w-[44px] px-3 text-white"
        >
          Girar
        </button>
      </div>
    </div>
  );
}
