import questions from '../question.json';

export interface Question {
    university: string;
    program: string;
    question_text: string;
    category: string;
    difficulty_level: number;
    source: string;
}

export class QuestionBank {
    private questions: Question[];
    private usedQuestions: Set<string> = new Set();

    constructor(
        private targetUniversity: string,
        private targetProgram: string
    ) {
        this.questions = this.loadRelevantQuestions();
    }

    /**
     * Load questions relevant to the target institution and program
     */
    private loadRelevantQuestions(): Question[] {
        const relevant: Question[] = [];

        for (const q of questions) {
            const isRelevant =
                // Exact university match
                (q.university === this.targetUniversity) ||
                // General questions for all universities
                (q.university === 'General' && (
                    q.program === 'All' ||
                    q.program === this.targetProgram ||
                    this.isProgramMatch(q.program, this.targetProgram)
                ));

            if (isRelevant) {
                relevant.push(q as Question);
            }
        }

        // Sort by priority: school-specific first, then by difficulty
        relevant.sort((a, b) => {
            if (a.university !== 'General' && b.university === 'General') return -1;
            if (a.university === 'General' && b.university !== 'General') return 1;
            return a.difficulty_level - b.difficulty_level;
        });

        return relevant;
    }

    /**
     * Check if program matches (e.g., "Computer Science" matches "STEM")
     */
    private isProgramMatch(questionProgram: string, targetProgram: string): boolean {
        const stemPrograms = ['Computer Science', 'Engineering', 'Mathematics', 'Physics', 'Chemistry'];

        if (questionProgram === 'STEM' && stemPrograms.includes(targetProgram)) {
            return true;
        }

        return questionProgram.toLowerCase().includes(targetProgram.toLowerCase()) ||
               targetProgram.toLowerCase().includes(questionProgram.toLowerCase());
    }

    /**
     * Get next question based on difficulty progression
     */
    getNextQuestion(currentDifficulty: number = 1): Question | null {
        const available = this.questions.filter(q =>
            !this.usedQuestions.has(q.question_text) &&
            q.difficulty_level <= currentDifficulty + 1
        );

        if (available.length === 0) return null;

        // Select question close to current difficulty
        const targetDifficulty = Math.min(currentDifficulty + 1, 5);
        const closest = available.find(q => q.difficulty_level === targetDifficulty) || available[0];

        this.usedQuestions.add(closest.question_text);
        return closest;
    }

    /**
     * Get opening question
     */
    getOpeningQuestion(): Question {
        const openingQuestions = this.questions.filter(q =>
            q.difficulty_level === 1 &&
            (q.category === 'personal' || q.category === 'motivation')
        );

        const question = openingQuestions[Math.floor(Math.random() * openingQuestions.length)];
        this.usedQuestions.add(question.question_text);
        return question;
    }

    /**
     * Get follow-up context for AI
     */
    getQuestionContext(): string {
        const remainingQuestions = this.questions
            .filter(q => !this.usedQuestions.has(q.question_text))
            .slice(0, 5)
            .map(q => `- ${q.question_text} (${q.category})`)
            .join('\n');

        return `Target School: ${this.targetUniversity}
Target Program: ${this.targetProgram}

Available interview questions to draw from:
${remainingQuestions}

When asking follow-ups, stay relevant to the school and program context.`;
    }

    /**
     * Get all questions for a category
     */
    getQuestionsByCategory(category: string): Question[] {
        return this.questions.filter(q =>
            q.category === category &&
            !this.usedQuestions.has(q.question_text)
        );
    }
}
