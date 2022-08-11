import {RefreshConfig} from "./RefreshConfig";
import {PushObjectCacheConfig} from "./PushObjectCacheConfig";

export interface Output{
    cdnType: string
    domainName: string
    status?: string
    cname: string
    sources: Array<any>
    checkUrl?: string
    scope?: 'domestic' | 'overseas' | 'global'
    topLevelDomain?: string
    refreshConfig? : RefreshConfig
    pushObjectCacheConfig? : PushObjectCacheConfig
}
