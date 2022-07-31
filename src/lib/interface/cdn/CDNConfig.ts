import {SourceConfig} from "./SourceConfig";
import {RefreshConfig} from "./RefreshConfig";
import {PushObjectCacheConfig} from "./PushObjectCacheConfig";

export interface CDNConfig {
    cdnType: 'web' | 'download' | 'video'
    domainName: string
    sources: Array<SourceConfig>
    checkUrl?: string
    scope?: 'domestic' | 'overseas' | 'global'
    topLevelDomain?: string
    refreshConfig? : RefreshConfig
    pushObjectCacheConfig? : PushObjectCacheConfig
    waitUntilFinished: boolean
    maxWaitMs: number
    refreshAfterDeploy: boolean
    autoOpen: boolean
    autoCreate: boolean
    autoStart: boolean
}
