// DeepSeek Harness has no hook that runs after a compaction, so this plugin is one: after a compaction it runs
// ../after-compaction.sh, the script Claude Code and Codex run from their own hooks, and adds what it prints to the
// next model step as a message of its own.
// It doesn't listen for the compaction. Before every step it reads the conversation the model will see: when the
// newest compaction summary has no reminder carrying its id, one is owed. That holds for automatic and manual
// compactions, survives an app restart, and adds each reminder once. dsh's own AGENTS.md loader works the same way.
// Install: in the app, Plugins, Add plugin, and give this folder's absolute path.
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

export const name = 'after-compaction'
export const inject = ['workingDirectory']

const SOURCE_KIND = 'after-compaction'
const SCRIPT = fileURLToPath(new URL('../after-compaction.sh', import.meta.url))
const SCRIPT_TIMEOUT_MS = 10_000

// The id of the newest compaction summary the model sees, when no reminder for it is in view; otherwise undefined.
function owedCompaction(session) {
  const reminded = new Set()
  let newest
  for (const seq of session.surface.nodes) {
    const event = session.eventAt(seq)
    if (event?.type !== 'user/message') continue
    const source = event.data.source
    if (source.kind === 'compact-checkpoint') newest = source.compactionId
    else if (source.kind === SOURCE_KIND) reminded.add(source.compactionId)
  }
  return newest !== undefined && !reminded.has(newest) ? newest : undefined
}

// Runs the script with the hook input it expects on stdin and returns the text it wants in the model's context.
// A failure comes back as text too: a reminder that silently doesn't arrive is the fault this plugin exists to fix.
function reminderText(input, signal) {
  return new Promise((resolve) => {
    const child = execFile('/bin/sh', [SCRIPT], { timeout: SCRIPT_TIMEOUT_MS, signal }, (error, stdout) => {
      if (error) {
        resolve(`The after-compaction hook failed (${error.message.trim()}), so the rules, Laws, and waypoint were not loaded again. In the first line of your reply, tell the user so.`)
        return
      }
      let context
      try {
        context = JSON.parse(stdout).hookSpecificOutput.additionalContext
      } catch {
        // Without jq the script prints its text plain.
      }
      resolve(typeof context === 'string' ? context : stdout)
    })
    child.stdin.end(JSON.stringify(input))
  })
}

export function apply(ctx) {
  // Prepended, so this listener is the outermost: no other listener rewrites the batch after the reminder is added.
  ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
    // Compaction under pressure runs inside this chain, so by the time next() returns its summary is in view.
    const decision = await next()
    if (decision.kind !== 'enter' || agent.session.header.origin === 'subagent') return decision
    const compactionId = owedCompaction(agent.session)
    if (compactionId === undefined) return decision

    const cwd = await ctx.workingDirectory.ensure(agent, signal)
    const text = await reminderText({ session_id: agent.session.header.id, cwd }, signal)
    signal.throwIfAborted()
    const reminder = createUserMessage({
      content: [{ type: 'text', text }],
      source: {
        kind: SOURCE_KIND,
        form: 'notice',
        summary: 'Context was compacted: read the rules, the Laws, and the waypoint again',
        compactionId,
      },
    })
    return { ...decision, messages: [...decision.messages, reminder] }
  }, { prepend: true })
}
