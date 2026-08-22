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
// PDO prepared statement for loading a save
$stmt = $pdo->prepare("
    SELECT game_state 
    FROM save_slots 
    WHERE slot_id = :slot_id 
    LIMIT 1
");

$stmt->execute([":slot_id" => 1]);
$row = $stmt->fetch();

if (!$row) {
    echo json_encode(null);
    exit;
}

echo $row["game_state"];
?>