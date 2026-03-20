"use client";

import { HelpCircle } from "lucide-react";
import Card, { CardBody } from "@/src/components/Card";

type OffTopicPayload = {
  offTopic: true;
  reason: string;
  availableTables: string[];
};

type OffTopicCardProps = {
  offTopic: OffTopicPayload;
};

export default function OffTopicCard({ offTopic }: OffTopicCardProps) {
  return (
    <Card className="no-print">
      <CardBody>
        <div className="flex items-start gap-3">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-1">
              That question isn&apos;t in your data
            </p>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              {offTopic.reason}
            </p>
            {offTopic.availableTables.length > 0 && (
              <>
                <p className="text-xs text-grape-300 mb-2 uppercase tracking-wide font-medium">
                  Your data covers
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {offTopic.availableTables.map((t) => (
                    <span key={t} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-grape-300">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-grape-300">
                  Ask about the tables above, or switch your data source.
                </p>
              </>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
