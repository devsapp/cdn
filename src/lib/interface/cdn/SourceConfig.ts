export interface SourceConfig {
    type: 'ipaddr' | 'domain' | 'oss' | 'fc_domain'
    content: string
    port?: number
    priority: 20 | 30
    weight: number
}
