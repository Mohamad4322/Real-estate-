<?php
// frontend/php/rentcast_client.php
require_once __DIR__ . '/../vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Origin: http://100.71.100.5:7012"); // Frontend server
header("Access-Control-Allow-Origin: localhost:7012"); // Frontend server
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
$RABBITMQ_HOST = "100.107.33.60";  // RabbitMQ server
$RABBITMQ_PORT = 5672;
$RABBITMQ_USER = "admin";
$RABBITMQ_PASS = "admin";
$RENTCAST_REQUEST_QUEUE = "rentcast_requests";
$RENTCAST_RESPONSE_QUEUE = "rentcast_responses";

// Get the request data
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($data['action'])) {
    echo json_encode([
        "status" => "error", 
        "message" => "Invalid JSON or missing action"
    ]);
    exit;
}

try {
    // Connect to RabbitMQ
    $connection = new AMQPStreamConnection(
        $RABBITMQ_HOST, 
        $RABBITMQ_PORT, 
        $RABBITMQ_USER, 
        $RABBITMQ_PASS
    );
    $channel = $connection->channel();

    // Declare the queues
    $channel->queue_declare($RENTCAST_REQUEST_QUEUE, false, true, false, false);
    
    // Create a temporary response queue
    list($callbackQueue, ,) = $channel->queue_declare(
        "", 
        false,  // passive
        false,  // durable
        true,   // exclusive
        true    // auto_delete
    );

    // Generate a correlation ID
    $correlationId = uniqid();
    
    // Initialize response
    $response = null;

    // Set up the consumer for the response
    $channel->basic_consume(
        $callbackQueue,
        '',
        false,
        true,
        false,
        false,
        function ($msg) use (&$response, $correlationId) {
            // Only process messages with matching correlation ID
            $msgData = json_decode($msg->body, true);
            if ($msgData && isset($msgData['correlationId']) && 
                $msgData['correlationId'] === $correlationId) {
                $response = $msgData;
            }
        }
    );

    // Create and send the request message
    $request = [
        'action' => $data['action'],
        'params' => $data['params'] ?? [],
        'correlationId' => $correlationId
    ];
    
    $msg = new AMQPMessage(
        json_encode($request),
        [
            'correlation_id' => $correlationId,
            'reply_to' => $callbackQueue,
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT
        ]
    );
    
    $channel->basic_publish($msg, '', $RENTCAST_REQUEST_QUEUE);

    // Wait for the response with a timeout
    $timeout = 10; // 10 seconds timeout
    $start = time();
    
    while (!$response && (time() - $start) < $timeout) {
        $channel->wait(null, false, 1);
    }

    // Return the response or a timeout error
    if ($response) {
        echo json_encode($response);
    } else {
        echo json_encode([
            "status" => "error", 
            "message" => "Timeout: no response received from RentCast service"
        ]);
    }

    // Close the connection
    $channel->close();
    $connection->close();
    
} catch (Exception $e) {
    echo json_encode([
        "status" => "error", 
        "message" => "RabbitMQ error: " . $e->getMessage()
    ]);
}