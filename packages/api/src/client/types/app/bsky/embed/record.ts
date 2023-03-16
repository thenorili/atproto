/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import * as ComAtprotoRepoStrongRef from '../../../com/atproto/repo/strongRef'
import * as AppBskyActorDefs from '../actor/defs'

export interface Main {
  record: ComAtprotoRepoStrongRef.Main
  [k: string]: unknown
}

export function isMain(v: unknown): v is Main {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'app.bsky.embed.record#main' ||
      v.$type === 'app.bsky.embed.record')
  )
}

export function validateMain(v: unknown): ValidationResult {
  return lexicons.validate('app.bsky.embed.record#main', v)
}

export interface Presented {
  record:
    | PresentedRecord
    | PresentedNotFound
    | { $type: string; [k: string]: unknown }
  [k: string]: unknown
}

export function isPresented(v: unknown): v is Presented {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'app.bsky.embed.record#presented'
  )
}

export function validatePresented(v: unknown): ValidationResult {
  return lexicons.validate('app.bsky.embed.record#presented', v)
}

export interface PresentedRecord {
  uri: string
  cid: string
  author: AppBskyActorDefs.WithInfo
  record: {}
  [k: string]: unknown
}

export function isPresentedRecord(v: unknown): v is PresentedRecord {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'app.bsky.embed.record#presentedRecord'
  )
}

export function validatePresentedRecord(v: unknown): ValidationResult {
  return lexicons.validate('app.bsky.embed.record#presentedRecord', v)
}

export interface PresentedNotFound {
  uri: string
  [k: string]: unknown
}

export function isPresentedNotFound(v: unknown): v is PresentedNotFound {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'app.bsky.embed.record#presentedNotFound'
  )
}

export function validatePresentedNotFound(v: unknown): ValidationResult {
  return lexicons.validate('app.bsky.embed.record#presentedNotFound', v)
}
