import test from 'node:test'
import assert from 'node:assert/strict'

const { decodeText } = await import('../src/core/fetch-text.ts')

test('prefers UTF-8 over a mis-guessed GBK charset', () => {
  const buf = new TextEncoder().encode('# 数据准备').buffer
  assert.equal(decodeText(buf, 'GBK'), '# 数据准备')
})

test('falls back to the page charset for real GBK bytes', () => {
  const buf = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4]).buffer // "中文" in GBK
  assert.equal(decodeText(buf, 'GBK'), '中文')
})
