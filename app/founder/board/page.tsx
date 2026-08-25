import type { Metadata } from 'next'
import { getTaskBoardData } from '@/lib/queries'
import { TaskBoard } from '../_components/TaskBoard'

export const metadata: Metadata = { title: 'Project Board' }
export const revalidate = 60

// The project task board renders a triple-nested loop — ten product groups,
// each with missions, each with steps — and pre-seeds every product group so
// empty ones render too. Per byte of source it is the tallest element the
// Overview had, and it pushed everything below it off the first two screens.
//
// It is genuinely useful; it just is not a summary. Own route.
export default async function ProjectBoardPage() {
  const taskBoardData = await getTaskBoardData()

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-fg-primary">Project Board</h1>
        <p className="text-[12px] text-fg-muted mt-1">
          Missions and steps by product, with the worker handling each one.
        </p>
      </div>

      <TaskBoard
        missions={taskBoardData.missions}
        steps={taskBoardData.steps}
        heartbeats={taskBoardData.heartbeats}
      />
    </div>
  )
}
