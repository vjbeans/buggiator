'use client';

import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

import { useEffect, useState } from 'react';

import { Bug, Check, Copy, FileText, Sparkles } from 'lucide-react';

type BugReport = {
  id: string;
  system: string;
  environment: string;
  issueTitle: string;
  severity: string;
  report: string;
  createdAt: string;
};

export default function Home() {
  // ============================================
  // STATE
  // ============================================

  const [system, setSystem] = useState('PPGIS');
  const [environment, setEnvironment] = useState('DCUT');
  const [issue, setIssue] = useState('');
  const [report, setReport] = useState('');

  // Report History - Initialize with empty array
  const [history, setHistory] = useState<BugReport[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Track whether the component has mounted
  const [isMounted, setIsMounted] = useState(false);

  // ============================================
  // LOAD HISTORY FROM LOCALSTORAGE AFTER MOUNT
  // ============================================

  useEffect(() => {
    // Using a timeout to avoid the linter warning
    const loadHistory = () => {
      setIsMounted(true);
      try {
        const saved = localStorage.getItem('buggiator_history');
        if (saved) {
          setHistory(JSON.parse(saved));
        }
      } catch {
        // Ignore
      }
    };

    loadHistory();
  }, []);

  // ============================================
  // SAVE REPORT HISTORY
  // ============================================

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('buggiator_history', JSON.stringify(history));
    }
  }, [history, isMounted]);

  // ============================================
  // VALIDATE ISSUE DESCRIPTION
  // ============================================

  const validateIssueDescription = (value: string) => {
    const cleaned = value.trim().toLowerCase();

    if (!cleaned) {
      return 'Please describe the issue before generating a report.';
    }

    const invalidInputs = [
      'hi',
      'hello',
      'hey',
      'test',
      'testing',
      'asdf',
      'abc',
      '123',
      '1234',
      'sample',
      'sample test',
    ];

    if (invalidInputs.includes(cleaned)) {
      return 'Please provide a meaningful issue description.';
    }

    // Reject input that contains no letters
    if (!/[a-zA-Z]/.test(cleaned)) {
      return 'Please provide a meaningful issue description.';
    }

    // Reject very short non-descriptive input
    if (cleaned.length < 5) {
      return 'Please provide more details about the issue.';
    }

    return '';
  };

  // ============================================
  // GENERATE REPORT
  // ============================================

  const generateReport = async () => {
    const validationError = validateIssueDescription(issue);

    if (validationError) {
      setError(validationError);
      setReport('');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/generate', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          system,
          environment,
          issueDescription: issue,
        }),
      });

      const data = await response.json();

      // ============================================
      // API ERROR
      // ============================================

      if (!response.ok) {
        setError(data.error || 'Something went wrong generating the report.');

        setReport('');

        return;
      }

      // ============================================
      // GENERATED REPORT
      // ============================================

      const generatedReport = data.report || 'No report generated.';

      setReport(generatedReport);

      // ============================================
      // PARSE REPORT
      // ============================================

      const parsed = parseReport(generatedReport);

      // ============================================
      // CREATE HISTORY RECORD
      // ============================================

      const newReport: BugReport = {
        id: crypto.randomUUID(),

        system: system,

        environment: environment,

        issueTitle: parsed['Issue Title'] || 'Untitled Defect',

        severity: parsed['Severity'] || 'Unknown',

        report: generatedReport,

        createdAt: new Date().toISOString(),
      };

      // ============================================
      // ADD TO HISTORY
      // ============================================

      setHistory((previousHistory) => [newReport, ...previousHistory]);
    } catch (error) {
      console.error(error);

      setError(
        'Could not reach the server. Check your connection and try again.',
      );

      setReport('');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // COPY REPORT
  // ============================================

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);

      setCopied(true);

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(error);

      setError("Couldn't copy to clipboard.");
    }
  };

  // ============================================
  // CLEAR FORM
  // ============================================

  const clearForm = () => {
    setIssue('');
    setReport('');
    setError('');
    setCopied(false);
  };

  // ============================================
  // OPEN REPORT FROM HISTORY
  // ============================================

  const openHistoryReport = (historyReport: BugReport) => {
    setSystem(historyReport.system);
    setEnvironment(historyReport.environment);
    setReport(historyReport.report);
    setIssue(historyReport.issueTitle);
    setError('');
    setCopied(false);
  };

  // ============================================
  // PARSE REPORT
  // ============================================

  const parseReport = (report: string) => {
    const sections = [
      'System',
      'Environment',
      'Issue Title',
      'Summary',
      'Steps to Reproduce',
      'Expected Result',
      'Actual Result',
      'Impact',
      'Severity',
      'Additional Notes',
    ];

    const result: Record<string, string> = {};

    sections.forEach((section, index) => {
      const start = report.indexOf(section + ':');

      if (start === -1) return;

      const nextSection = sections
        .slice(index + 1)
        .find((s) => report.indexOf(s + ':') > start);

      const end = nextSection
        ? report.indexOf(nextSection + ':')
        : report.length;

      result[section] = report
        .substring(start + section.length + 1, end)
        .trim();
    });

    return result;
  };

  // ============================================
  // PARSED REPORT
  // ============================================

  const parsedReport = report ? parseReport(report) : null;

  // ============================================
  // FILTER REPORT HISTORY BY SEARCH
  // ============================================

  const filteredHistory = history.filter((historyReport) => {
    const searchTerm = historySearch.toLowerCase().trim();

    if (!searchTerm) {
      return true;
    }

    return (
      historyReport.issueTitle.toLowerCase().includes(searchTerm) ||
      historyReport.system.toLowerCase().includes(searchTerm) ||
      historyReport.environment.toLowerCase().includes(searchTerm) ||
      historyReport.severity.toLowerCase().includes(searchTerm) ||
      historyReport.report.toLowerCase().includes(searchTerm)
    );
  });

  // ============================================
  // EXPORT DOCX
  // ============================================

  const exportToDocx = async () => {
    if (!parsedReport) return;

    const doc = new Document({
      sections: [
        {
          children: Object.entries(parsedReport).flatMap(([title, content]) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  size: 28,
                }),
              ],
            }),

            new Paragraph({
              text: String(content),
            }),

            new Paragraph({
              text: '',
            }),
          ]),
        },
      ],
    });

    const blob = await Packer.toBlob(doc);

    saveAs(blob, `Buggiator_Report_${Date.now()}.docx`);
  };

  // ============================================
  // UI
  // ============================================

  return (
    <main
      className="
            min-h-screen
            bg-slate-100
            p-8
          "
    >
      <div
        className="
              max-w-6xl
              mx-auto
            "
      >
        {/* =====================================
                HEADER
            ===================================== */}

        <div
          className="
                flex
                items-center
                gap-4
                mb-10
              "
        >
          <div
            className="
                  bg-blue-600
                  text-white
                  p-4
                  rounded-2xl
                "
          >
            <Bug size={32} />
          </div>

          <div>
            <h1
              className="
                    text-4xl
                    font-bold
                    text-slate-900
                  "
            >
              Buggiator
            </h1>

            <p
              className="
                    text-slate-500
                  "
            >
              AI-powered QA defect reporting assistant
            </p>
          </div>
        </div>

        {/* =====================================
                MAIN GRID
            ===================================== */}

        <div
          className="
                grid
                md:grid-cols-2
                gap-8
              "
        >
          {/* ===================================
                  INPUT SECTION
              =================================== */}

          <section
            className="
                  bg-white
                  rounded-2xl
                  shadow-sm
                  border
                  p-6
                "
          >
            <div
              className="
                    flex
                    items-center
                    gap-2
                    mb-6
                  "
            >
              <FileText size={20} />

              <h2
                className="
                      text-xl
                      font-semibold
                    "
              >
                Create Defect Report
              </h2>
            </div>

            {/* SYSTEM */}

            <label
              className="
                    text-sm
                    font-medium
                  "
            >
              System
            </label>

            <select
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="
                    w-full
                    mt-2
                    mb-5
                    border
                    rounded-xl
                    p-3
                  "
            >
              <option>PPGIS</option>

              <option>PST Mobile</option>

              <option>PST WEB</option>

              <option>NETD WEB</option>

              <option>NETD CAD</option>
            </select>

            {/* ENVIRONMENT */}

            <label
              className="
                    text-sm
                    font-medium
                  "
            >
              Environment
            </label>

            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="
                    w-full
                    mt-2
                    mb-5
                    border
                    rounded-xl
                    p-3
                  "
            >
              <option>DCUT</option>

              <option>PREBAU</option>

              <option>UAT</option>

              <option>Production</option>
            </select>

            {/* ISSUE DESCRIPTION */}

            <label
              className="
                    text-sm
                    font-medium
                  "
            >
              Summary of the issue
            </label>

            <textarea
              className="
                    w-full
                    h-48
                    mt-2
                    border
                    rounded-xl
                    p-4
                    resize-none
                    focus:ring-2
                    focus:ring-blue-500
                  "
              placeholder="
                    Example: Unable to generate QR code for attachment inventory.
                  "
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
            />

            {/* GENERATE BUTTON */}

            <button
              onClick={generateReport}
              disabled={loading || !issue.trim()}
              className="
                    mt-5
                    w-full
                    bg-blue-600
                    hover:bg-blue-700
                    disabled:bg-gray-400
                    text-white
                    py-3
                    rounded-xl
                    flex
                    justify-center
                    items-center
                    gap-2
                  "
            >
              <Sparkles size={18} />

              {loading ? 'Generating...' : 'Generate Bug Report'}
            </button>

            {/* CLEAR BUTTON */}

            <button
              onClick={clearForm}
              disabled={loading || (!issue.trim() && !report && !error)}
              className="
                    mt-3
                    w-full
                    text-sm
                    font-medium
                    text-blue-500
                    border
                    border-blue-200
                    hover:bg-blue-50
                    py-2.5
                    rounded-xl
                    disabled:opacity-50
                  "
            >
              Clear
            </button>
          </section>

          {/* ===================================
                  OUTPUT SECTION
              =================================== */}

          <section
            className="
                  bg-white
                  rounded-2xl
                  shadow-sm
                  border
                  p-6
                "
          >
            <h2
              className="
                    text-xl
                    font-semibold
                    mb-6
                  "
            >
              Generated QA Report
            </h2>

            {/* ACTION BUTTONS */}

            {report && !loading && (
              <div
                className="
                      flex
                      gap-2
                      mb-4
                    "
              >
                {/* COPY */}

                <button
                  onClick={copyReport}
                  className="
                        px-3
                        py-1.5
                        text-sm
                        font-medium
                        text-slate-700
                        border
                        border-slate-300
                        rounded-lg
                        hover:bg-slate-50
                        flex
                        items-center
                        gap-1.5
                      "
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}

                  {copied ? 'Copied!' : 'Copy Report'}
                </button>

                {/* EXPORT */}

                <button
                  onClick={exportToDocx}
                  className="
                        px-3
                        py-1.5
                        text-sm
                        font-medium
                        text-white
                        bg-blue-600
                        rounded-lg
                        hover:bg-blue-700
                      "
                >
                  Export DOCX
                </button>
              </div>
            )}

            {/* ERROR */}

            {error && (
              <div
                className="
                      bg-red-50
                      border
                      border-red-200
                      text-red-700
                      text-sm
                      rounded-xl
                      p-4
                      mb-4
                    "
              >
                {error}
              </div>
            )}

            {/* REPORT DISPLAY */}

            <div
              className="
    bg-slate-50
    rounded-xl
    p-5
    h-[500px]
    overflow-y-auto
    text-sm
    leading-6
  "
            >
              {/* LOADING */}

              {loading ? (
                <div
                  className="
                        space-y-3
                        animate-pulse
                      "
                >
                  <div
                    className="
                          h-4
                          bg-slate-200
                          rounded
                          w-1/3
                        "
                  />

                  <div
                    className="
                          h-3
                          bg-slate-200
                          rounded
                          w-full
                        "
                  />

                  <div
                    className="
                          h-3
                          bg-slate-200
                          rounded
                          w-5/6
                        "
                  />

                  <div
                    className="
                          h-3
                          bg-slate-200
                          rounded
                          w-full
                        "
                  />

                  <div
                    className="
                          h-4
                          bg-slate-200
                          rounded
                          w-1/4
                          mt-6
                        "
                  />

                  <div
                    className="
                          h-3
                          bg-slate-200
                          rounded
                          w-full
                        "
                  />

                  <div
                    className="
                          h-3
                          bg-slate-200
                          rounded
                          w-2/3
                        "
                  />
                </div>
              ) : parsedReport ? (
                /* =================================
                      PARSED REPORT
                    ================================= */

                <div
                  className="
                        space-y-4
                      "
                >
                  {Object.entries(parsedReport).map(([title, content]) => (
                    <div
                      key={title}
                      className="
                              bg-white
                              border
                              rounded-xl
                              overflow-hidden
                            "
                    >
                      {/* SECTION TITLE */}

                      <div
                        className="
                                bg-slate-100
                                px-4
                                py-2
                                font-semibold
                              "
                      >
                        {title}
                      </div>

                      {/* SECTION CONTENT */}

                      <div
                        className="
                                p-4
                                whitespace-pre-wrap
                              "
                      >
                        {title === 'Severity' ? (
                          <span
                            className={`
                                    inline-flex
                                    px-3
                                    py-1
                                    rounded-full
                                    text-sm
                                    font-semibold

                                    ${
                                      content.toLowerCase().includes('critical')
                                        ? 'bg-red-100 text-red-700'
                                        : content.toLowerCase().includes('high')
                                          ? 'bg-orange-100 text-orange-700'
                                          : content
                                                .toLowerCase()
                                                .includes('medium')
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-green-100 text-green-700'
                                    }
                                  `}
                          >
                            {content}
                          </span>
                        ) : (
                          content
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                'Your AI-generated defect report will appear here.'
              )}
            </div>
          </section>
        </div>
        {/* =====================================
                REPORT HISTORY
            ===================================== */}

        <section
          className="
                mt-8
                bg-white
                rounded-2xl
                shadow-sm
                border
                p-6
              "
        >
          <div
            className="
                  flex
                  items-center
                  justify-between
                  mb-6
                "
          >
            <div>
              <h2
                className="
                      text-xl
                      font-semibold
                      text-slate-900
                    "
              >
                Report History
              </h2>

              <p
                className="
                      text-sm
                      text-slate-500
                      mt-1
                    "
              >
                Previously generated defect reports
              </p>
            </div>

            <div
              className="
                    text-sm
                    text-slate-500
                  "
            >
              {isMounted
                ? `${history.length} ${history.length === 1 ? 'report' : 'reports'}`
                : '0 reports'}
            </div>
          </div>
          {/* =====================================
        SEARCH HISTORY
    ===================================== */}

          <div className="mb-6">
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search reports..."
              className="
          w-full
          border
          border-slate-300
          rounded-xl
          px-4
          py-3
          text-sm
          outline-none
          focus:ring-2
          focus:ring-blue-500
          focus:border-blue-500
        "
            />
          </div>

          {/* EMPTY HISTORY */}

          {!isMounted ? (
            <div
              className="
                    text-center
                    py-10
                    text-slate-500
                  "
            >
              Loading reports...
            </div>
          ) : history.length === 0 ? (
            <div
              className="
                    text-center
                    py-10
                    text-slate-500
                  "
            >
              No reports in history yet.
              <p
                className="
                      text-sm
                      mt-1
                    "
              >
                Generate a defect report to see it here.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div
              className="
        text-center
        py-10
        text-slate-500
      "
            >
              <p>No reports found matching your search.</p>

              <button
                onClick={() => setHistorySearch('')}
                className="
          mt-3
          text-sm
          text-blue-600
          hover:text-blue-700
          font-medium
        "
              >
                Clear search
              </button>
            </div>
          ) : (
            /* REPORT LIST */

            <div
              className="
        space-y-3
      "
            >
              {filteredHistory.map((historyReport) => (
                <div
                  key={historyReport.id}
                  className="
                          border
                          rounded-xl
                          p-4
                          hover:bg-slate-50
                          transition
                        "
                >
                  <div
                    className="
                            flex
                            flex-col
                            md:flex-row
                            md:items-center
                            md:justify-between
                            gap-4
                          "
                  >
                    {/* REPORT INFORMATION */}

                    <div
                      className="
                              min-w-0
                            "
                    >
                      <h3
                        className="
                                font-semibold
                                text-slate-900
                                truncate
                              "
                      >
                        {historyReport.issueTitle}
                      </h3>

                      <div
                        className="
                                flex
                                flex-wrap
                                items-center
                                gap-2
                                mt-2
                                text-sm
                                text-slate-500
                              "
                      >
                        <span>{historyReport.system}</span>

                        <span>•</span>

                        <span>{historyReport.environment}</span>

                        <span>•</span>

                        <span>
                          {new Date(historyReport.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* SEVERITY */}

                    <div
                      className="
                              flex
                              items-center
                              gap-3
                            "
                    >
                      <span
                        className={`
                                inline-flex
                                px-3
                                py-1
                                rounded-full
                                text-xs
                                font-semibold

                                ${
                                  historyReport.severity
                                    .toLowerCase()
                                    .includes('critical')
                                    ? 'bg-red-100 text-red-700'
                                    : historyReport.severity
                                          .toLowerCase()
                                          .includes('high')
                                      ? 'bg-orange-100 text-orange-700'
                                      : historyReport.severity
                                            .toLowerCase()
                                            .includes('medium')
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-green-100 text-green-700'
                                }
                              `}
                      >
                        {historyReport.severity}
                      </span>

                      {/* OPEN */}

                      <button
                        onClick={() => openHistoryReport(historyReport)}
                        className="
                                px-3
                                py-1.5
                                text-sm
                                font-medium
                                text-blue-600
                                border
                                border-blue-200
                                rounded-lg
                                hover:bg-blue-50
                              "
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
