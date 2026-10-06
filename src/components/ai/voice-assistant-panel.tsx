"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseVoiceCommand, ParsedVoiceCommand } from "@/lib/ai/voice-parser";
import {
  executeVoiceCommand,
  VoiceCommandExecutionResult,
  saveVoiceRecording,
  getVoiceRecordings,
  deleteVoiceRecording,
  VoiceRecordingRecord,
} from "@/actions/voice-commands";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Languages,
  Loader2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Download,
  Trash2,
  Send,
  Sliders,
  Radio,
  FileAudio,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { emitFinancialEvent } from "@/lib/events/financial-events";

interface VoiceAssistantPanelProps {
  onCommandExecuted?: (result: VoiceCommandExecutionResult) => void;
}

const LANGUAGES = [
  { code: "en-IN", name: "English (India)" },
  { code: "hi-IN", name: "Hindi (हिन्दी)" },
  { code: "mr-IN", name: "Marathi (मराठी)" },
];

const PLAYBACK_SPEEDS = [0.5, 1.0, 1.25, 1.5, 2.0];

export function VoiceAssistantPanel({ onCommandExecuted }: VoiceAssistantPanelProps) {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState("en-IN");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [parsedCommand, setParsedCommand] = useState<ParsedVoiceCommand | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<VoiceCommandExecutionResult | null>(null);
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(24).fill(10));
  const [noiseRms, setNoiseRms] = useState(0); // in dB
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>("");
  const [clarificationValue, setClarificationValue] = useState("");
  const [savedRecordings, setSavedRecordings] = useState<VoiceRecordingRecord[]>([]);
  const [activeRecordingToPlay, setActiveRecordingToPlay] = useState<string | null>(null);

  // Audio & Lifecycle references
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Load available microphone inputs
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const mics = devices.filter((d) => d.kind === "audioinput");
          setAvailableMics(mics);
          if (mics.length > 0 && !selectedMicId) {
            setSelectedMicId(mics[0].deviceId);
          }
        })
        .catch(() => {});
    }
  }, [selectedMicId]);

  // Load saved recordings from database
  const loadSavedRecordings = useCallback(async () => {
    try {
      const records = await getVoiceRecordings();
      setSavedRecordings(records);
    } catch {}
  }, []);

  useEffect(() => {
    loadSavedRecordings();
  }, [loadSavedRecordings]);

  // Initialize Continuous Speech Recognition (only re-inits when language changes)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLang;

        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const item = event.results[i];
            const text = item[0]?.transcript || "";
            if (item.isFinal) {
              finalTranscriptRef.current += (finalTranscriptRef.current ? " " : "") + text.trim();
            } else {
              interim += text;
            }
          }

          const liveText = (finalTranscriptRef.current + (interim ? " " + interim : "")).trim();
          if (liveText) {
            setTranscript(liveText);
            const parsed = parseVoiceCommand(liveText);
            setParsedCommand(parsed);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== "no-speech") {
            console.warn("Speech recognition notice:", event.error);
          }
        };

        recognition.onend = () => {
          // Keep continuous recognition running while active
          if (isRecordingRef.current && !isPausedRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [selectedLang]);

  // Web Audio API live waveform analyzer
  const startAudioAnalysis = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWaveform = () => {
        analyser.getByteFrequencyData(dataArray);

        // Convert first 24 frequencies to bar heights
        const bars: number[] = [];
        let sum = 0;
        for (let i = 0; i < 24; i++) {
          const val = dataArray[i] || 0;
          bars.push(Math.max(12, Math.round((val / 255) * 80)));
          sum += val * val;
        }
        setAudioLevel(bars);

        // Calculate RMS noise level in dB
        const rms = Math.sqrt(sum / bufferLength);
        const dbLevel = rms > 0 ? Math.round(20 * Math.log10(rms)) : 0;
        setNoiseRms(dbLevel);

        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch (err) {
      console.warn("AudioContext visualizer init notice:", err);
    }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setAudioLevel(new Array(24).fill(10));
    setNoiseRms(0);
  };

  // Start voice recording session
  const startRecording = async () => {
    setExecutionResult(null);
    finalTranscriptRef.current = "";
    setTranscript("");
    setParsedCommand(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    setIsRecording(true);
    setIsPaused(false);
    isRecordingRef.current = true;
    isPausedRef.current = false;

    // 1. Web Speech
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = selectedLang;
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition start notice:", e);
      }
    }

    // 2. MediaRecorder & Web Audio
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const constraints = {
          audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        micStreamRef.current = stream;

        startAudioAnalysis(stream);

        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          // Convert to base64 data URI and persist in database
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            await saveVoiceRecording({
              id: `rec_${Date.now()}`,
              durationSeconds: recordingSeconds,
              language: selectedLang,
              createdAt: new Date().toISOString(),
              sizeBytes: blob.size,
              transcript: transcript || "Voice recording",
              checksum: `chk_${blob.size}_${Date.now()}`,
              status: "completed",
              audioDataUri: base64data,
            });
            loadSavedRecordings();
          };

          // Stop tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start(250);
        mediaRecorderRef.current = recorder;

        // Timer
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);

        toast.info("Microphone active. Speak your command clearly.");
      } catch (err: any) {
        setIsRecording(false);
        isRecordingRef.current = false;
        toast.error("Microphone access denied: " + (err?.message || "Check browser permissions"));
      }
    }
  };

  // Pause recording
  const pauseRecording = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Resume recording (newly spoken words append seamlessly!)
  const resumeRecording = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    isRecordingRef.current = false;
    isPausedRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    stopAudioAnalysis();
  };

  // Cancel recording without saving
  const cancelRecording = () => {
    stopRecording();
    finalTranscriptRef.current = "";
    setTranscript("");
    setParsedCommand(null);
    setAudioUrl(null);
    setAudioBlob(null);
    toast.info("Recording cancelled.");
  };

  // Audio Playback Handler
  const togglePlayAudio = (overrideUrl?: string) => {
    const targetUrl = overrideUrl || audioUrl;
    if (!targetUrl) return;

    if (!audioElementRef.current) {
      const audio = new Audio(targetUrl);
      audio.playbackRate = playbackSpeed;
      audio.volume = volume;

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
      };
      audio.onended = () => {
        setIsPlayingAudio(false);
        setActiveRecordingToPlay(null);
      };

      audioElementRef.current = audio;
    } else if (audioElementRef.current.src !== targetUrl) {
      audioElementRef.current.src = targetUrl;
    }

    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
      setActiveRecordingToPlay(null);
    } else {
      audioElementRef.current
        .play()
        .then(() => {
          setIsPlayingAudio(true);
          if (overrideUrl) setActiveRecordingToPlay(overrideUrl);
        })
        .catch(() => {});
    }
  };

  // Playback speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = speed;
    }
  };

  // Seek bar scrub
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = target;
    }
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioElementRef.current) {
      audioElementRef.current.volume = val;
    }
  };

  // Download recorded audio
  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `voice-command-${Date.now()}.webm`;
    a.click();
    toast.success("Recording downloaded.");
  };

  // Handle Clarification input submission (e.g. missing amount)
  const handleClarificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationValue || !parsedCommand) return;

    const num = parseFloat(clarificationValue.replace(/[^0-9.]/g, ""));
    const updated = { ...parsedCommand };

    if (updated.missingField === "amount" && !isNaN(num) && num > 0) {
      updated.parameters.amount = num;
      updated.validationStatus = "valid";
      delete updated.missingField;
      delete updated.clarificationPrompt;
      updated.feedbackMessage = `Recording ₹${num} expense under ${updated.parameters.category || "General"}.`;
      updated.confirmationDetails = {
        actionLabel: "Log Expense to Ledger",
        primaryDetail: `₹${num}`,
        secondaryDetail: updated.parameters.category || "General",
        badgeText: "Expense",
      };
      setParsedCommand(updated);
      setClarificationValue("");
      toast.success(`Amount set to ₹${num}. Ready for confirmation!`);
    } else if (updated.missingField === "tripName") {
      updated.parameters.tripName = clarificationValue;
      updated.parameters.groupName = clarificationValue;
      updated.validationStatus = "valid";
      delete updated.missingField;
      delete updated.clarificationPrompt;
      updated.confirmationDetails = {
        actionLabel: "Create Trip Group",
        primaryDetail: clarificationValue,
        secondaryDetail: "Vacation Split Group",
        badgeText: "Trip",
      };
      setParsedCommand(updated);
      setClarificationValue("");
      toast.success(`Trip destination set to "${clarificationValue}". Ready!`);
    } else if (updated.missingField === "budgetAmount" && !isNaN(num) && num > 0) {
      updated.parameters.budgetAmount = num;
      updated.validationStatus = "valid";
      delete updated.missingField;
      delete updated.clarificationPrompt;
      updated.confirmationDetails = {
        actionLabel: "Create Monthly Budget",
        primaryDetail: `₹${num} Limit`,
        secondaryDetail: updated.parameters.category || "General",
        badgeText: "Budget",
      };
      setParsedCommand(updated);
      setClarificationValue("");
      toast.success(`Budget amount set to ₹${num}. Ready!`);
    } else {
      toast.error("Please provide a valid value.");
    }
  };

  // Handle Typed Text Command Input (shares identical parser and validation)
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    setTranscript(textInput);
    const parsed = parseVoiceCommand(textInput);
    setParsedCommand(parsed);
    setTextInput("");
  };

  // Execute Confirmed Command to PostgreSQL Database
  const handleConfirmAndExecute = async () => {
    if (!parsedCommand || parsedCommand.validationStatus !== "valid") return;

    setIsExecuting(true);
    try {
      const res = await executeVoiceCommand(parsedCommand);
      setExecutionResult(res);

      if (res.success) {
        toast.success(res.message);
        // Emit global event for live reactivity across tabs and views
        emitFinancialEvent("voice:executed", {
          entityType: res.entityType,
          source: "voice",
          metadata: { command: parsedCommand.action },
        });
        if (onCommandExecuted) {
          onCommandExecuted(res);
        }

        // Auto-navigate for navigation commands
        if (
          res.entityUrl &&
          (parsedCommand.action === "open_reports" ||
            parsedCommand.action === "show_budgets" ||
            parsedCommand.action === "open_notes" ||
            parsedCommand.action === "search_expenses")
        ) {
          router.push(res.entityUrl);
        }
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error("Execution error: " + (err?.message || "Unknown error"));
    } finally {
      setIsExecuting(false);
    }
  };

  // Delete saved recording
  const handleDeleteSaved = async (id: string) => {
    await deleteVoiceRecording(id);
    loadSavedRecordings();
    toast.info("Recording removed from storage.");
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Recording & Command Console */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Multilingual AI Voice & Text Console
                  <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                    LIVE MIC
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Speak or type commands naturally in English, Hindi, or Marathi to write directly to the database.
                </CardDescription>
              </div>
            </div>

            {/* Language & Mic Selectors */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-background text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Languages className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer text-xs"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-background text-foreground">
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {availableMics.length > 1 && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-background text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Sliders className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={selectedMicId}
                    onChange={(e) => setSelectedMicId(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer text-xs max-w-[130px] truncate"
                  >
                    {availableMics.map((m, idx) => (
                      <option key={m.deviceId || idx} value={m.deviceId} className="bg-background text-foreground">
                        {m.label || `Microphone ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Live Waveform Visualizer & Timer */}
          <div className="relative flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-900/60 dark:to-slate-900/20 border border-slate-200/60 dark:border-slate-800/80 min-h-[160px] overflow-hidden">
            {/* Waveform Bars */}
            <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-md">
              {audioLevel.map((lvl, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-75 ${
                    isRecording
                      ? isPaused
                        ? "bg-amber-400"
                        : "bg-indigo-600 dark:bg-indigo-400"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                  style={{ height: `${lvl}px` }}
                />
              ))}
            </div>

            {/* Status & Timer Overlay */}
            <div className="mt-4 flex items-center gap-3">
              {isRecording ? (
                <Badge className={`text-xs px-3 py-1 font-mono font-bold flex items-center gap-1.5 ${isPaused ? "bg-amber-500" : "bg-rose-500 animate-pulse"}`}>
                  <Radio className="h-3 w-3" />
                  {isPaused ? "PAUSED" : "RECORDING"} • {formatSeconds(recordingSeconds)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs px-3 py-1 font-mono text-slate-500">
                  READY TO RECORD
                </Badge>
              )}

              {isRecording && noiseRms > 0 && (
                <span className="text-[11px] font-mono text-slate-500">
                  Level: {noiseRms} dB
                </span>
              )}
            </div>

            {/* Live Streaming Transcript */}
            {(transcript || isRecording) && (
              <div className="mt-4 max-w-lg w-full text-center animate-in fade-in duration-200">
                <p className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center justify-center gap-1.5">
                  {isRecording && !isPaused && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                  {isPaused ? "Transcript (Paused)" : isRecording ? "Live Spoken Transcript" : "Transcript"}
                </p>
                <p className={`text-sm font-semibold bg-background/90 backdrop-blur px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${!transcript ? "text-slate-400 italic animate-pulse" : "text-slate-800 dark:text-slate-200"}`}>
                  {transcript ? `"${transcript}"` : "Listening... speak clearly (e.g. Add expense 450 food)"}
                </p>
              </div>
            )}
          </div>

          {/* Recording Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                size="lg"
                className="rounded-2xl gap-2 px-6 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
              >
                <Mic className="h-5 w-5" />
                Start Voice Recording
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button
                    onClick={resumeRecording}
                    variant="outline"
                    className="rounded-2xl gap-2 h-11 px-5 font-semibold"
                  >
                    <Play className="h-4 w-4 text-emerald-500" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={pauseRecording}
                    variant="outline"
                    className="rounded-2xl gap-2 h-11 px-5 font-semibold"
                  >
                    <Pause className="h-4 w-4 text-amber-500" />
                    Pause
                  </Button>
                )}

                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="rounded-2xl gap-2 h-11 px-5 font-bold"
                >
                  <Square className="h-4 w-4 fill-current" />
                  Stop & Review
                </Button>

                <Button
                  onClick={cancelRecording}
                  variant="ghost"
                  className="rounded-2xl gap-2 h-11 px-4 text-slate-500 hover:text-rose-500"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}

            {/* Quick Re-record */}
            {audioUrl && !isRecording && (
              <Button
                onClick={startRecording}
                variant="outline"
                className="rounded-2xl gap-2 h-11 px-4 font-semibold text-slate-600 dark:text-slate-300"
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>

          {/* Integrated Text Command Input (Shares Exact Same Logic) */}
          <form onSubmit={handleTextSubmit} className="pt-2">
            <div className="relative flex items-center">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder='Or type command here: e.g. "Add ₹500 food expense", "Create Goa trip", "What is my balance?"'
                className="rounded-2xl pr-24 pl-4 h-12 text-sm border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!textInput.trim()}
                className="absolute right-1.5 h-9 rounded-xl gap-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
                Parse
              </Button>
            </div>
          </form>

          {/* 2. Interactive Clarification Flow for Missing Parameters */}
          {parsedCommand && parsedCommand.validationStatus === "missing_parameters" && (
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Clarification Needed for {parsedCommand.missingField === "amount" ? "Expense Amount" : "Command Parameter"}
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    {parsedCommand.clarificationPrompt}
                  </p>
                </div>
              </div>

              <form onSubmit={handleClarificationSubmit} className="flex gap-2">
                <Input
                  value={clarificationValue}
                  onChange={(e) => setClarificationValue(e.target.value)}
                  placeholder={parsedCommand.missingField === "amount" ? "Enter amount (e.g. 500)" : "Enter value"}
                  className="rounded-xl h-10 bg-background text-sm"
                  autoFocus
                />
                <Button type="submit" className="rounded-xl h-10 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  Submit
                </Button>
              </form>
            </div>
          )}

          {/* 3. Command Confirmation & Confidence Breakdown Card */}
          {parsedCommand && parsedCommand.validationStatus === "valid" && !executionResult && (
            <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Command Confirmation Required
                    </span>
                    <Badge className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      VALIDATED
                    </Badge>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                    {parsedCommand.confirmationDetails?.actionLabel || "Execute Command"}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {parsedCommand.feedbackMessage}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={handleConfirmAndExecute}
                    disabled={isExecuting}
                    className="rounded-xl gap-2 h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                  >
                    {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Confirm & Execute
                  </Button>
                  <Button
                    onClick={() => setParsedCommand(null)}
                    variant="outline"
                    className="rounded-xl h-10 px-3 text-slate-500 hover:text-rose-500"
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Dynamic Confidence Scoring Breakdown */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-background/80 border">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Intent Confidence</span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                    {Math.round(parsedCommand.confidenceBreakdown.intentConfidence * 100)}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-background/80 border">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Entity Extraction</span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                    {Math.round(parsedCommand.confidenceBreakdown.extractionConfidence * 100)}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-background/80 border">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Entity Quality</span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                    {Math.round(parsedCommand.confidenceBreakdown.entityConfidence * 100)}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-background/80 border">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Score</span>
                  <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {Math.round(parsedCommand.confidenceBreakdown.overallConfidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Execution Result Banner */}
          {executionResult && (
            <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
              executionResult.success
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
            }`}>
              <div className="flex items-start gap-3">
                {executionResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-bold">{executionResult.message}</h4>
                  <p className="text-xs opacity-80 mt-0.5">
                    Written directly to PostgreSQL ledger with immutable audit trail.
                  </p>
                </div>
              </div>

              {executionResult.entityUrl && (
                <Link href={executionResult.entityUrl}>
                  <Button size="sm" variant="outline" className="rounded-xl h-8 gap-1 text-xs font-semibold">
                    View Record
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* 5. Production Audio Player (for current recording) */}
          {audioUrl && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileAudio className="h-4 w-4 text-indigo-500" />
                  Audio Playback Engine
                </span>

                {/* Speed Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Speed:</span>
                  {PLAYBACK_SPEEDS.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        playbackSpeed === spd
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{formatSeconds(currentTime)}</span>
                  <span>{formatSeconds(duration)}</span>
                </div>
              </div>

              {/* Play / Pause / Volume / Download Controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => togglePlayAudio()}
                    className="rounded-xl h-9 gap-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    {isPlayingAudio && !activeRecordingToPlay ? (
                      <>
                        <Pause className="h-4 w-4" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" /> Play Audio
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownload}
                    className="rounded-xl h-9 gap-1.5 px-3 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. Saved Voice Recordings Archive */}
          {savedRecordings.length > 0 && (
            <div className="pt-2 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Saved Voice Commands History ({savedRecordings.length})
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedRecordings.slice(0, 5).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl border bg-card flex items-center justify-between text-xs gap-3 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        &quot;{rec.transcript}&quot;
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rec.createdAt).toLocaleDateString("en-IN")} • {rec.durationSeconds}s • {rec.language}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {rec.audioDataUri && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePlayAudio(rec.audioDataUri)}
                          className="h-7 w-7 p-0 rounded-lg text-indigo-600 dark:text-indigo-400"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSaved(rec.id)}
                        className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
