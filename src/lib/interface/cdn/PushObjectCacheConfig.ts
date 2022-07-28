export interface PushObjectCacheConfig {
    objectPaths: Array<string>
    area?: 'domestic' | 'overseas'
    L2Preload?: boolean
}
