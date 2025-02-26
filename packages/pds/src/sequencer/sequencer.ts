import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import Database from '../db'
import { seqLogger as log } from '../logger'
import { RepoSeqEntry } from '../db/tables/repo-seq'
import { cborDecode, check } from '@atproto/common'
import { commitEvt, handleEvt, SeqEvt, tombstoneEvt } from './events'

export * from './events'

export class Sequencer extends (EventEmitter as new () => SequencerEmitter) {
  polling = false
  queued = false

  constructor(public db: Database, public lastSeen = 0) {
    super()
    // note: this does not err when surpassed, just prints a warning to stderr
    this.setMaxListeners(100)
  }

  async start() {
    const curr = await this.curr()
    if (curr) {
      this.lastSeen = curr.seq ?? 0
    }
    this.db.channels.outgoing_repo_seq.addListener('message', () => {
      if (this.polling) {
        this.queued = true
      } else {
        this.polling = true
        this.pollDb()
      }
    })
  }

  async curr(): Promise<SeqRow | null> {
    const got = await this.db.db
      .selectFrom('repo_seq')
      .selectAll()
      .where('seq', 'is not', null)
      .orderBy('seq', 'desc')
      .limit(1)
      .executeTakeFirst()
    return got || null
  }

  async next(cursor: number): Promise<SeqRow | null> {
    const got = await this.db.db
      .selectFrom('repo_seq')
      .selectAll()
      .where('seq', 'is not', null)
      .where('seq', '>', cursor)
      .limit(1)
      .orderBy('seq', 'asc')
      .executeTakeFirst()
    return got || null
  }

  async requestSeqRange(opts: {
    earliestSeq?: number
    latestSeq?: number
    earliestTime?: string
    limit?: number
  }): Promise<SeqEvt[]> {
    const { earliestSeq, latestSeq, earliestTime, limit } = opts

    let seqQb = this.db.db
      .selectFrom('repo_seq')
      .selectAll()
      .orderBy('seq', 'asc')
      .where('seq', 'is not', null)
      .where('invalidated', '=', 0)
    if (earliestSeq !== undefined) {
      seqQb = seqQb.where('seq', '>', earliestSeq)
    }
    if (latestSeq !== undefined) {
      seqQb = seqQb.where('seq', '<=', latestSeq)
    }
    if (earliestTime !== undefined) {
      seqQb = seqQb.where('sequencedAt', '>=', earliestTime)
    }
    if (limit !== undefined) {
      seqQb = seqQb.limit(limit)
    }

    const rows = await seqQb.execute()
    if (rows.length < 1) {
      return []
    }

    const seqEvts: SeqEvt[] = []
    for (const row of rows) {
      // should never hit this because of WHERE clause
      if (row.seq === null) {
        continue
      }
      const evt = cborDecode(row.event)
      if (check.is(evt, commitEvt)) {
        seqEvts.push({
          type: 'commit',
          seq: row.seq,
          time: row.sequencedAt,
          evt,
        })
      } else if (check.is(evt, handleEvt)) {
        seqEvts.push({
          type: 'handle',
          seq: row.seq,
          time: row.sequencedAt,
          evt,
        })
      } else if (check.is(evt, tombstoneEvt)) {
        seqEvts.push({
          type: 'tombstone',
          seq: row.seq,
          time: row.sequencedAt,
          evt,
        })
      }
    }

    return seqEvts
  }

  async pollDb() {
    try {
      const evts = await this.requestSeqRange({
        earliestSeq: this.lastSeen,
        limit: 10,
      })
      if (evts.length > 0) {
        this.emit('events', evts)
        this.lastSeen = evts.at(-1)?.seq ?? this.lastSeen
      }
    } catch (err) {
      log.error({ err, lastSeen: this.lastSeen }, 'sequencer failed to poll db')
    } finally {
      // check if we should continue polling
      if (this.queued === false) {
        this.polling = false
      } else {
        this.queued = false
        this.pollDb()
      }
    }
  }
}

type SeqRow = RepoSeqEntry

type SequencerEvents = {
  events: (evts: SeqEvt[]) => void
}

export type SequencerEmitter = TypedEmitter<SequencerEvents>

export default Sequencer
