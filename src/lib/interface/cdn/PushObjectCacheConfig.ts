export interface PushObjectCacheConfig {
    objectPaths: Array<string>
    area?: 'domestic' | 'overseas'
    l2Preload?: boolean
}
