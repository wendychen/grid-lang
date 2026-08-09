"use client"

import { useMemo, useRef, useState } from "react"
import { X, Heart, Flame, Zap, Trophy, Target, RotateCcw, Check, ArrowRight, Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  buildQuizSession,
  comboMultiplier,
  xpForAnswer,
  START_HEARTS,
  type QuizQuestion,
} from "@/lib/quiz"
import { getQuizStats, recordQuizResultAsync } from "@/lib/quiz-stats"
import { practiceSentence } from "@/lib/srs"
import { McQuestion } from "@/components/quiz/mc-question"
import { ListenQuestion } from "@/components/quiz/listen-question"
import { WordBankQuestion } from "@/components/quiz/word-bank-question"
import { TypeQuestion } from "@/components/quiz/type-question"
import type { QuizDraft } from "@/components/quiz/types"

type Phase = "idle" | "running" | "results"

const QUESTIONS_PER_SESSION = 10

function ttsAvailable(): boolean {
  return typeof window !== "undefined" && !!window.speechSynthesis
}

export function QuizView() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [hearts, setHearts] = useState(START_HEARTS)
  const [xp, setXp] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const [answered, setAnswered] = useState(false)
  const [lastCorrect, setLastCorrect] = useState(false)
  const [draft, setDraft] = useState<QuizDraft | null>(null)
  const [xpBurst, setXpBurst] = useState<{ value: number; key: number } | null>(null)
  const [outOfHearts, setOutOfHearts] = useState(false)

  const stats = useMemo(() => getQuizStats(), [phase])
  const burstKey = useRef(0)

  function startSession() {
    const session = buildQuizSession({ count: QUESTIONS_PER_SESSION, ttsAvailable: ttsAvailable() })
    setQuestions(session)
    setIndex(0)
    setHearts(START_HEARTS)
    setXp(0)
    setCombo(0)
    setBestCombo(0)
    setCorrectCount(0)
    setAnswered(false)
    setLastCorrect(false)
    setDraft(null)
    setXpBurst(null)
    setOutOfHearts(false)
    setPhase("running")
  }

  const current = questions[index]

  function handleCheck() {
    if (!current || answered || !draft) return
    const correct = draft.correct
    setAnswered(true)
    setLastCorrect(correct)

    if (correct) {
      const gained = xpForAnswer(combo)
      const newCombo = combo + 1
      setXp((v) => v + gained)
      setCombo(newCombo)
      setBestCombo((v) => Math.max(v, newCombo))
      setCorrectCount((v) => v + 1)
      burstKey.current += 1
      setXpBurst({ value: gained, key: burstKey.current })
      // Feed the correct answer into the existing SRS + daily activity system.
      try {
        practiceSentence(current.sentence.id)
      } catch {
        // Non-fatal: quiz continues even if SRS write fails.
      }
    } else {
      setCombo(0)
      setHearts((h) => Math.max(0, h - 1))
    }
  }

  async function finish() {
    await recordQuizResultAsync({
      xp,
      correct: correctCount,
      total: answeredTotal(),
      bestCombo,
    })
    setPhase("results")
  }

  // How many questions were actually answered (fewer than total if hearts ran out).
  function answeredTotal(): number {
    return outOfHearts ? index + 1 : questions.length
  }

  function handleContinue() {
    const ranOut = !lastCorrect && hearts <= 0
    if (ranOut) {
      setOutOfHearts(true)
      void finish()
      return
    }
    const next = index + 1
    if (next >= questions.length) {
      void finish()
      return
    }
    setIndex(next)
    setAnswered(false)
    setDraft(null)
    setXpBurst(null)
  }

  function quit() {
    setPhase("idle")
  }

  // ===== IDLE =====
  if (phase === "idle") {
    return <QuizIntro stats={stats} onStart={startSession} />
  }

  // ===== RESULTS =====
  if (phase === "results") {
    const total = answeredTotal()
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0
    return (
      <QuizResults
        xp={xp}
        accuracy={accuracy}
        bestCombo={bestCombo}
        heartsLeft={hearts}
        correct={correctCount}
        total={total}
        outOfHearts={outOfHearts}
        onAgain={startSession}
        onBack={quit}
      />
    )
  }

  // ===== RUNNING =====
  if (!current) return null
  const multiplier = comboMultiplier(combo + 1)

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col">
      {/* Top bar: quit, progress, hearts */}
      <div className="flex items-center gap-3 pb-4">
        <button
          type="button"
          onClick={quit}
          aria-label="Quit quiz"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuenow={index} aria-valuemax={questions.length}>
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2.5 flex-1 rounded-full transition-colors",
                i < index && "bg-primary",
                i === index && "bg-primary/50",
                i > index && "bg-secondary",
              )}
            />
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1" aria-label={`${hearts} hearts remaining`}>
          <Heart className="h-5 w-5 fill-quiz-heart text-quiz-heart" />
          <span className="text-sm font-bold text-foreground tabular-nums">{hearts}</span>
        </div>
      </div>

      {/* XP + combo row */}
      <div className="relative flex items-center justify-between pb-6">
        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
          <Zap className="h-4 w-4 text-quiz-xp" />
          <span className="text-sm font-bold text-foreground tabular-nums">{xp} XP</span>
          {xpBurst && (
            <span
              key={xpBurst.key}
              className="animate-quiz-xp-float pointer-events-none absolute left-8 top-0 text-sm font-extrabold text-quiz-xp"
            >
              +{xpBurst.value}
            </span>
          )}
        </div>

        {combo >= 2 && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1",
              multiplier >= 2 ? "bg-[hsl(var(--accent-orange)/0.18)]" : "bg-[hsl(var(--quiz-xp)/0.16)]",
            )}
          >
            <Flame className={cn("h-4 w-4 animate-quiz-flame", multiplier >= 2 ? "text-accent-orange" : "text-quiz-xp")} />
            <span className="text-sm font-bold text-foreground">
              {combo} combo{multiplier > 1 && ` · x${multiplier}`}
            </span>
          </div>
        )}
      </div>

      {/* Active question */}
      <div className="flex-1">
        <QuestionRenderer key={current.id} question={current} answered={answered} onDraft={setDraft} />
      </div>

      {/* Feedback / action footer */}
      <div className="sticky bottom-0 -mx-4 mt-6 px-4 pb-4 lg:-mx-8 lg:px-8">
        {answered ? (
          <div
            className={cn(
              "animate-quiz-slide-up rounded-2xl border-2 p-4",
              lastCorrect
                ? "border-[hsl(var(--quiz-correct))] bg-[hsl(var(--quiz-correct)/0.12)]"
                : "border-[hsl(var(--quiz-wrong))] bg-[hsl(var(--quiz-wrong)/0.12)]",
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  lastCorrect ? "bg-[hsl(var(--quiz-correct))]" : "bg-[hsl(var(--quiz-wrong))]",
                )}
              >
                {lastCorrect ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <X className="h-5 w-5 text-white" />
                )}
              </span>
              <div className="flex flex-col">
                <span className={cn("text-sm font-bold", lastCorrect ? "text-quiz-correct" : "text-quiz-wrong")}>
                  {lastCorrect ? "Nice!" : "Not quite"}
                </span>
                {!lastCorrect && (
                  <span className="text-xs text-muted-foreground">
                    Answer: <span className="font-semibold text-foreground">{current.answer}</span>
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleContinue}
              className={cn(
                "quiz-3d flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-bold text-white",
                lastCorrect
                  ? "border-[hsl(var(--quiz-correct)/0.5)] bg-[hsl(var(--quiz-correct))]"
                  : "border-[hsl(var(--quiz-wrong)/0.5)] bg-[hsl(var(--quiz-wrong))]",
              )}
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCheck}
            disabled={!draft}
            className={cn(
              "quiz-3d flex w-full items-center justify-center rounded-2xl px-4 py-3.5 text-base font-bold transition-colors",
              draft
                ? "border-primary/50 bg-primary text-primary-foreground"
                : "cursor-not-allowed border-transparent bg-secondary text-muted-foreground",
            )}
          >
            Check
          </button>
        )}
      </div>
    </div>
  )
}

