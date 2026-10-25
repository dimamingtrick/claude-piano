export type Octave = number

declare module 'claude-code' {
  interface PluginState {
    piano: { isOpen: boolean; octave: Octave }
  }
}
