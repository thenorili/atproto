/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'

export interface WithInfo {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  viewer?: ViewerState
  [k: string]: unknown
}

export function isWithInfo(v: unknown): v is WithInfo {
  return (
    isObj(v) && hasProp(v, '$type') && v.$type === 'app.bsky.actor.ref#withInfo'
  )
}

export function validateWithInfo(v: unknown): ValidationResult {
  return lexicons.validate('app.bsky.actor.ref#withInfo', v)
}

export interface ViewerState {
  muted?: boolean
  following?: string
  followedBy?: string
  [k: string]: unknown
}

export function isViewerState(v: unknown): v is ViewerState {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'app.bsky.actor.ref#viewerState'
  )
}

export function validateViewerState(v: unknown): ValidationResult {
  return lexicons.validate('app.bsky.actor.ref#viewerState', v)
}
