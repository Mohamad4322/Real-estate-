<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;


$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($data['action'])) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON or missing action"]);
    exit;
}


$RABBITMQ_HOST = "100.107.33.60";
$RABBITMQ_QUEUE = "frontend_to_backend";
$RABBITMQ_USER = "admin";
$RABBITMQ_PASS = "admin";
$RABBITMQ_PORT = 5673;

try {
    $connection = new AMQPStreamConnection($RABBITMQ_HOST, $RABBITMQ_PORT, $RABBITMQ_USER, $RABBITMQ_PASS);
    $channel = $connection->channel();

    
    list($callbackQueue, ,) = $channel->queue_declare("", false, false, true, true);
    $corrId = uniqid();
    $response = null;

    
    $channel->basic_consume($callbackQueue, '', false, true, false, false, function ($msg) use (&$response, $corrId) {
        if ($msg->get('correlation_id') === $corrId) {
            $response = json_decode($msg->body, true);
        }
    });

    
    $msg = new AMQPMessage(json_encode($data), [
        'correlation_id' => $corrId,
        'reply_to' => $callbackQueue
    ]);
    $channel->basic_publish($msg, '', $RABBITMQ_QUEUE);

    
    $timeout = 10;
    $start = time();
    while (!$response && (time() - $start) < $timeout) {
        $channel->wait(null, false, 3);
    }

    echo json_encode($response ?: ["status" => "error", "message" => "Timeout: no response received from backend"]);

    $channel->close();
    $connection->close();
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "RabbitMQ error: " . $e->getMessage()]);
}
?>
