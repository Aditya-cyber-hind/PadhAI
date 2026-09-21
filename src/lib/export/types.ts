export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  category: string;
  difficulty: number;
  known: boolean;
}