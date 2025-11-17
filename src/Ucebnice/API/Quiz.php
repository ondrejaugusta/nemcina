<?php

namespace Ucebnice\API;

class Quiz {
    private string $quiz_directory;
    private string $quiz_id;

    public function __construct(string $quiz_directory) {
        $this->quiz_directory = $quiz_directory;
    }
    
    public function serve(): void {
        $quiz = $this->getQuiz();
        if (!$quiz) {
            $this->respondAndExit(
                $this->error("Quiz not found!"),
                404
            );
        }

        $this->respondAndExit($this->stripRightAnswers($quiz));
    }
    public function grade(array $user_answers): void {
        $quiz = $this->getQuiz();
        if (!$quiz) {
            $this->respondAndExit(
                $this->error("Quiz not found!"),
                404
            );
        }

        $score = 0;
        $max = count($quiz['questions']);
        $wrong_indices = [];

        foreach ($quiz['questions'] as $idx => $question) {
            $user_answer = $user_answers[$idx] ?? null;
            $correct = (int) ($question['correctIndex'] ?? -1);
            
            if (
                $user_answer !== null && (int) $user_answer === $correct) {
                $score++;
            } else {
                $wrong_indices[] = $idx;
            }
        }

        $this->respondAndExit(
            [
                'score' => $score,
                'max'   => $max,
                'wrong' => $wrong_indices
            ]
        );
    }


    public function getMethod(): string {
        return $_SERVER['REQUEST_METHOD'];
    }
    public function getAction(): string | null {
        return $_GET['action'] ?? null;
    }

    public function setQuizID(string $id): void {
        $this->quiz_id = $id;
    }

    public function throwBadRequest(): void {
        $this->respondAndExit($this->error("Malformed request"), 405);
    }
    public function respondToPreflight(): void {
        $this->sendHeaders();
        http_response_code(204);
        exit;
    }

    private function getQuiz(): array | null {
        $safe_id = basename($this->quiz_id);
        $file = $this->quiz_directory . '/' . $safe_id . '.json';
        
        if (!file_exists($file)) return null;

        $contents = file_get_contents($file);
        $data = json_decode($contents, true);

        if (!is_array($data) || !isset($data['questions']) || !is_array($data['questions'])) {
            $this->respondAndExit(
                $this->error("Invalid quiz format!"),
                400
            );
        }
        return $data;
    }
    private function stripRightAnswers(array $quiz): array {
        $safe_quiz = [
            'id' => $quiz['id'],
            'questions' => []
        ];

        foreach ($quiz['questions'] as $question) {
            $safe_quiz['questions'][] = [
                'text' => $question['text'],
                'options' => $question['options']
            ];
        }

        return $safe_quiz;
    }

    private function sendHeaders(): void {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
    }
    private function error(string $msg): array {
        return ['error' => $msg];
    }
    private function respondAndExit(array $response, int $http_response_code = 200): void {
        $this->sendHeaders();
        http_response_code($http_response_code);
        echo json_encode($response);
        exit;
    }
}