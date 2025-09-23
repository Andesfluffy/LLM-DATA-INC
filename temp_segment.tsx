<Card className="bg-[#0B0F12]/80 backdrop-blur-xl">
          <CardHeader
            title="Ask Data Vista"
            subtitle={
              hasDs
                ? "Enter a question in natural language to generate governed SQL."
                : "Connect a data source in Settings to start asking questions."
            }
          />
          <CardBody className="space-y-6">
            {!hasDs && (
              <EmptyState
                title="No data source"
                message="Data Vista needs a connected database before it can analyse your questions."
                examples={["Top performing plans this quarter", "Revenue trend by channel", "Average handle time by agent"]}
              />
            )}

            <QueryInput
              onSubmit={(q) => {
                onAsk(q);
              }}
            />

            {error && (
              <p className="text-sm text-rose-400">
                {error}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-300">
              <div className="rounded-2xl border border-[#2A2D3A]/60 bg-[#111726]/70 p-3">
                <p className="font-semibold text-slate-100">Need inspiration?</p>
                <p className="mt-1 leading-relaxed">Try asking for KPIs by time period, comparisons across segments, or anomaly detection.</p>
              </div>
              <div className="rounded-2xl border border-[#2A2D3A]/60 bg-[#111726]/70 p-3">
                <p className="font-semibold text-slate-100">Shortcut</p>
                <p className="mt-1 leading-relaxed">Press Cmd+Enter / Ctrl+Enter to submit instantly once you finish typing.</p>
              </div>
            </div>
          </CardBody>
        </Card>
