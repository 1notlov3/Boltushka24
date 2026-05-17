"use client";

import { Mic, Send, Square, Trash2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";
import { uploadToSupabase } from "@/lib/upload";

const MAX_RECORDING_SECONDS = 60;

type RecorderMode = "idle" | "recording" | "uploading";

interface VoiceRecorderProps {
  onSend: (fileUrl: string, durationSeconds: number) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

function supportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function VoiceRecorder({ onSend, disabled, className }: VoiceRecorderProps) {
  const [mode, setMode] = useState<RecorderMode>("idle");
  const [elapsed, setElapsed] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const sendOnStopRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    sendOnStopRef.current = false;
  }, []);

  const drawWaveform = useCallback(function draw() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);

    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(99, 102, 241, 0.08)";
    context.fillRect(0, 0, width, height);
    context.lineWidth = 2;
    context.strokeStyle = "#6366f1";
    context.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    data.forEach((value, index) => {
      const y = (value / 255) * height;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
      x += sliceWidth;
    });

    context.stroke();
    animationFrameRef.current = requestAnimationFrame(draw);
  }, []);

  const finishRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    const shouldSend = sendOnStopRef.current;
    const durationSeconds = Math.min(
      MAX_RECORDING_SECONDS,
      Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
    );
    const blob = new Blob(chunksRef.current, { type: recorder?.mimeType || "audio/webm" });

    cleanup();

    if (!shouldSend || !blob.size) {
      setMode("idle");
      return;
    }

    setMode("uploading");
    try {
      const file = new File([blob], `voice-${crypto.randomUUID()}.webm`, { type: "audio/webm" });
      const fileUrl = await uploadToSupabase(file, "voice", file.name);
      await onSend(fileUrl, durationSeconds);
    } catch (error) {
      console.error("[VOICE_UPLOAD]", error);
      toast.error("Не удалось отправить голосовое сообщение");
    } finally {
      setMode("idle");
      setElapsed(0);
    }
  }, [cleanup, onSend]);

  const stopRecording = useCallback((send: boolean) => {
    const recorder = mediaRecorderRef.current;
    sendOnStopRef.current = send;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      void finishRecording();
    }
  }, [finishRecording]);

  const startRecording = useCallback(async () => {
    if (disabled || mode !== "idle") return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Запись голоса недоступна в этом браузере");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = supportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 1024;
      source.connect(analyser);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        void finishRecording();
      };

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setMode("recording");
      recorder.start(250);
      drawWaveform();
    } catch (error) {
      console.error("[VOICE_START]", error);
      cleanup();
      toast.error("Не удалось получить доступ к микрофону");
      setMode("idle");
    }
  }, [cleanup, disabled, drawWaveform, finishRecording, mode]);

  useEffect(() => {
    if (mode !== "recording") return;

    const interval = setInterval(() => {
      const nextElapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(nextElapsed);
      if (nextElapsed >= MAX_RECORDING_SECONDS) {
        stopRecording(true);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [mode, stopRecording]);

  useEffect(() => cleanup, [cleanup]);

  return (
    <>
      <ActionTooltip label={mode === "recording" ? "Остановить и отправить" : "Голосовое сообщение"} side="top">
        <button
          type="button"
          disabled={disabled || mode === "uploading"}
          onClick={mode === "recording" ? () => stopRecording(true) : startRecording}
          className={cn(
            "h-10 w-10 sm:h-7 sm:w-7 rounded-full bg-zinc-500 p-1 text-white transition hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-400 dark:text-[#313338] dark:hover:bg-zinc-300",
            mode === "recording" && "bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:text-white",
            className,
          )}
          aria-label={mode === "recording" ? "Остановить и отправить голосовое сообщение" : "Записать голосовое сообщение"}
        >
          {mode === "uploading" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : mode === "recording" ? (
            <Square className="h-5 w-5 fill-current" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
      </ActionTooltip>

      {mode !== "idle" && (
        <div className="absolute bottom-full left-3 right-3 z-30 mb-2 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {mode === "uploading" ? "Отправка голосового сообщения" : "Запись голоса"}
            </p>
            <span className="rounded-sm bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {elapsed}s / {MAX_RECORDING_SECONDS}s
            </span>
          </div>
          <canvas ref={canvasRef} width={520} height={72} className="h-16 w-full rounded-md bg-indigo-500/5" />
          {mode === "recording" && (
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Trash2 className="h-4 w-4" />
                Отменить
              </button>
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-indigo-500 px-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
              >
                <Send className="h-4 w-4" />
                Отправить
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