function QuestionRenderer({
  question,
  answered,
  onDraft,
}: {
  question: QuizQuestion
  answered: boolean
  onDraft: (d: QuizDraft | null) => void
}) {
  switch (question.type) {
    case "mc-de-en":
    case "mc-en-de":
      return <McQuestion question={question} answered={answered} onDraft={onDraft} />
    case "listen":
      return <ListenQuestion question={question} answered={answered} onDraft={onDraft} />
    case "word-bank":
      return <WordBankQuestion question={question} answered={answered} onDraft={onDraft} />
    case "type":
      return <TypeQuestion question={question} answered={answered} onDraft={onDraft} />
    default:
      return null
  }
}

// ===== Idle / intro screen =====

function QuizIntro({
  stats,
  onStart,
}: {
  stats: ReturnType<typeof getQuizStats>
  onStart: () => void
}) {
  const lifetimeAccuracy =
    stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 py-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-primary-foreground quiz-3d border-primary/40 shadow-lg">
          <Dumbbell className="h-10 w-10" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground text-balance">
            Ready to train?
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">
            {QUESTIONS_PER_SESSION} mixed questions from your smart review queue. Keep your hearts,
            build a combo, and earn XP.
          </p>
        </div>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        <StatCard icon={<Zap className="h-4 w-4 text-quiz-xp" />} label="Total XP" value={stats.totalXp} />
        <StatCard icon={<Flame className="h-4 w-4 text-accent-orange" />} label="Best combo" value={stats.bestCombo} />
        <StatCard
          icon={<Target className="h-4 w-4 text-quiz-correct" />}
          label="Accuracy"
          value={`${lifetimeAccuracy}%`}
        />
      </div>

      <button
        type="button"
        onClick={onStart}
        className="quiz-3d flex w-full items-center justify-center gap-2 rounded-2xl border-primary/50 bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground shadow-md"
      >
        Start Quiz
      </button>

      {stats.quizzesCompleted > 0 && (
        <p className="text-xs text-muted-foreground">
          {stats.quizzesCompleted} {stats.quizzesCompleted === 1 ? "quiz" : "quizzes"} completed
        </p>
      )}
    </div>
  )
}

