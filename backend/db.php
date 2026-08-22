<?php
// SQLite setup: creates a local DB file automatically so no DB commands are required.
$dataDir = __DIR__ . "/data";
if (!is_dir($dataDir) && !mkdir($dataDir, 0775, true) && !is_dir($dataDir)) {
    http_response_code(500);
    die(json_encode(["ok" => false, "error" => "Failed to create data directory"]));
}

$dbPath = $dataDir . "/quest_game.sqlite";
$dsn = "sqlite:" . $dbPath;

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, null, null, $options);
} catch (PDOException $e) {
    http_response_code(500);
    error_log($e->getMessage());
    die(json_encode(["ok" => false, "error" => "Database connection failed"]));
}
?>