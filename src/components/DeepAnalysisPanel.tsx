"use client";

import { useCallback, useEffect, useRef, type ReactElement } from "react";
import { BrainCircuit, Loader2, RefreshCw } from "lucide-react";
import Card, { CardBody } from "@/src/components/Card";
import Button from "@/src/components/Button";
import { useDeepAnalysis } from "@/src/hooks/useDeepAnalysis";

type Props = {
  question: string;
  datasourceId: string;
};

/** Render a single line of streamed markdown into JSX. */
function MarkdownLine({ line }: { line: string }) {
  // H2 heading
  if (line.startsWith("## ")) {
    return (
      <h3 className="mt-5 mb-1.5 text-sm font-semibold text-white">
        {line.slice(3)}
      </h3>
    );
  }
  // H3 heading
  if (line.startsWith("### ")) {
    return (
      <h4 className="mt-3 mb-1 text-xs font-semibold text-slate-200 uppercase tracking-wide">
        {line.slice(4)}
      </h4>
    );
  }
  // Bullet point
  if (line.startsWith("- ") || line.startsWith("* ")) {
    return (
      <li className="ml-4 text-sm text-slate-300 leading-relaxed list-disc">
        <InlineMarkdown text={line.slice(2)} />
      </li>
    );
  }
  // Numbered list
  const numMatch = line.match(/^(\d+)\.\s+(.+)/);
  if (numMatch) {
    return (
      <li className="ml-4 text-sm text-slate-300 leading-relaxed list-decimal">
        <InlineMarkdown text={numMatch[2] ?? ""} />
      </li>
    );
  }
  // Empty line
  if (line.trim() === "") {
    return <div className="h-1" />;
  }
  // Normal paragraph
  return (
    <p className="text-sm text-slate-300 leading-relaxed">
      <InlineMarkdown text={line} />
    </p>
  );
}

/** Handle inline bold (**text**) and italic (*text*) within a line. */
function InlineMarkdown({ text }: { text: string }) {
  const parts: (string | ReactElement)[] = [];
  const boldItalicRegex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = boldItalicRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // bold italic
      parts.push(<strong key={key++} className="font-semibold italic text-white">{match[2]}</strong>);
    } else if (match[3]) {
      // bold
      parts.push(<strong key={key++} className="font-semibold text-white">{match[3]}</strong>);
    } else if (match[4]) {
      // italic
      parts.push(<em key={key++} className="italic text-slate-200">{match[4]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

function AnalysisContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let inList = false;
  let listItems: JSX.Element[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1 mb-2">
          {listItems}
        </ul>,
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, i) => {
    const isBullet = line.startsWith("- ") || line.startsWith("* ");
    const isNumbered = /^\d+\.\s/.test(line);

    if (isBullet || isNumbered) {
      inList = true;
      listItems.push(<MarkdownLine key={i} line={line} />);
    } else {
      if (inList) flushList();
      elements.push(<MarkdownLine key={i} line={line} />);
    }
  });

  if (inList) flushList();

  return <div className="space-y-1">{elements}</div>;
}

export default function DeepAnalysisPanel({ question, datasourceId }: Props) {
  const { text, loading, error, analyze, cancel } = useDeepAnalysis();
  const triggered = useRef(false);

  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true;
      analyze({ question, datasourceId });
    }
  }, [analyze, question, datasourceId]);

  const handleRegenerate = useCallback(() => {
    analyze({ question, datasourceId });
  }, [analyze, question, datasourceId]);

  return (
    <Card>
      <CardBody>
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Deep Analysis</p>
              <p className="text-xs text-slate-400 mt-0.5">
                AI predictions, correlations &amp; recommendations — grounded in your data
              </p>
            </div>
          </div>
          {loading ? (
            <Button variant="secondary" onClick={cancel} className="w-full text-xs sm:w-auto">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Stop
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleRegenerate}
              className="w-full text-xs sm:w-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {text ? "Regenerate" : "Analyze"}
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 mb-3">
            {error}
          </div>
        )}

        {/* Loading state (before any text arrives) */}
        {loading && !text && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2.5 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400 shrink-0" />
              <span>Gathering data from your database and analyzing patterns…</span>
            </div>
            <p className="text-xs text-slate-500 pl-6">
              Running multiple queries to build context. This may take 15–30 seconds.
            </p>
          </div>
        )}

        {/* Streaming / completed analysis */}
        {text && (
          <div className="mt-1">
            <AnalysisContent text={text} />
            {loading && (
              <span className="inline-block h-3.5 w-0.5 bg-violet-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}

        {/* Empty idle state */}
        {!text && !loading && !error && (
          <p className="text-sm text-slate-500">
            Click &quot;Analyze&quot; to get AI-powered insights, predictions, and recommendations
            based on your data.
          </p>
        )}

        {/* Disclaimer */}
        {text && !loading && (
          <p className="mt-4 text-xs text-slate-500 border-t border-white/[0.05] pt-3">
            This analysis is generated from your database and should be reviewed alongside domain
            expertise. Predictions are extrapolations from observed trends, not certainties.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
