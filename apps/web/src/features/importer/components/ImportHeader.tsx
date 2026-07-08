import { Bot, DatabaseZap, Moon, Sun } from "lucide-react";

interface ImportHeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export function ImportHeader({
  isDarkMode,
  onToggleTheme
}: ImportHeaderProps) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
            <DatabaseZap aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              GrowEasy CRM
            </p>
            <p className="truncate text-xs text-muted">
              Lead import workspace
            </p>
          </div>
        </div>

        <nav aria-label="Workspace" className="hidden items-center gap-5 md:flex">
          <a className="text-sm font-medium text-ink" href="#import-heading">
            Import
          </a>
          <a className="text-sm text-muted hover:text-ink" href="#workflow-heading">
            Workflow
          </a>
          <a className="text-sm text-muted hover:text-ink" href="#summary-heading">
            Summary
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label="AI provider status"
            className="hidden h-9 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium text-ink shadow-sm sm:flex"
            type="button"
          >
            <Bot aria-hidden="true" className="h-4 w-4 text-leaf" />
            OpenAI
          </button>
          <button
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDarkMode}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink shadow-sm"
            onClick={onToggleTheme}
            type="button"
          >
            {isDarkMode ? (
              <Sun aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Moon aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
