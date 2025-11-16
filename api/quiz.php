<?php

header('Content-Type: application/json; charset=utf-8');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");

// jednoduchá konfigurace
$QUIZ_DIR = __DIR__ . '/../quizzes';

function load_quiz($id, $quiz_dir) {
    $safeId = basename($id);
    $file = $quiz_dir . '/' . $safeId . '.json';
    if (!file_exists($file)) {
        return null;
    }
    $json = file_get_contents($file);
    return json_decode($json, true);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

if ($method === 'GET' && $action === 'load') {
    $id = $_GET['id'] ?? '';
    $quiz = load_quiz($id, $QUIZ_DIR);
    if (!$quiz) {
        http_response_code(404);
        echo json_encode(['error' => 'Quiz not found']);
        exit;
    }

    $safeQuiz = [
        'id' => $quiz['id'],
        'questions' => []
    ];

    foreach ($quiz['questions'] as $q) {
        $safeQuiz['questions'][] = [
            'text' => $q['text'],
            'options' => $q['options']
        ];
    }

    echo json_encode($safeQuiz);
    exit;
}

if ($method === 'POST' && $action === 'grade') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $id = $data['id'] ?? '';
    $answers = $data['answers'] ?? [];

    $quiz = load_quiz($id, $QUIZ_DIR);
    if (!$quiz) {
        http_response_code(404);
        echo json_encode(['error' => 'Quiz not found']);
        exit;
    }

    $score = 0;
    $max = count($quiz['questions']);

    $wrong_indices = [];

    foreach ($quiz['questions'] as $i => $q) {
        $userAnswer = $answers[$i] ?? null;
        if ($userAnswer !== null && intval($userAnswer) === intval($q['correctIndex'])) {
            $score++;
        } else {
            $wrong_indices[] = $i;
        }
    }

    echo json_encode([
        'score' => $score,
        'max' => $max,
        'wrong' => $wrong_indices
    ]);
    exit;
}

echo json_encode(['error' => 'Bad request']);