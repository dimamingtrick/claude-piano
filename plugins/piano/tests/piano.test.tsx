import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'piano',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const

const RUN = {
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 100 },
} as const

test('/piano plays by mouse and keyboard, shifts octave and closes', async ($, on) => {
  const played: string[] = []
  on('command.register', () => ({ value: { command: 'piano' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('audio.play', (_, e) => {
    if (e.clip.asset !== undefined) played.push(e.clip.asset)
    return { value: undefined }
  })
  on('ui.message', () => ({}))
  // Stands for the engine's own (empty) band.
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const closed = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await closed.find({ key: 'keys' })).toBeUndefined()
  await closed.unmount()

  const opened = await $.command.run({ command: 'piano', ...RUN })
  expect(opened.text).toMatch(/открыто/)

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ key: 'keys' })).toBeDefined()

  // Inside a 1-cell frame: (2, 6) is the first C, (4, 1) is C#.
  await ui.pointer({ type: 'down', x: 2, y: 6, button: 'left', in: 'keys' })
  await ui.pointer({ type: 'up', x: 2, y: 6, button: 'left', in: 'keys' })
  await ui.pointer({ type: 'down', x: 4, y: 1, button: 'left', in: 'keys' })
  await ui.pointer({ type: 'up', x: 4, y: 1, button: 'left', in: 'keys' })
  await ui.key({ key: 'z', in: 'keys' })
  await ui.key({ key: 'я', in: 'keys' })
  await ui.key({ key: 'i', in: 'keys' })
  await ui.key({ key: 'right', in: 'keys' })
  await ui.key({ key: 'z', in: 'keys' })
  await ui.unmount()

  expect(played).toEqual([
    'sounds/C3.wav',
    'sounds/Cs3.wav',
    'sounds/C3.wav',
    'sounds/C3.wav',
    'sounds/C5.wav',
    'sounds/C4.wav',
  ])

  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await terminal.find({ key: 'keys' })).toBeDefined()
  await terminal.press({ key: 'close' })
  await terminal.unmount()

  const after = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await after.find({ key: 'keys' })).toBeUndefined()
  await after.unmount()
})
