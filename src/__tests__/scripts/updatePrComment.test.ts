/** PRごとに各検証コメントの更新先を分ける */
import { describe, expect, it } from 'vitest'
import { findMarkedComment } from '../../../scripts/updatePrComment'

describe('PRコメントのマーカー検索', () => {
  it('指定したマーカーの最新コメントだけを選ぶ', () => {
    const comments = [
      { id: 1, body: '<!-- calculation --> old', created_at: '2026-11-12T10:00:00Z' },
      { id: 2, body: '<!-- cp-sat --> report', created_at: '2026-11-12T11:00:00Z' },
      { id: 3, body: '<!-- calculation --> new', created_at: '2026-11-12T12:00:00Z' },
    ]

    expect(findMarkedComment(comments, '<!-- calculation -->')?.id).toBe(3)
    expect(findMarkedComment(comments, '<!-- cp-sat -->')?.id).toBe(2)
    expect(findMarkedComment(comments, '<!-- visual -->')).toBeUndefined()
  })
})
