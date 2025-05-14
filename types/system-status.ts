export type SystemStatusType = "connected" | "processing" | "error"

export interface SystemStatus {
  status: SystemStatusType
  message: string
}
