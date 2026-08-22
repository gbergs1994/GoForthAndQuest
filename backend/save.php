<?php
header("Content-Type: application/json");
require "db.php";

$pdo->exec("
CREATE TABLE IF NOT EXISTS save_slots (
    slot_id INTEGER PRIMARY KEY,
    player_name TEXT NOT NULL,
    game_state TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
");

// Read JSON input
$raw = file_get_contents("php://input");
$payload = json_decode($raw, true);

// Validate input
if (!is_array($payload) || empty($payload["player"]["name"])) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Invalid payload"]);
    exit;
}

$playerName = trim($payload["player"]["name"]);
$gameState  = json_encode($payload);

// PDO prepared statement for saving a game state
$stmt = $pdo->prepare("
    INSERT INTO save_slots (slot_id, player_name, game_state)
    VALUES (:slot_id, :player_name, :game_state)
    ON CONFLICT(slot_id) DO UPDATE SET
        player_name = excluded.player_name,
        game_state = excluded.game_state,
        updated_at = CURRENT_TIMESTAMP
");

try {
    $stmt->execute([
        ":slot_id" => 1,
        ":player_name" => $playerName,
        ":game_state" => $gameState
    ]);

    echo json_encode(["ok" => true]);
} catch (PDOException $e) {
    http_response_code(500);
    error_log($e->getMessage());
    echo json_encode(["ok" => false, "error" => "Save failed"]);
}
?>