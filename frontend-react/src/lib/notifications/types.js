/**
 * Shared shapes for the notification system. JSDoc only — the project is
 * plain JS, and these give editors the same autocomplete and checks.
 *
 * @typedef {'vaccination_due'
 *   | 'vaccination_overdue'
 *   | 'feed_low'
 *   | 'feed_out'
 *   | 'feed_logged'
 *   | 'logging_reminder'
 *   | 'withdrawal_ended'
 *   | 'supplement_added'
 *   | 'batch_completed'
 *   | 'bird_lost'
 *   | 'report_ready'
 *   | 'system_update'} NotificationType
 *
 * @typedef {Object} Notification
 * @property {string} id           Stable across refetches, so read state sticks.
 * @property {NotificationType} type
 * @property {import('./meta').NotificationCategory} [category]  Filled in by the source from ./meta.js.
 * @property {string} title
 * @property {string} message
 * @property {string} [link]       In-app path to open when the notification is clicked.
 * @property {boolean} read
 * @property {string} created_at   ISO 8601.
 *
 * @typedef {'idle' | 'loading' | 'ready' | 'error'} NotificationStatus
 *
 * A notification source — where notifications come from and where read /
 * delete state goes. See ./source.js for the one in use and how to replace
 * it with a real API.
 *
 * @typedef {Object} NotificationSource
 * @property {(ctx: SourceContext) => Promise<Notification[]>} list
 * @property {(ctx: SourceContext, ids: string[]) => Promise<void>} markRead
 * @property {(ctx: SourceContext, ids: string[]) => Promise<void>} remove
 *
 * @typedef {Object} SourceContext
 * @property {string} farmId
 * @property {Array<Object>} batches  From BatchContext.
 */

export {};
