<?php
require 'config.php';

$request_method = $_SERVER['REQUEST_METHOD'];
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri_segments = explode('/', $request_uri);
$endpoint = end($uri_segments);

switch ($endpoint) {
    case 'vehicles':
        handleVehicles($request_method);
        break;
    case 'reservations':
        handleReservations($request_method);
        break;
    case 'drivers':
        handleDrivers($request_method);
        break;
    default:
        http_response_code(404);
        echo json_encode(["error" => "Endpoint not found"]);
        break;
}

function handleVehicles($method) {
    global $conn;
    
    switch ($method) {
        case 'GET':
            $stmt = $conn->query("SELECT * FROM vehicles");
            $vehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($vehicles);
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $conn->prepare("INSERT INTO vehicles (make, model, plate) VALUES (?, ?, ?)");
            $stmt->execute([$data['make'], $data['model'], $data['plate']]);
            echo json_encode(["message" => "Vehicle added successfully"]);
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['id']) || !isset($data['make']) || !isset($data['model']) || !isset($data['plate'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                break;
            }
            
            // Check if vehicle exists
            $checkStmt = $conn->prepare("SELECT id FROM vehicles WHERE id = ?");
            $checkStmt->execute([$data['id']]);
            
            if ($checkStmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(["error" => "Vehicle not found"]);
                break;
            }
            
            // Check if new plate number already exists for a different vehicle
            $plateCheckStmt = $conn->prepare("SELECT id FROM vehicles WHERE plate = ? AND id != ?");
            $plateCheckStmt->execute([$data['plate'], $data['id']]);
            
            if ($plateCheckStmt->rowCount() > 0) {
                http_response_code(400);
                echo json_encode(["error" => "License plate already exists for another vehicle"]);
                break;
            }
            
            $stmt = $conn->prepare("UPDATE vehicles SET make = ?, model = ?, plate = ? WHERE id = ?");
            $stmt->execute([$data['make'], $data['model'], $data['plate'], $data['id']]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Vehicle updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to update vehicle"]);
            }
            break;
            
        case 'DELETE':
            $id = $_GET['id'];
            // Check for active reservations first (exclude cancelled ones)
            $checkStmt = $conn->prepare("SELECT COUNT(*) FROM reservations WHERE vehicle_id = ? AND end_time IS NULL AND status != 'cancelled'");
            $checkStmt->execute([$id]);
            $activeReservations = $checkStmt->fetchColumn();
            
            if ($activeReservations > 0) {
                http_response_code(400);
                echo json_encode(["error" => "Cannot delete vehicle with active reservations"]);
                break;
            }
            
            $stmt = $conn->prepare("DELETE FROM vehicles WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["message" => "Vehicle deleted successfully"]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
    }
}

function handleReservations($method) {
    global $conn;
    
    switch ($method) {
        case 'GET':
            $stmt = $conn->query("
    SELECT r.*, v.make, v.model, v.plate, d.name as driver_name 
    FROM reservations r
    LEFT JOIN vehicles v ON r.vehicle_id = v.id
    LEFT JOIN drivers d ON r.assigned_driver_id = d.id
    ORDER BY r.date, r.start_time
");
            $reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($reservations);
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate vehicle availability - exclude cancelled and rejected reservations
            $checkStmt = $conn->prepare("
                SELECT COUNT(*) FROM reservations 
                WHERE vehicle_id = ? AND date = ? AND 
                status != 'cancelled' AND confirmation_status != 'rejected' AND
                ((start_time <= ? AND (end_time IS NULL OR end_time >= ?)) OR 
                (start_time <= ? AND end_time >= ?))
            ");
            $checkStmt->execute([
                $data['vehicleId'],
                $data['date'],
                $data['startTime'],
                $data['startTime'],
                $data['startTime'],
                $data['startTime']
            ]);
            
            if ($checkStmt->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(["error" => "Vehicle is already reserved for this time slot"]);
                break;
            }
            
            $stmt = $conn->prepare("
    INSERT INTO reservations 
    (vehicle_id, user_name, date, start_time, purpose, assigned_driver_id, confirmation_status, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
");
            $stmt->execute([
                $data['vehicleId'],
                $data['userName'],
                $data['date'],
                $data['startTime'],
                $data['purpose'],
                $data['assignedDriverId']
            ]);
            echo json_encode(["message" => "Reservation created successfully and is pending admin approval"]);
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['action']) || !isset($data['id'])) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                break;
            }
            
            if ($data['action'] === 'return') {
                // Return vehicle - only if approved
                $stmt = $conn->prepare("
                    UPDATE reservations 
                    SET end_time = ?, status = 'completed' 
                    WHERE id = ? AND end_time IS NULL AND status != 'cancelled' AND confirmation_status = 'approved'
                ");
                $stmt->execute([$data['endTime'], $data['id']]);
                
                if ($stmt->rowCount() > 0) {
                    echo json_encode(["message" => "Vehicle returned successfully"]);
                } else {
                    http_response_code(400);
                    echo json_encode(["error" => "Vehicle already returned, reservation not found, or reservation not approved"]);
                }
            } 
            elseif ($data['action'] === 'cancel') {
                // First check if reservation exists and can be cancelled
                $checkStmt = $conn->prepare("
                    SELECT status, end_time, date, start_time, confirmation_status 
                    FROM reservations 
                    WHERE id = ?
                ");
                $checkStmt->execute([$data['id']]);
                $reservation = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$reservation) {
                    http_response_code(404);
                    echo json_encode(["error" => "Reservation not found"]);
                    break;
                }
                
                // Check if reservation can be cancelled
                if ($reservation['status'] === 'cancelled') {
                    http_response_code(400);
                    echo json_encode(["error" => "Reservation is already cancelled"]);
                    break;
                }
                
                if ($reservation['status'] === 'completed' || $reservation['end_time'] !== null) {
                    http_response_code(400);
                    echo json_encode(["error" => "Cannot cancel completed reservation"]);
                    break;
                }
                
                // Cancel reservation with optional reason
                $cancellationReason = isset($data['cancellationReason']) ? $data['cancellationReason'] : null;
                $stmt = $conn->prepare("
                    UPDATE reservations 
                    SET status = 'cancelled', 
                        cancelled_date = NOW(),
                        cancellation_reason = ?
                    WHERE id = ?
                ");
                $stmt->execute([$cancellationReason, $data['id']]);
                
                if ($stmt->rowCount() > 0) {
                    echo json_encode(["message" => "Reservation cancelled successfully"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["error" => "Failed to cancel reservation"]);
                }
            }
            elseif ($data['action'] === 'approve') {
                // Approve reservation
                $stmt = $conn->prepare("
                    UPDATE reservations 
                    SET confirmation_status = 'approved', 
                        confirmation_date = NOW(),
                        admin_notes = ?
                    WHERE id = ? AND confirmation_status = 'pending'
                ");
                $adminNotes = isset($data['adminNotes']) ? $data['adminNotes'] : null;
                $stmt->execute([$adminNotes, $data['id']]);
                
                if ($stmt->rowCount() > 0) {
                    echo json_encode(["message" => "Reservation approved successfully"]);
                } else {
                    http_response_code(400);
                    echo json_encode(["error" => "Reservation not found or already processed"]);
                }
            }
            elseif ($data['action'] === 'reject') {
                // Reject reservation
                $stmt = $conn->prepare("
                    UPDATE reservations 
                    SET confirmation_status = 'rejected', 
                        confirmation_date = NOW(),
                        admin_notes = ?
                    WHERE id = ? AND confirmation_status = 'pending'
                ");
                $adminNotes = isset($data['adminNotes']) ? $data['adminNotes'] : null;
                $stmt->execute([$adminNotes, $data['id']]);
                
                if ($stmt->rowCount() > 0) {
                    echo json_encode(["message" => "Reservation rejected successfully"]);
                } else {
                    http_response_code(400);
                    echo json_encode(["error" => "Reservation not found or already processed"]);
                }
            }
            else {
                http_response_code(400);
                echo json_encode(["error" => "Invalid action specified"]);
            }
            break;
            
        case 'DELETE':
            $id = $_GET['id'];
            $stmt = $conn->prepare("DELETE FROM reservations WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Reservation deleted successfully"]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Reservation not found"]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
    }
}

function handleDrivers($method) {
    global $conn;
    
    switch ($method) {
        case 'GET':
            $stmt = $conn->query("SELECT * FROM drivers ORDER BY id");
            $drivers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($drivers);
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate required fields
            if (!isset($data['name']) || empty(trim($data['name']))) {
                http_response_code(400);
                echo json_encode(["error" => "Driver name is required"]);
                break;
            }
            
            // Check if driver with the same name already exists
            $checkStmt = $conn->prepare("SELECT id FROM drivers WHERE name = ?");
            $checkStmt->execute([trim($data['name'])]);
            
            if ($checkStmt->rowCount() > 0) {
                http_response_code(400);
                echo json_encode(["error" => "Driver with this name already exists"]);
                break;
            }
            
            // Generate a unique 5-digit ID
            $uniqueIdFound = false;
            $maxAttempts = 100;
            $attempts = 0;
            
            while (!$uniqueIdFound && $attempts < $maxAttempts) {
                $newId = mt_rand(10000, 99999); // Generate a 5-digit number
                $idCheckStmt = $conn->prepare("SELECT id FROM drivers WHERE id = ?");
                $idCheckStmt->execute([$newId]);
                
                if ($idCheckStmt->rowCount() === 0) {
                    $uniqueIdFound = true;
                }
                $attempts++;
            }
            
            if (!$uniqueIdFound) {
                http_response_code(500);
                echo json_encode(["error" => "Failed to generate unique ID"]);
                break;
            }
            
            $stmt = $conn->prepare("INSERT INTO drivers (id, name) VALUES (?, ?)");
            $stmt->execute([$newId, trim($data['name'])]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    "message" => "Driver added successfully",
                    "id" => $newId
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to add driver"]);
            }
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['id']) || !isset($data['name']) || empty(trim($data['name']))) {
                http_response_code(400);
                echo json_encode(["error" => "Missing required fields"]);
                break;
            }
            
            // Check if driver exists
            $checkStmt = $conn->prepare("SELECT id FROM drivers WHERE id = ?");
            $checkStmt->execute([$data['id']]);
            
            if ($checkStmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(["error" => "Driver not found"]);
                break;
            }
            
            // Check if another driver already has this name
            $nameCheckStmt = $conn->prepare("SELECT id FROM drivers WHERE name = ? AND id != ?");
            $nameCheckStmt->execute([trim($data['name']), $data['id']]);
            
            if ($nameCheckStmt->rowCount() > 0) {
                http_response_code(400);
                echo json_encode(["error" => "Another driver already has this name"]);
                break;
            }
            
            $stmt = $conn->prepare("UPDATE drivers SET name = ? WHERE id = ?");
            $stmt->execute([trim($data['name']), $data['id']]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Driver updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["error" => "Failed to update driver"]);
            }
            break;
            
        case 'DELETE':
            $id = $_GET['id'];
            
            // First check if driver is assigned to any active reservations
            $checkStmt = $conn->prepare("SELECT COUNT(*) FROM reservations WHERE assigned_driver_id = ? AND end_time IS NULL AND status != 'cancelled'");
            $checkStmt->execute([$id]);
            $activeReservations = $checkStmt->fetchColumn();
            
            if ($activeReservations > 0) {
                http_response_code(400);
                echo json_encode(["error" => "Cannot delete driver assigned to active reservations"]);
                break;
            }
            
            $stmt = $conn->prepare("DELETE FROM drivers WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(["message" => "Driver deleted successfully"]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Driver not found"]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(["error" => "Method not allowed"]);
            break;
    }
}
?>