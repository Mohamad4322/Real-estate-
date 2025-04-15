<?php
// ✅ Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// ✅ Include RabbitMQ and Database Connection
require_once __DIR__ . '/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use PDO;
use Exception;

try {
    // ✅ Connect to RabbitMQ
    $connection = new AMQPStreamConnection('100.107.33.60', 5672, 'admin', 'admin');
    $channel = $connection->channel();

    // ✅ Declare Queues
    $channel->queue_declare('db_queue', false, true, false, false);
    $channel->queue_declare('signup_response_queue', false, true, false, false);

    // ✅ Connect to MySQL Database (Fixing connection string)
    $pdo = new PDO("mysql:host=100.82.47.115;dbname=real_estate", "root", "admin", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    echo "✅ Database service listening for signup requests...\n";

    // ✅ Process Signup Requests
    $callback = function ($msg) use ($channel, $pdo) {
        $request = json_decode($msg->body, true);

        if (!isset($request['username'], $request['email'], $request['password'])) {
            echo "❌ Invalid request format\n";
            return;
        }

        echo "📝 Processing signup request: " . print_r($request, true) . "\n";

        // ✅ Check if user already exists
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$request['email']]);
        $existingUser = $stmt->fetch();

        if ($existingUser) {
            $response = ['success' => false, 'error' => 'User already exists'];
        } else {
            // ✅ Hash the password before storing it
            $hashedPassword = password_hash($request['password'], PASSWORD_BCRYPT);

            // ✅ Insert user into DB
            $stmt = $pdo->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
            $stmt->execute([$request['username'], $request['email'], $hashedPassword]);

            $response = ['success' => true, 'message' => 'Signup successful!'];
        }

        // ✅ Send response back to `signup_response_queue`
        $responseMsg = new AMQPMessage(json_encode($response), ['correlation_id' => $request['correlationId'] ?? null]);
        $channel->basic_publish($responseMsg, '', 'signup_response_queue');

        echo "✅ Signup processed, response sent...\n";
    };

    // ✅ Consume Messages from `db_queue`
    $channel->basic_consume('db_queue', '', false, true, false, false, $callback);

    while ($channel->is_consuming()) {
        $channel->wait();
    }

    $channel->close();
    $connection->close();
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}
?>
