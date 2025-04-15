<?php
require_once __DIR__ . '/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

$RABBITMQ_URL = "100.107.33.60";

$data = json_decode(file_get_contents('backend_request.json'), true);
$action = $data['action'] ?? '';

if (!$action || !isset($data['email']) || ($action === 'signup' && !isset($data['username'], $data['password']))) {
    error_log("❌ Invalid request data received in backend.php");
    exit();
}

try {
    $connection = new AMQPStreamConnection($RABBITMQ_URL, 5672, 'admin', 'admin');
    $channel = $connection->channel();
    $channel->queue_declare('backend_to_database', false, true, false, false);

    $msg = new AMQPMessage(json_encode($data), ['delivery_mode' => 2]);
    $channel->basic_publish($msg, '', 'backend_to_database');

    error_log("✅ Request forwarded to database queue: " . json_encode($data));

    $channel->close();
    $connection->close();
} catch (Exception $e) {
    error_log("❌ RabbitMQ Error in backend.php: " . $e->getMessage());
}
?>
