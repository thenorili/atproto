import AtpAgent from '@atproto/api'
import {
  ACKNOWLEDGE,
  FLAG,
  TAKEDOWN,
} from '@atproto/api/src/client/types/com/atproto/admin/defs'
import {
  REASONOTHER,
  REASONSPAM,
} from '../../../src/lexicon/types/com/atproto/moderation/defs'
import {
  runTestServer,
  forSnapshot,
  CloseFn,
  adminAuth,
  paginateAll,
} from '../../_util'
import { SeedClient } from '../../seeds/client'
import basicSeed from '../../seeds/basic'

describe('pds admin get moderation reports view', () => {
  let agent: AtpAgent
  let close: CloseFn
  let sc: SeedClient

  beforeAll(async () => {
    const server = await runTestServer({
      dbPostgresSchema: 'views_admin_get_moderation_reports',
    })
    close = server.close
    agent = new AtpAgent({ service: server.url })
    sc = new SeedClient(agent)
    await basicSeed(sc)
  })

  afterAll(async () => {
    await close()
  })

  beforeAll(async () => {
    const oneIn = (n) => (_, i) => i % n === 0
    const getAction = (i) => [FLAG, ACKNOWLEDGE, TAKEDOWN][i % 3]
    const getReasonType = (i) => [REASONOTHER, REASONSPAM][i % 2]
    const getReportedByDid = (i) => [sc.dids.alice, sc.dids.carol][i % 2]
    const posts = Object.values(sc.posts)
      .flatMap((x) => x)
      .filter(oneIn(2))
    const dids = Object.values(sc.dids).filter(oneIn(2))
    const recordReports: Awaited<ReturnType<typeof sc.createReport>>[] = []
    for (let i = 0; i < posts.length; ++i) {
      const post = posts[i]
      recordReports.push(
        await sc.createReport({
          reasonType: getReasonType(i),
          reportedBy: getReportedByDid(i),
          subject: {
            $type: 'com.atproto.repo.strongRef',
            uri: post.ref.uriStr,
            cid: post.ref.cidStr,
          },
        }),
      )
    }
    const repoReports: Awaited<ReturnType<typeof sc.createReport>>[] = []
    for (let i = 0; i < dids.length; ++i) {
      const did = dids[i]
      repoReports.push(
        await sc.createReport({
          reasonType: getReasonType(i),
          reportedBy: getReportedByDid(i),
          subject: {
            $type: 'com.atproto.admin.defs#repoRef',
            did,
          },
        }),
      )
    }
    for (let i = 0; i < recordReports.length; ++i) {
      const report = recordReports[i]
      const ab = oneIn(2)(report, i)
      const action = await sc.takeModerationAction({
        action: getAction(i),
        subject: {
          $type: 'com.atproto.repo.strongRef',
          uri: report.subject.uri,
          cid: report.subject.cid,
        },
      })
      if (ab) {
        await sc.resolveReports({
          actionId: action.id,
          reportIds: [report.id],
        })
      } else {
        await sc.reverseModerationAction({
          id: action.id,
        })
      }
    }
    for (let i = 0; i < repoReports.length; ++i) {
      const report = repoReports[i]
      const ab = oneIn(2)(report, i)
      const action = await sc.takeModerationAction({
        action: getAction(i),
        subject: {
          $type: 'com.atproto.admin.defs#repoRef',
          did: report.subject.did,
        },
      })
      if (ab) {
        await sc.resolveReports({
          actionId: action.id,
          reportIds: [report.id],
        })
      } else {
        await sc.reverseModerationAction({
          id: action.id,
        })
      }
    }
  })

  it('ignores subjects when specified.', async () => {
    // Get all reports and then make another request with a filter to ignore some subject dids
    // and assert that the reports for those subject dids are ignored in the result set
    const getDids = (reportsResponse) =>
      reportsResponse.data.reports
        .map((report) => report.subject.did)
        // Not all reports contain a did so we're discarding the undefined values in the mapped array
        .filter(Boolean)

    const allReports = await agent.api.com.atproto.admin.getModerationReports(
      {},
      { headers: { authorization: adminAuth() } },
    )

    const ignoreSubjects = getDids(allReports).slice(0, 2)

    const filteredReports =
      await agent.api.com.atproto.admin.getModerationReports(
        { ignoreSubjects },
        { headers: { authorization: adminAuth() } },
      )

    getDids(filteredReports).forEach((resultDid) =>
      expect(ignoreSubjects).not.toContain(resultDid),
    )
  })

  it('gets all moderation reports.', async () => {
    const result = await agent.api.com.atproto.admin.getModerationReports(
      {},
      { headers: { authorization: adminAuth() } },
    )
    expect(forSnapshot(result.data.reports)).toMatchSnapshot()
  })

  it('gets all moderation reports for a repo.', async () => {
    const result = await agent.api.com.atproto.admin.getModerationReports(
      { subject: Object.values(sc.dids)[0] },
      { headers: { authorization: adminAuth() } },
    )
    expect(forSnapshot(result.data.reports)).toMatchSnapshot()
  })

  it('gets all moderation reports for a record.', async () => {
    const result = await agent.api.com.atproto.admin.getModerationReports(
      { subject: Object.values(sc.posts)[0][0].ref.uriStr },
      { headers: { authorization: adminAuth() } },
    )
    expect(forSnapshot(result.data.reports)).toMatchSnapshot()
  })

  it('gets all resolved/unresolved moderation reports.', async () => {
    const resolved = await agent.api.com.atproto.admin.getModerationReports(
      { resolved: true },
      { headers: { authorization: adminAuth() } },
    )
    expect(forSnapshot(resolved.data.reports)).toMatchSnapshot()
    const unresolved = await agent.api.com.atproto.admin.getModerationReports(
      { resolved: false },
      { headers: { authorization: adminAuth() } },
    )
    expect(forSnapshot(unresolved.data.reports)).toMatchSnapshot()
  })

  it('allows reverting the order of reports.', async () => {
    const [
      {
        data: { reports: reverseList },
      },
      {
        data: { reports: defaultList },
      },
    ] = await Promise.all([
      agent.api.com.atproto.admin.getModerationReports(
        { reverse: true },
        { headers: { authorization: adminAuth() } },
      ),
      agent.api.com.atproto.admin.getModerationReports(
        {},
        { headers: { authorization: adminAuth() } },
      ),
    ])

    expect(defaultList[0].id).toEqual(reverseList[reverseList.length - 1].id)
    expect(defaultList[defaultList.length - 1].id).toEqual(reverseList[0].id)
  })

  it('gets all moderation reports by active resolution action type.', async () => {
    const reportsWithTakedown =
      await agent.api.com.atproto.admin.getModerationReports(
        { actionType: TAKEDOWN },
        { headers: { authorization: adminAuth() } },
      )
    expect(forSnapshot(reportsWithTakedown.data.reports)).toMatchSnapshot()
  })

  it('paginates.', async () => {
    const results = (results) => results.flatMap((res) => res.reports)
    const paginator = async (cursor?: string) => {
      const res = await agent.api.com.atproto.admin.getModerationReports(
        { cursor, limit: 3 },
        { headers: { authorization: adminAuth() } },
      )
      return res.data
    }

    const paginatedAll = await paginateAll(paginator)
    paginatedAll.forEach((res) =>
      expect(res.reports.length).toBeLessThanOrEqual(3),
    )

    const full = await agent.api.com.atproto.admin.getModerationReports(
      {},
      { headers: { authorization: adminAuth() } },
    )

    expect(full.data.reports.length).toEqual(6)
    expect(results(paginatedAll)).toEqual(results([full.data]))
  })

  it('paginates reverted list of reports.', async () => {
    const paginator =
      (reverse = false) =>
      async (cursor?: string) => {
        const res = await agent.api.com.atproto.admin.getModerationReports(
          { cursor, limit: 3, reverse },
          { headers: { authorization: adminAuth() } },
        )
        return res.data
      }

    const [reverseResponse, defaultResponse] = await Promise.all([
      paginateAll(paginator(true)),
      paginateAll(paginator()),
    ])

    const reverseList = reverseResponse.flatMap((res) => res.reports)
    const defaultList = defaultResponse.flatMap((res) => res.reports)

    expect(defaultList[0].id).toEqual(reverseList[reverseList.length - 1].id)
    expect(defaultList[defaultList.length - 1].id).toEqual(reverseList[0].id)
  })

  it('filters reports by reporter DID.', async () => {
    const result = await agent.api.com.atproto.admin.getModerationReports(
      { reporters: [sc.dids.alice] },
      { headers: { authorization: adminAuth() } },
    )

    const reporterDidsFromReports = [
      ...new Set(result.data.reports.map(({ reportedBy }) => reportedBy)),
    ]

    expect(reporterDidsFromReports.length).toEqual(1)
    expect(reporterDidsFromReports[0]).toEqual(sc.dids.alice)
  })
})
