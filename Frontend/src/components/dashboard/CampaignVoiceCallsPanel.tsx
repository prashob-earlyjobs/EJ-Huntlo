"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdLanguage, MdPhone, MdReplay, MdSchedule, MdTimer } from "react-icons/md";
import { CampaignContactsSkeleton } from "@/components/dashboard/CampaignContactsSkeleton";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  DEFAULT_VOICE_RESULT_FIELDS,
  fetchCampaignVoiceCalls,
  getVoiceCallResultFieldValue,
  resolveScreeningQuestionAnswer,
  resolveVoiceCallResultData,
  resolveVoiceCallSummary,
  type CampaignVoiceCallRecord,
  type CampaignVoiceCallRow,
} from "@/lib/campaignVoiceApi";
import { getStoredAuth } from "@/lib/auth";
import {
  parseAdditionalQuestionsFromCallPrompt,
  buildVoiceCallTableColumns,
  formatVoiceResultFieldLabel,
  syncResultFieldsWithScreeningQuestions,
} from "@/lib/voiceAgentPrompt";

type VoiceResultField = {
  columnName: string;
  expectedValue: string;
};

type Props = {
  campaignId: string;
  outreachStatus?: string;
  refreshKey?: number;
  resultFields?: VoiceResultField[];
  callPrompt?: string;
};

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
}

function formatCompactWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt && !endedAt) return "";
  if (!startedAt) return formatCompactWhen(endedAt);
  if (!endedAt) return formatCompactWhen(startedAt);

  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return formatCompactWhen(startedAt);
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    const datePart = start.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
    });
    const startTime = start.toLocaleString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    const endTime = end.toLocaleString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${datePart} · ${startTime}–${endTime}`;
  }

  return `${formatCompactWhen(startedAt)} – ${formatCompactWhen(endedAt)}`;
}

function VoiceCallResultFieldCell({
  call,
  columnName,
}: {
  call: CampaignVoiceCallRecord | null;
  columnName: string;
}) {
  if (!call) return <>—</>;
  const value = getVoiceCallResultFieldValue(resolveVoiceCallResultData(call), columnName);
  if (value === "—") return <>—</>;
  return (
    <p className="max-w-[14rem] truncate text-slate-700" title={value}>
      {value}
    </p>
  );
}

function VoiceCallRetryBadge({
  retryCount,
  maxRetries,
}: {
  retryCount: number;
  maxRetries: number;
}) {
  return (
    <div className="dashboard-campaign-voice-call-outcomes">
      <span className="dashboard-campaign-voice-call-retry-badge">
        <MdReplay size={12} className="dashboard-campaign-voice-call-retry-icon" aria-hidden />
        Retries {retryCount}
        {maxRetries > 0 ? ` / ${maxRetries}` : ""}
      </span>
    </div>
  );
}

function statusClass(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (normalized === "FAILED" || normalized === "NO_ANSWER") {
    return "bg-red-50 text-red-700";
  }
  if (normalized === "IN_PROGRESS" || normalized === "RINGING") {
    return "bg-amber-50 text-amber-700";
  }
  if (normalized === "PENDING") return "bg-slate-100 text-slate-600";
  return "bg-violet-50 text-violet-700";
}

function buildPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
}

function VoiceCallMetaIcon({ type }: { type: "duration" | "time" | "from" | "timezone" }) {
  const className = `dashboard-campaign-voice-call-detail-meta-icon dashboard-campaign-voice-call-detail-meta-icon--${type}`;
  const props = { size: 12, className, "aria-hidden": true as const };

  if (type === "duration") return <MdTimer {...props} />;
  if (type === "time") return <MdSchedule {...props} />;
  if (type === "from") return <MdPhone {...props} />;
  return <MdLanguage {...props} />;
}

function VoiceCallDetailMeta({
  duration,
  timeRange,
  fromNumber,
  timezone,
}: {
  duration: string;
  timeRange: string;
  fromNumber: string;
  timezone: string;
}) {
  const segments: Array<{
    key: "duration" | "time" | "from" | "timezone";
    label: string;
    pill?: boolean;
  }> = [];

  if (duration !== "—") {
    segments.push({ key: "duration", label: duration, pill: true });
  }
  if (timeRange) {
    segments.push({ key: "time", label: timeRange });
  }
  if (fromNumber) {
    segments.push({ key: "from", label: fromNumber });
  }
  if (timezone) {
    segments.push({ key: "timezone", label: timezone });
  }

  if (segments.length === 0) return null;

  return (
    <div className="dashboard-campaign-voice-call-detail-meta">
      {segments.map((segment, index) => (
        <Fragment key={segment.key}>
          {index > 0 ? (
            <span className="dashboard-campaign-voice-call-detail-meta-divider" aria-hidden />
          ) : null}
          {segment.pill ? (
            <span className="dashboard-campaign-voice-call-detail-duration">
              <VoiceCallMetaIcon type="duration" />
              <span>{segment.label}</span>
            </span>
          ) : (
            <span className="dashboard-campaign-voice-call-detail-meta-item" title={segment.label}>
              <VoiceCallMetaIcon type={segment.key} />
              <span className="dashboard-campaign-voice-call-detail-meta-text">{segment.label}</span>
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function VoiceCallRecordingControl({
  recordingUrl,
  candidateKey,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
}: {
  recordingUrl: string;
  candidateKey: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: (candidateKey: string, recordingUrl: string) => void;
  onSeek: (ratio: number) => void;
}) {
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <div
      className={`dashboard-campaign-voice-call-recording${
        isPlaying ? " dashboard-campaign-voice-call-recording--active" : ""
      }`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="dashboard-campaign-voice-call-recording-btn"
        aria-label={isPlaying ? "Pause recording" : "Play recording"}
        onClick={(event) => {
          event.stopPropagation();
          onTogglePlay(candidateKey, recordingUrl);
        }}
      >
        <MaterialIcon
          name={isPlaying ? "pause_circle" : "play_circle"}
          className="dashboard-campaign-voice-call-recording-icon"
          filled={isPlaying}
        />
      </button>
      {isPlaying ? (
        <div className="dashboard-campaign-voice-call-recording-player">
          <button
            type="button"
            className="dashboard-campaign-voice-call-recording-track"
            aria-label="Seek recording"
            onClick={(event) => {
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              if (rect.width <= 0) return;
              const ratio = (event.clientX - rect.left) / rect.width;
              onSeek(Math.max(0, Math.min(1, ratio)));
            }}
          >
            <span
              className="dashboard-campaign-voice-call-recording-fill"
              style={{ width: `${progress * 100}%` }}
            />
            <span
              className="dashboard-campaign-voice-call-recording-thumb"
              style={{ left: `${progress * 100}%` }}
            />
          </button>
          <span className="dashboard-campaign-voice-call-recording-time">
            {formatAudioTime(currentTime)}
            {duration > 0 ? ` / ${formatAudioTime(duration)}` : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function VoiceCallScreeningAnswers({
  call,
  questions,
  resultFields,
}: {
  call: CampaignVoiceCallRecord;
  questions: string[];
  resultFields: VoiceResultField[];
}) {
  if (questions.length === 0) return null;

  const data = resolveVoiceCallResultData(call);
  const entries = questions.map((question, index) => ({
    key: `${index}-${question}`,
    question,
    answer: resolveScreeningQuestionAnswer(question, resultFields, data, index),
  }));

  return (
    <div className="dashboard-campaign-voice-call-detail-screening">
      <p className="dashboard-campaign-voice-call-detail-screening-title">Screening questions</p>
      <ul className="dashboard-campaign-voice-call-detail-screening-list">
        {entries.map((entry) => (
          <li key={entry.key} className="dashboard-campaign-voice-call-detail-screening-item">
            <p className="dashboard-campaign-voice-call-detail-screening-question">{entry.question}</p>
            <p className="dashboard-campaign-voice-call-detail-screening-answer">
              {entry.answer === "—" ? "No answer recorded" : entry.answer}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExpandableRowPanel({
  expanded,
  row,
  columnCount,
  screeningQuestions,
  resultFields,
}: {
  expanded: boolean;
  row: CampaignVoiceCallRow;
  columnCount: number;
  screeningQuestions: string[];
  resultFields: VoiceResultField[];
}) {
  return (
    <tr aria-hidden={!expanded} className={expanded ? undefined : "h-0"}>
      <td colSpan={columnCount} className="p-0">
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`dashboard-campaign-voice-call-expand transition-[opacity,transform] duration-300 ease-in-out motion-reduce:transition-none ${
                expanded
                  ? "translate-y-0 opacity-100 delay-75"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              <VoiceCallRowDetails
                row={row}
                screeningQuestions={screeningQuestions}
                resultFields={resultFields}
              />
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function VoiceCallRowDetails({
  row,
  screeningQuestions,
  resultFields,
}: {
  row: CampaignVoiceCallRow;
  screeningQuestions: string[];
  resultFields: VoiceResultField[];
}) {
  const call = row.call;

  if (!call) {
    return (
      <div className="dashboard-campaign-voice-call-detail">
        <p className="dashboard-campaign-voice-call-detail-waiting">
          <MaterialIcon name="hourglass_empty" className="dashboard-campaign-voice-call-detail-waiting-icon" />
          Waiting for call updates…
        </p>
      </div>
    );
  }

  const summary = resolveVoiceCallSummary(call);
  const duration = formatDuration(call.durationSeconds);
  const timeRange = formatTimeRange(call.startedAt, call.endedAt);

  return (
    <div className="dashboard-campaign-voice-call-detail">
      <VoiceCallDetailMeta
        duration={duration}
        timeRange={timeRange}
        fromNumber={call.fromPhoneNumber.trim()}
        timezone={call.timezone.trim()}
      />

      <VoiceCallRetryBadge retryCount={call.retryCount} maxRetries={call.maxRetries} />

      <VoiceCallScreeningAnswers
        call={call}
        questions={screeningQuestions}
        resultFields={resultFields}
      />

      {summary ? (
        <blockquote className="dashboard-campaign-voice-call-detail-summary">{summary}</blockquote>
      ) : (
        <p className="dashboard-campaign-voice-call-detail-muted">No summary available yet.</p>
      )}

      {call.lastEventAt ? (
        <p className="dashboard-campaign-voice-call-detail-updated">
          Updated {formatCompactWhen(call.lastEventAt)}
        </p>
      ) : null}
    </div>
  );
}

export function CampaignVoiceCallsPanel({
  campaignId,
  outreachStatus = "idle",
  refreshKey = 0,
  resultFields = [],
  callPrompt = "",
}: Props) {
  const screeningQuestions = useMemo(
    () => parseAdditionalQuestionsFromCallPrompt(callPrompt),
    [callPrompt]
  );
  const tableColumns = useMemo(() => {
    const configured = resultFields
      .map((field) => ({
        columnName: field.columnName.trim(),
        expectedValue: field.expectedValue.trim(),
      }))
      .filter((field) => field.columnName);
    const fields =
      configured.length > 0
        ? syncResultFieldsWithScreeningQuestions(screeningQuestions, configured)
        : syncResultFieldsWithScreeningQuestions(screeningQuestions, DEFAULT_VOICE_RESULT_FIELDS);
    return buildVoiceCallTableColumns(fields, screeningQuestions);
  }, [resultFields, screeningQuestions]);
  const allResultFields = useMemo(
    () =>
      tableColumns.map((column) => ({
        columnName: column.columnName,
        expectedValue: column.expectedValue,
      })),
    [tableColumns]
  );
  const [rows, setRows] = useState<CampaignVoiceCallRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [playback, setPlayback] = useState({ currentTime: 0, duration: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const resetPlayback = useCallback(() => {
    setPlayback({ currentTime: 0, duration: 0 });
  }, []);

  const stopRecording = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setPlayingKey(null);
    resetPlayback();
  }, [resetPlayback]);

  const syncPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayback({
      currentTime: audio.currentTime,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    });
  }, []);

  const seekRecording = useCallback(
    (ratio: number) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = audio.duration * ratio;
      syncPlayback();
    },
    [syncPlayback]
  );

  const toggleRecording = useCallback(
    (candidateKey: string, recordingUrl: string) => {
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;

      if (playingKey === candidateKey && !audio.paused) {
        stopRecording();
        return;
      }

      audio.onended = () => {
        setPlayingKey(null);
        resetPlayback();
      };
      audio.onerror = () => {
        setPlayingKey(null);
        resetPlayback();
      };
      audio.pause();
      audio.src = recordingUrl;
      resetPlayback();
      void audio.play().catch(() => {
        setPlayingKey(null);
        resetPlayback();
      });
      setPlayingKey(candidateKey);
    },
    [playingKey, resetPlayback, stopRecording]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playingKey) return undefined;

    const handleSync = () => syncPlayback();
    audio.addEventListener("timeupdate", handleSync);
    audio.addEventListener("loadedmetadata", handleSync);
    audio.addEventListener("durationchange", handleSync);
    handleSync();

    return () => {
      audio.removeEventListener("timeupdate", handleSync);
      audio.removeEventListener("loadedmetadata", handleSync);
      audio.removeEventListener("durationchange", handleSync);
    };
  }, [playingKey, syncPlayback]);

  const load = useCallback(
    async (pageNum: number, options?: { soft?: boolean }) => {
      if (options?.soft) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const auth = getStoredAuth();
        if (!auth?.token) throw new Error("Please sign in again.");
        const data = await fetchCampaignVoiceCalls(auth.token, campaignId, {
          page: pageNum,
          limit: 25,
        });
        setRows(data.rows);
        setPage(data.pagination.page);
        setTotalPages(Math.max(1, data.pagination.totalPages));
        setTotal(data.pagination.total);
        setExpandedKey((prev) =>
          prev && data.rows.some((row) => row.contact.candidateKey === prev) ? prev : null
        );
      } catch (err) {
        setRows([]);
        setError(err instanceof Error ? err.message : "Could not load voice calls.");
      } finally {
        if (options?.soft) setRefreshing(false);
        else setLoading(false);
      }
    },
    [campaignId]
  );

  useEffect(() => {
    void load(page);
  }, [load, page, refreshKey]);

  useEffect(() => {
    stopRecording();
  }, [page, stopRecording]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  useEffect(() => {
    if (outreachStatus !== "active") return undefined;
    const timer = window.setInterval(() => {
      void load(page, { soft: true });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [load, outreachStatus, page]);

  const toggleRow = (candidateKey: string) => {
    setExpandedKey((prev) => (prev === candidateKey ? null : candidateKey));
  };

  const pageNumbers = buildPageNumbers(page, totalPages);
  const columnCount = 6 + tableColumns.length;

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-white p-4">
        <CampaignContactsSkeleton rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="dashboard-campaign-workspace-placeholder dashboard-campaign-workspace-placeholder--error py-12">
        {error}
      </p>
    );
  }

  return (
    <div className="dashboard-campaign-voice-calls-panel">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600"
            aria-hidden
          >
            <MaterialIcon name="record_voice_over" className="text-base" />
          </span>
          <p className="text-sm font-medium text-slate-700">
            Voice calls ({total.toLocaleString()})
          </p>
          {outreachStatus === "active" ? (
            <span className="dashboard-campaign-wa-comms-preview-pill dashboard-campaign-wa-comms-live-pill">
              Campaign active
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-55"
          disabled={refreshing}
          onClick={() => void load(page, { soft: true })}
        >
          <MaterialIcon name="refresh" className="text-base" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="dashboard-campaign-voice-calls-scroll bg-white p-4">
        <div className="dashboard-campaign-voice-calls-table-scroll overflow-x-auto overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="text-slate-600">
                <th className="w-10 px-2 py-2 font-medium" aria-label="Expand row" />
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Phone</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {tableColumns.map((column) => (
                  <th
                    key={column.columnName}
                    className="min-w-[8rem] px-3 py-2 font-medium"
                    title={column.expectedValue || column.columnName}
                  >
                    {column.topicLabel || formatVoiceResultFieldLabel(column)}
                  </th>
                ))}
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Duration</th>
                <th className="min-w-[6.5rem] px-2 py-2 font-medium" aria-label="Recording" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-10 text-center text-slate-500">
                    No contacts in this campaign yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const expanded = expandedKey === row.contact.candidateKey;
                  const call = row.call;
                  const name = row.contact.name.trim() || call?.contactName || "Unnamed contact";
                  const phone = row.contact.phone.trim() || call?.toNumber || "—";
                  const callStatus =
                    call?.status.trim() || call?.lifecycleStatus.trim() || row.displayStatus;

                  return (
                    <Fragment key={row.contact.candidateKey}>
                      <tr
                        className={`cursor-pointer border-t border-slate-100 transition-colors duration-200 ease-in-out hover:bg-slate-50 ${
                          expanded ? "bg-[#eef4ff]" : "bg-white"
                        }`}
                        onClick={() => toggleRow(row.contact.candidateKey)}
                        aria-expanded={expanded}
                      >
                        <td className="px-2 py-2 text-slate-500">
                          <span
                            className={`inline-flex transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
                              expanded ? "rotate-180" : "rotate-0"
                            }`}
                            aria-hidden
                          >
                            <MaterialIcon name="expand_more" className="text-xl" />
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{name}</p>
                          <p className="mt-0.5 text-xs text-slate-500 sm:hidden">{phone}</p>
                        </td>
                        <td className="hidden px-3 py-2 text-slate-700 sm:table-cell">{phone}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(callStatus)}`}
                          >
                            {callStatus}
                          </span>
                        </td>
                        {tableColumns.map((column) => (
                          <td key={column.columnName} className="px-3 py-2">
                            <VoiceCallResultFieldCell call={call} columnName={column.columnName} />
                          </td>
                        ))}
                        <td className="hidden px-3 py-2 text-slate-700 lg:table-cell">
                          {formatDuration(call?.durationSeconds ?? null)}
                        </td>
                        <td className="px-2 py-2 align-middle">
                          {call?.recordingUrl ? (
                            <VoiceCallRecordingControl
                              recordingUrl={call.recordingUrl}
                              candidateKey={row.contact.candidateKey}
                              isPlaying={playingKey === row.contact.candidateKey}
                              currentTime={
                                playingKey === row.contact.candidateKey ? playback.currentTime : 0
                              }
                              duration={
                                playingKey === row.contact.candidateKey ? playback.duration : 0
                              }
                              onTogglePlay={toggleRecording}
                              onSeek={seekRecording}
                            />
                          ) : null}
                        </td>
                      </tr>
                      <ExpandableRowPanel
                        expanded={expanded}
                        row={row}
                        columnCount={columnCount}
                        screeningQuestions={screeningQuestions}
                        resultFields={allResultFields}
                      />
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              disabled={page <= 1 || refreshing}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  pageNum === page
                    ? "bg-[#0050cb] text-white"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                disabled={pageNum === page || refreshing}
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              disabled={page >= totalPages || refreshing}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
