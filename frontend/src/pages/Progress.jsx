import { useCallback, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { DifficultyBarChart, SolvedOverTimeChart } from '../components/ProgressChart'
import TopicProgress from '../components/TopicProgress'
import ActivityGrid from '../components/ActivityGrid'
import RevisionCalendar from '../components/RevisionCalendar'
import * as api from '../api/api'

export default function Progress() {
  const [progress, setProgress] = useState(null)
  const [topics, setTopics] = useState(null)
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await api.getProgress()
      setProgress(data)
      // The extra panels are optional: if one fails, the rest of the page still shows.
      api.getTopicProgress().then(setTopics).catch(() => setTopics({ topics: [] }))
      api.getActivity().then(setActivity).catch(() => setActivity(null))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <Navbar title="Progress" subtitle="Your solving and revision activity" />
      <div className="px-8 py-6 max-w-5xl">
        {error && (
          <div className="rounded-card border border-hard/30 bg-hard-bg p-4 mb-6 text-sm text-hard">
            Unable to load progress. ({error})
          </div>
        )}

        {loading && !error && <LoadingSpinner label="Loading progress…" />}

        {progress && !error && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <StatCard label="Total solved" value={progress.total_solved} />
              <StatCard label="Easy solved" value={progress.easy_solved} accentClass="text-easy" />
              <StatCard label="Medium solved" value={progress.medium_solved} accentClass="text-medium" />
              <StatCard label="Hard solved" value={progress.hard_solved} accentClass="text-hard" />
              <StatCard label="Revisions completed" value={progress.revisions_completed} accentClass="text-accent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <Panel
                title="Sheet progress"
                note={
                  topics && topics.topics.length
                    ? `${topics.topics.reduce((n, t) => n + t.solved, 0)} of ${topics.topics.reduce(
                        (n, t) => n + t.total,
                        0
                      )} questions solved`
                    : 'Solved questions by topic'
                }
              >
                {topics ? <TopicProgress topics={topics.topics} /> : <Quiet>Loading…</Quiet>}
              </Panel>

              <div className="space-y-4">
                <Panel
                  title="Activity"
                  note={
                    activity
                      ? `${activity.current_streak}-day streak · best ${activity.longest_streak} · ${activity.active_days} active days in 12 weeks`
                      : 'Last 12 weeks'
                  }
                >
                  {activity ? <ActivityGrid days={activity.days} /> : <Quiet>Loading…</Quiet>}
                </Panel>
                <Panel title="Revision calendar" note="Days your revisions come due">
                  <RevisionCalendar />
                </Panel>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-card border border-base-border bg-base-card p-5 shadow-card">
                <h3 className="text-sm font-medium text-ink mb-1">Difficulty distribution</h3>
                <p className="text-xs text-ink-muted mb-3">Questions solved by difficulty</p>
                {progress.total_solved === 0 ? (
                  <EmptyChart message="Solve a few questions to see this chart fill in." />
                ) : (
                  <DifficultyBarChart
                    easy={progress.easy_solved}
                    medium={progress.medium_solved}
                    hard={progress.hard_solved}
                  />
                )}
              </div>

              <div className="rounded-card border border-base-border bg-base-card p-5 shadow-card">
                <h3 className="text-sm font-medium text-ink mb-1">Solved over time</h3>
                <p className="text-xs text-ink-muted mb-3">Questions solved per day</p>
                {progress.solved_over_time.length === 0 ? (
                  <EmptyChart message="No solve history yet." />
                ) : (
                  <SolvedOverTimeChart data={progress.solved_over_time} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Panel({ title, note, children }) {
  return (
    <div className="rounded-card border border-base-border bg-base-card p-5 shadow-card">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <p className="text-xs text-ink-muted mt-0.5 mb-4">{note}</p>
      {children}
    </div>
  )
}

function Quiet({ children }) {
  return <p className="text-sm text-ink-faint py-4">{children}</p>
}

function EmptyChart({ message }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-center text-sm text-ink-faint px-6">
      {message}
    </div>
  )
}