// ===== Results screen =====

function QuizResults({
  xp,
  accuracy,
  bestCombo,
  heartsLeft,
  correct,
  total,
  outOfHearts,
  onAgain,
  onBack,
}: {
  xp: number
  accuracy: number
  bestCombo: number
  heartsLeft: number
  correct: number
  total: number
  outOfHearts: boolean
  onAgain: () => void
  onBack: () => void
}) {
  const confetti = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.2 + Math.random() * 1.2,
        hue: ["var(--primary)", "var(--quiz-xp)", "var(--accent-orange)", "var(--quiz-correct)"][i % 4],
        rotate: Math.random() * 360,
      })),
    [],
  )
  const celebrate = !outOfHearts && accuracy >= 60

  return (
    <div className="relative mx-auto flex max-w-md flex-col items-center gap-8 py-8 text-center">
      {celebrate && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {confetti.map((c, i) => (
            <span
              key={i}
              className="animate-quiz-confetti absolute top-0 block h-2.5 w-2.5 rounded-[2px]"
              style={{
                left: `${c.left}%`,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                backgroundColor: `hsl(${c.hue})`,
                transform: `rotate(${c.rotate}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="animate-quiz-pop flex flex-col items-center gap-3">
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-lg",
            outOfHearts ? "bg-[hsl(var(--quiz-wrong))]" : "bg-primary",
          )}
        >
          {outOfHearts ? <Heart className="h-10 w-10 fill-white" /> : <Trophy className="h-10 w-10" />}
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          {outOfHearts ? "Out of hearts!" : "Quiz complete!"}
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          {outOfHearts
            ? "You ran out of hearts. Review and try again."
            : "Great work. Your progress has been saved."}
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <BigStat icon={<Zap className="h-5 w-5 text-quiz-xp" />} label="XP earned" value={`+${xp}`} />
        <BigStat icon={<Target className="h-5 w-5 text-quiz-correct" />} label="Accuracy" value={`${accuracy}%`} />
        <BigStat icon={<Flame className="h-5 w-5 text-accent-orange" />} label="Best combo" value={bestCombo} />
        <BigStat
          icon={<Check className="h-5 w-5 text-primary" />}
          label="Correct"
          value={`${correct}/${total}`}
        />
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="quiz-3d flex w-full items-center justify-center gap-2 rounded-2xl border-primary/50 bg-primary px-6 py-4 text-base font-extrabold text-primary-foreground shadow-md"
        >
          <RotateCcw className="h-5 w-5" />
          Practice again
        </button>
        <button
          type="button"
          onClick={onBack}
          className="quiz-3d flex w-full items-center justify-center rounded-2xl border-border bg-card px-6 py-3 text-base font-bold text-card-foreground"
        >
          Back
        </button>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-2 py-3">
      {icon}
      <span className="text-lg font-extrabold tabular-nums text-foreground">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  )
}

function BigStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-5">
      {icon}
      <span className="text-2xl font-extrabold tabular-nums text-foreground">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  )
}
