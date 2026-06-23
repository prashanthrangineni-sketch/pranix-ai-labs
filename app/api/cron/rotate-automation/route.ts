import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  // Check auth using temp header key
  const authHeader = request.headers.get('x-temp-auth')
  if (authHeader !== 'temp_key_rotate_7749fbc2e') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const results: any[] = []
  
  // 1. Rotate Vercel Protection Bypass Secret for all projects
  const projects = [
    { id: 'prj_uo6IdwELmeYobNdh5FeCqmLZZfG8', name: 'quickscanz' },
    { id: 'prj_VUQiwAYTDJV8PGtTncSXe8d70eJ4', name: 'pranix-ai-labs' },
    { id: 'prj_Z7LIsYrOomJjwCbmU3csuH562awz', name: 'pranix-agent-engine' },
    { id: 'prj_cjIxaFMlHZQReaf3sdrJY1osCA9V', name: 'schoolos' },
    { id: 'prj_kotdxYxu1ERlIRGvviWlRGGafg5O', name: 'vidyagrid' },
    { id: 'prj_a1jh9sYHcwjrZeB0bAe1P0LQGc3F', name: 'cart2save' },
    { id: 'prj_9BUpRHfKJuwMer8zsPxjZrj2bH2w', name: 'quietkeep' },
    { id: 'prj_rKIwOpLJo8mXintI43Djge18hlDf', name: 'cart2save-ondc-preprod' },
    { id: 'prj_w1KAV9jBYTjytV77mH9L11BIQVMS', name: 'cart2save-ondc-preprod-main' }
  ]

  const teamId = 'team_uGOmdnVSpbocQEAszoKNIN1m'
  const tokens = ([process.env.VERCEL_TOKEN, process.env.VERCEL_SECONDARY_TOKEN].filter(Boolean)) as string[]

  for (const project of projects) {
    let success = false
    const errors: string[] = []

    for (const token of tokens) {
      for (const useTeam of [false, true]) {
        const url = `https://api.vercel.com/v1/projects/${project.id}/protection-bypass` + (useTeam ? `?teamId=${teamId}` : '')
        try {
          const res = await fetch(url, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          })

          if (res.ok) {
            success = true
            results.push({
              project: project.name,
              status: 'success',
              useTeam,
              tokenPrefix: token.slice(0, 10) + '...'
            })
            break
          } else {
            const text = await res.text()
            errors.push(`TokenPrefix: ${token.slice(0, 10)}... Team: ${useTeam} -> ${res.status}: ${text}`)
          }
        } catch (e: any) {
          errors.push(`TokenPrefix: ${token.slice(0, 10)}... Team: ${useTeam} -> Error: ${e.message}`)
        }
      }
      if (success) break
    }

    if (!success) {
      results.push({
        project: project.name,
        status: 'failed',
        errors
      })
    }
  }

  // 2. Set PranixQuick/pranix-agent-engine repository to Private on GitHub
  let githubResult: any = {}
  try {
    const githubUrl = 'https://api.github.com/repos/PranixQuick/pranix-agent-engine'
    const githubRes = await fetch(githubUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${process.env.GITHUB_PAT}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Pranix-Automation-Rotator/1.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ private: true })
    })

    if (githubRes.ok) {
      githubResult = { status: 'success' }
    } else {
      const text = await githubRes.text()
      githubResult = { status: 'failed', code: githubRes.status, body: text }
    }
  } catch (e: any) {
    githubResult = { status: 'error', message: e.message }
  }

  return NextResponse.json({
    vercel_bypass_rotation: results,
    github_private_repo: githubResult
  })
}
