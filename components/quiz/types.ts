import type { QuizQuestion } from "@/lib/quiz"

/** The draft answer a question reports upward before the user commits it. */
export interface QuizDraft {
  correct: boolean
}

export interface QuestionProps {
  question: QuizQuestion
  /** True once the user has committed (checked) their answer for this question. */
  answered: boolean
  /**
   * Called whenever the user's in-progress answer changes. Pass a draft when a
   * checkable answer exists, or null to disable the Check button.
   */
  onDraft: (draft: QuizDraft | null) => void
}
