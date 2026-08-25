import { redirect } from 'next/navigation'

// RETIRED 2026-08-25.
//
// Same story as /founder/ai: this page displayed "Provider controls now live
// under the AI Workspace" and then rendered the provider controls anyway.
//
// IMPORTANT — do not delete this folder. `ProviderControls.tsx` still lives
// beside this file, and app/founder/workspace/page.tsx imports it from here:
//
//     import { ProviderControls } from '../orchestrate/ProviderControls'
//
// So the deprecated route is a live dependency of its own replacement. Only
// the page is retired. Moving the component into workspace/ is the tidier end
// state, but it is a separate change with its own risk, and bundling it here
// would mean this cleanup could break the page it redirects to.
export default function RetiredOrchestratePage() {
  redirect('/founder/workspace')
}
