import type MarkdownIt from 'markdown-it'
import type StateBlock from 'markdown-it/lib/rules_block/state_block'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline'
import mKatex from '@traptitech/markdown-it-katex'

/**
 * KaTeX with LaTeX delimiters \( \) and \[ \] in place of $ and $$.
 * Also accepts \\( \\) and \\[ \\], the escaped form used by docs written for
 * MathJax (e.g. Hugging Face), where markdown turns \\( into \( before MathJax runs.
 * Reuses the katex plugin's renderers, only the parse rules are swapped.
 */
export default function KatexBracketsPlugin(md: MarkdownIt) {
  md.use(mKatex)
  md.inline.ruler.disable('math_inline')
  md.block.ruler.disable('math_block')
  // Must run before 'escape', which would otherwise turn \( into a plain (
  md.inline.ruler.before('escape', 'math_inline_bracket', mathInline)
  md.block.ruler.after('blockquote', 'math_block_bracket', mathBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })
}

function mathInline(state: StateInline, silent: boolean) {
  const prefix = state.src.startsWith('\\\\', state.pos) ? '\\\\' : '\\'
  const start = state.pos + prefix.length
  const bracket = state.src[start]
  if (bracket !== '(' && bracket !== '[') return false
  const close = prefix + (bracket === '(' ? ')' : ']')
  const end = state.src.indexOf(close, start + 1)
  if (end === -1 || end + close.length > state.posMax) return false
  if (!silent) {
    const token = state.push('math_inline', 'math', 0)
    token.markup = prefix + bracket
    token.content = toLatex(state, prefix, state.src.slice(start + 1, end))
    // Mid-line \[ \] stays inline so the paragraph isn't split, but keeps display sizing
    if (bracket === '[') token.content = `\\displaystyle ${token.content}`
  }
  state.pos = end + close.length
  return true
}

function mathBlock(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
) {
  const start = state.bMarks[startLine] + state.tShift[startLine]
  const prefix = state.src.startsWith('\\\\[', start)
    ? '\\\\'
    : state.src.startsWith('\\[', start)
    ? '\\'
    : null
  if (!prefix) return false
  const close = prefix + ']'

  const lines: string[] = []
  for (let line = startLine; line < endLine; line++) {
    // LaTeX display math can't span a blank line; a dedent leaves the list item
    if (
      line > startLine &&
      (state.isEmpty(line) || state.sCount[line] < state.blkIndent)
    ) {
      return false
    }
    const from =
      line === startLine
        ? start + prefix.length + 1
        : state.bMarks[line] + state.tShift[line]
    const text = state.src.slice(from, state.eMarks[line]).trimEnd()
    if (!text.endsWith(close)) {
      lines.push(text)
      continue
    }
    if (silent) return true

    lines.push(text.slice(0, -close.length))
    const token = state.push('math_block', 'math', 0)
    token.block = true
    token.content = toLatex(state, prefix, lines.join('\n'))
    token.markup = prefix + '['
    token.map = [startLine, line + 1]
    state.line = line + 1
    return true
  }
  return false
}

// The escaped form's body went through markdown escaping too (\\{ means \{), so undo it
function toLatex(state: StateInline | StateBlock, prefix: string, src: string) {
  return prefix === '\\\\' ? state.md.utils.unescapeMd(src) : src
}
