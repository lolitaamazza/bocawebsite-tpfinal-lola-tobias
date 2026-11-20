'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { answer, finish, nextQuestion, startRound } from '@/app/trivia/actions'
import { NO_ANSWER } from '@/lib/domain/trivia'
import { QuestionView } from './QuestionView'
import { ResultScreen } from './ResultScreen'
import { StartScreen } from './StartScreen'

const OFFLINE = 'Se cortó la conexión. Probá de nuevo.'
/** Errores que dejan la ronda inutilizable: hay que empezar otra */
const DEAD = new Set(['expired', 'finished', 'not-found'])

/**
 * La partida (Client Component): pantalla de inicio → preguntas → resultado.
 * No sabe las respuestas: cada paso es una Server Action que corrige en el
 * servidor. Acá solo vive lo que se muestra.
 */
export function TriviaGame({ initialSeed = '', initialCategory = 'mixta', counts, embedded = false }) {
  const router = useRouter()
  const rootRef = useRef(null)
  const [phase, setPhase] = useState('inicio')
  const [category, setCategory] = useState(initialCategory)
  const [seed, setSeed] = useState(initialSeed)
  const [round, setRound] = useState(null)
  const [question, setQuestion] = useState(null)
  const [chosen, setChosen] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [final, setFinal] = useState(null)
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(false)
  const [busy, startTransition] = useTransition()
  const answering = useRef(false)

  const run = (work) =>
    startTransition(async () => {
      try {
        await work()
      } catch {
        setError(OFFLINE)
        // si falló una respuesta, se puede volver a elegir (el reloj queda quieto)
        if (answering.current) {
          answering.current = false
          setChosen(null)
          setPaused(true)
        }
      }
    })

  const deadRound = (res) => {
    if (!DEAD.has(res.code)) return false
    setPhase('inicio')
    setRound(null)
    setError(res.error)
    return true
  }

  const start = ({ category: cat, nickname }) =>
    run(async () => {
      setError('')
      const res = await startRound({ category: cat, seed, nickname })
      if (res.error) return setError(res.error)
      answering.current = false
      setRound(res)
      setQuestion(res.question)
      setChosen(null)
      setFeedback(null)
      setPaused(false)
      setScore(0)
      setStreak(0)
      setFinal(null)
      setPhase('jugando')
      if (embedded) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else window.scrollTo({ top: 0 })
    })

  const choose = (choice) => {
    if (!round || !question || feedback || answering.current) return
    answering.current = true
    setChosen(choice)
    run(async () => {
      setError('')
      const res = await answer(round.roundId, question.index, choice)
      if (res.error) {
        if (deadRound(res)) return
        if (res.code === 'duplicate') {
          // la respuesta llegó pero se perdió la vuelta: se sigue sin veredicto
          return setFeedback({ index: question.index, lost: true, last: question.index === question.total - 1 })
        }
        answering.current = false
        setChosen(null)
        setError(res.error)
        // re-sincroniza el reloj con el servidor; si tampoco se puede, queda quieto
        const again = await nextQuestion(round.roundId, question.index)
        if (again.ok) setQuestion(again.question)
        else setPaused(true)
        return
      }
      setPaused(false)
      setFeedback(res.feedback)
      setScore(res.feedback.score)
      setStreak(res.feedback.streak)
    })
  }

  const next = () =>
    run(async () => {
      setError('')
      if (feedback?.last) {
        const res = await finish(round.roundId)
        if (res.error) return deadRound(res) || setError(res.error)
        setFinal(res)
        setPhase('final')
        if (embedded) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        else window.scrollTo({ top: 0 })
        return
      }
      const res = await nextQuestion(round.roundId, question.index + 1)
      if (res.error) return deadRound(res) || setError(res.error)
      answering.current = false
      setQuestion(res.question)
      setChosen(null)
      setFeedback(null)
      setPaused(false)
    })

  const playAgain = () => {
    // una ronda compartida se juega una vez: la próxima ya es nueva y suma al ranking
    setSeed('')
    if (initialSeed) router.replace(`/trivia?categoria=${category}`, { scroll: false })
    setPhase('inicio')
    setRound(null)
    setFinal(null)
    setError('')
  }

  if (phase === 'jugando' && round && question)
    return (
      <div ref={rootRef}>
        <QuestionView
          roundId={round.roundId}
          question={question}
          feedback={feedback}
          chosen={chosen}
          busy={busy}
          score={score}
          streak={streak}
          error={error}
          paused={paused}
          onChoose={choose}
          onTimeout={() => choose(NO_ANSWER)}
          onNext={next}
        />
      </div>
    )

  if (phase === 'final' && final)
    return (
      <div ref={rootRef}>
        <ResultScreen result={final.result} saved={final.saved} displayName={final.displayName} onPlayAgain={playAgain} />
      </div>
    )

  return (
    <div ref={rootRef}>
      <StartScreen
        category={category}
        onCategory={setCategory}
        seed={seed}
        onClearSeed={() => {
          setSeed('')
          if (!embedded) router.replace(`/trivia?categoria=${category}`, { scroll: false })
        }}
        counts={counts}
        busy={busy}
        error={error}
        onStart={start}
      />
    </div>
  )
}
