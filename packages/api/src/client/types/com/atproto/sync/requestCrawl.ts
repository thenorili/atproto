/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { Headers, XRPCError } from '@atproto/xrpc'
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'

export interface QueryParams {
  /** Hostname of the service that is requesting to be crawled. */
  hostname: string
}

export type InputSchema = undefined

export interface CallOptions {
  headers?: Headers
}

export interface Response {
  success: boolean
  headers: Headers
}

export function toKnownErr(e: any) {
  if (e instanceof XRPCError) {
  }
  return e
}
