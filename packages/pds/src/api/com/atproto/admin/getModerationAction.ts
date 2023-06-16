import { Server } from '../../../../lexicon'
import AppContext from '../../../../context'

export default function (server: Server, ctx: AppContext) {
  server.com.atproto.admin.getModerationAction({
    auth: ctx.triageVerifier,
    handler: async ({ params, auth }) => {
      const access = auth.credentials
      const { db, services } = ctx
      const { id } = params
      const moderationService = services.moderation(db)
      const result = await moderationService.getActionOrThrow(id)
      return {
        encoding: 'application/json',
        body: await moderationService.views.actionDetail(result, {
          includeEmails: access.moderator,
        }),
      }
    },
  })
}
