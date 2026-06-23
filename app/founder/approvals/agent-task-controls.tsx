'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import {
  approveAgentTask,
  rejectAgentTask,
  type AgentTaskDecisionState,
} from './agent-task-actions'

const INIT: AgentTaskDecisionState = { ok: false, message: '' }

export function AgentTaskControls({ taskId }: { taskId: string }) {
  const [approveState, setApproveState] = useState<AgentTaskDecisionState>(INIT)
  const [rejectState, setRejectState] = useState<AgentTaskDecisionState>(INIT)
  const [isPending, startTransition] = useTransition()
  const [pendingType, setPendingType] = useState<'approve' | 'reject' | null>(null)

  const decided = approveState.ok || rejectState.ok

  const handleApprove = () => {
    setPendingType('approve')
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('task_id', taskId)
        const res = await approveAgentTask(approveState, formData)
        setApproveState(res)
      } finally {
        setPendingType(null)
      }
    })
  }

  const handleReject = () => {
    setPendingType('reject')
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('task_id', taskId)
        const res = await rejectAgentTask(rejectState, formData)
        setRejectState(res)
      } finally {
        setPendingType(null)
      }
    })
  }

  if (decided) {
    const wasApproved = approveState.ok
    return (
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ${
        wasApproved
          ? 'bg-accent/10 text-accent'
          : 'bg-severity-critical/10 text-severity-critical'
      }`}>
        {wasApproved
          ? <CheckCircle2 className="h-4 w-4" />
          : <XCircle      className="h-4 w-4" />}
        {wasApproved ? approveState.message : rejectState.message}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Approve */}
      <button
        type="button"
        onClick={handleApprove}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
      >
        {isPending && pendingType === 'approve'
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <CheckCircle2 className="h-3.5 w-3.5" />}
        Approve
      </button>

      {/* Reject */}
      <button
        type="button"
        onClick={handleReject}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-severity-critical/20 bg-severity-critical/5 px-3.5 py-1.5 text-[13px] font-semibold text-severity-critical transition-colors hover:bg-severity-critical/10 disabled:opacity-50"
      >
        {isPending && pendingType === 'reject'
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <XCircle className="h-3.5 w-3.5" />}
        Reject
      </button>
    </div>
  )
}

