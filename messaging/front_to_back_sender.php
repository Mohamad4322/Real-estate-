<?php
// ✅ Allow cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// ✅ Handle Preflight (OPTIONS) Request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

// ✅ RabbitMQ Connection Details
$RABBITMQ_HOST = "100.107.33.60";
$RABBITMQ_QUEUE = "frontend_to_backend";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // ✅ Validate required fields
    $action = $_POST['action'] ?? '';
    $username = $_POST['username'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($action) || empty($username) || empty($email) || empty($password)) {
        echo json_encode(['message' => 'Error: Missing required fields']);
        exit();
    }

    // ✅ Prepare data for RabbitMQ
    $data = json_encode([
        'action' => $action,
        'username' => $username,
        'email' => $email,
        'password' => $password
    ]);

    try {
        // ✅ Connect to RabbitMQ
        $connection = new AMQPStreamConnection($RABBITMQ_HOST, 5672, 'admin', 'admin');
        $channel = $connection->channel();
        $channel->queue_declare($RABBITMQ_QUEUE, false, true, false, false);

        // ✅ Send Message to Queue
        $msg = new AMQPMessage($data, ['delivery_mode' => 2]); 
        $channel->basic_publish($msg, '', $RABBITMQ_QUEUE);

        echo json_encode(['message' => 'Request sent successfully.']);

        // ✅ Close connection
        $channel->close();
        $connection->close();
    } catch (Exception $e) {
        echo json_encode(['message' => 'Error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['message' => 'Method Not Allowed']);
}
?>
