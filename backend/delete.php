<?php
header("Content-Type: application/json");
require "db.php";

$stmt = $pdo->prepare("DELETE FROM save_slots WHERE slot_id = :slot_id");
// PDO prepared statement for deleting a save slot
try {
    $stmt->execute([":slot_id" => 1]);
    echo json_encode(["ok" => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Delete failed"]);
}
?>