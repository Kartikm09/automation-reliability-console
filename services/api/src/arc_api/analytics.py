"""Operational metrics calculated from canonical runs."""

from __future__ import annotations

from statistics import fmean

from arc_api.models import AnalyticsInput, AnalyticsSummary, RunStatus


def summarize_runs(value: AnalyticsInput) -> AnalyticsSummary:
    total = len(value.runs)
    successful = sum(run.run_status is RunStatus.SUCCEEDED for run in value.runs)
    durations = [run.duration_ms for run in value.runs if run.duration_ms is not None]
    return AnalyticsSummary(
        total_runs=total,
        success_rate=round((successful / total * 100) if total else 0.0, 2),
        average_duration_ms=round(fmean(durations), 2) if durations else None,
        failed_runs=sum(run.run_status is RunStatus.FAILED for run in value.runs),
        timed_out_runs=sum(run.run_status is RunStatus.TIMED_OUT for run in value.runs),
    )
