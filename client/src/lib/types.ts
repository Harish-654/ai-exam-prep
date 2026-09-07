export interface StudyModule {
  title: string
  duration: string
  topics: string[]
}

export interface Syllabus {
  totalHours: number
  modules: StudyModule[]
}

export interface CalendarEvent {
  moduleIndex: number
  title: string
  startISO: string
  endISO: string
  timezone: string
  url: string
  topics: string[]
}

export interface PrepResult {
  fileName: string
  markdown: string
  syllabus: Syllabus
  calendar: CalendarEvent[]
}

export interface Session extends PrepResult {
  id: string
  timestamp: string
}

export type LogType = 'info' | 'success' | 'warn' | 'error'

export interface LogEntry {
  id: number
  type: LogType
  message: string
  timestamp: Date
}