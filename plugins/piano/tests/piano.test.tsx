import { expect, test } from 'claude-code/testing'

import { unseen } from '../hooks/register'

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

test('fast presses in one frame each play a note', async ($, on) => {
  const played: string[] = []
  on('command.register', () => ({ value: { command: 'piano' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('audio.play', (_, e) => {
    if (e.clip.asset !== undefined) played.push(e.clip.asset)
    return { value: undefined }
  })
  on('ui.message', () => ({}))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'piano', ...RUN })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.key({ key: 'm', in: 'keys' })
  await Promise.all(
    ['z', 'x', 'c', 'v', 'b'].map(key => ui.key({ key, in: 'keys' })),
  )
  await ui.key({ key: 'n', in: 'keys' })
  await ui.unmount()

  expect([...played].sort()).toEqual(
    ['sounds/B3.wav', 'sounds/C3.wav', 'sounds/D3.wav', 'sounds/E3.wav', 'sounds/F3.wav', 'sounds/G3.wav', 'sounds/A3.wav'].sort(),
  )
})

test('a reload replays none of the notes played before it', async () => {
  const seen = new Map<string, number>()
  const events = [1, 2, 3].map(seq => ({ seq, play: seq }))

  expect(unseen({ id: 'a', events }, seen)).toEqual([{ seq: 3, play: 3 }])
  expect(unseen({ id: 'a', events: [...events, { seq: 4, play: 4 }, { seq: 5, shift: 1 }] }, seen)).toEqual([
    { seq: 4, play: 4 },
    { seq: 5, shift: 1 },
  ])
  expect(unseen({ id: 'a', events }, seen)).toEqual([])
})
