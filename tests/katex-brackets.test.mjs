import test from 'node:test'
import assert from 'node:assert/strict'
import MarkdownIt from 'markdown-it'

const render = async src => {
  const { default: KatexBracketsPlugin } = await import(
    '../src/plugins/katex-brackets.ts'
  )
  return new MarkdownIt().use(KatexBracketsPlugin).render(src)
}

test('renders \\( \\) as inline math', async () => {
  const html = await render('a \\(x^2\\) b')
  assert.match(html, /<p>a <span class="katex">/)
  assert.doesNotMatch(html, /\\\(/)
})

test('renders multi-line \\[ \\] as a display block', async () => {
  const html = await render('text\n\\[\n\\frac{a}{b}\n\\]\nafter')
  assert.match(html, /<p class="katex-block ">/)
  assert.match(html, /<p>after<\/p>/)
})

test('renders mid-line \\[ \\] inline with display sizing', async () => {
  const html = await render('see \\[\\sum x\\] here')
  assert.match(html, /<p>see <span class="katex">/)
  assert.match(html, /\\displaystyle/)
})

test('renders escaped \\\\( \\\\) used by MathJax-style docs', async () => {
  // Line taken from huggingface.co/learn/deep-rl-course/unit4/pg-theorem.md
  const html = await render('action comes from \\\\(\\pi_\\theta\\\\):')
  assert.match(html, /<p>action comes from <span class="katex">/)
  assert.match(html, /<\/span>:<\/p>/)
})

test('unescapes markdown escapes inside the escaped form', async () => {
  const html = await render('\\\\(\\\\{a\\\\}\\\\)')
  assert.doesNotMatch(html, /katex-error/)
  assert.match(html, /<mo stretchy="false">\{<\/mo>/)
})

test('renders escaped \\\\[ \\\\] as a display block', async () => {
  const html = await render('\\\\[\nx = 1\n\\\\]')
  assert.match(html, /<p class="katex-block ">/)
})

test('leaves $ delimiters as plain text', async () => {
  const html = await render('costs $5 and $x$')
  assert.equal(html, '<p>costs $5 and $x$</p>\n')
})

test('leaves unclosed or blank-line-split delimiters alone', async () => {
  assert.equal(await render('a \\(b'), '<p>a (b</p>\n')
  assert.doesNotMatch(await render('\\[\na\n\nb\n\\]'), /katex-block/)
})

test('ignores delimiters inside code spans', async () => {
  assert.equal(await render('`\\(x\\)`'), '<p><code>\\(x\\)</code></p>\n')
})
