<?php
require_once __DIR__ . '/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;


$RABBITMQ_HOST = "100.107.33.60";
$RABBITMQ_PORT = 5673;
$RABBITMQ_USER = "admin";
$RABBITMQ_PASS = "admin";
$RABBITMQ_QUEUE = "frontend_to_backend"; 

$DB_HOST = "100.82.47.115";
$DB_NAME = "real_estate";
$DB_USER = "root";
$DB_PASS = "admin";

try {
    echo "🔄 Connecting to RabbitMQ at $RABBITMQ_HOST:$RABBITMQ_PORT...\n";
    $connection = new AMQPStreamConnection($RABBITMQ_HOST, $RABBITMQ_PORT, $RABBITMQ_USER, $RABBITMQ_PASS);
    $channel = $connection->channel();

    $channel->queue_declare($RABBITMQ_QUEUE, false, true, false, false);
    echo "✅ Connected to RabbitMQ. Waiting for messages...\n";

    $callback = function ($msg) use ($DB_HOST, $DB_NAME, $DB_USER, $DB_PASS) {
        echo "⚠️ Callback triggered. Attempting to process message...\n";

        $data = json_decode($msg->body, true);
        echo "📩 Received Message: " . json_encode($data) . "\n";

        if (!$data || !isset($data['action'])) {
            echo "❌ Error: Invalid request data received\n";
            return;
        }

        try {
            echo "🔧 Processing action: " . $data['action'] . "\n";

            echo "🔄 Connecting to MySQL at $DB_HOST...\n";
            $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8", $DB_USER, $DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            echo "✅ Connected to MySQL.\n";

            if ($data['action'] === 'signup') {
                echo "📝 Signup process initiated...\n";

                if (!isset($data['name'], $data['email'], $data['password'])) {
                    echo "❌ Error: Missing signup fields\n";
                    return;
                }

                $name = $data['name'];
                $email = $data['email'];
                $password = password_hash($data['password'], PASSWORD_BCRYPT);

                echo "🔄 Inserting user into database...\n";
                $stmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");

                if ($stmt->execute([$name, $email, $password])) {
                    echo "✅ User registered successfully: $email\n";
                } else {
                    echo "❌ Database error while inserting user.\n";
                }

            } elseif ($data['action'] === 'login') {
                echo "🔐 Login process initiated...\n";

                if (!isset($data['email'], $data['password'])) {
                    echo "❌ Error: Missing login fields\n";
                    return;
                }

                $email = $data['email'];
                $password = $data['password'];

                echo "🔄 Checking user credentials...\n";
                $stmt = $pdo->prepare("SELECT id, name, password FROM users WHERE email = ?");
                $stmt->execute([$email]);
                $user = $stmt->fetch();

                if ($user && password_verify($password, $user['password'])) {
                    echo "✅ Login successful for: " . $user['name'] . "\n";
                    echo json_encode([
                        "status" => "success",
                        "message" => "Login successful!",
                        "user" => [
                            "id" => $user['id'],
                            "name" => $user['name'],
                            "email" => $email
                        ]
                    ]);
                } else {
                    echo "❌ Login failed: Invalid credentials\n";
                    echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
                }

            } else {
                echo "❌ Error: Unknown action received: " . $data['action'] . "\n";
            }

        } catch (PDOException $e) {
            echo "❌ Database Error: " . $e->getMessage() . "\n";
        }
    };

    $channel->basic_consume($RABBITMQ_QUEUE, '', false, true, false, false, $callback);

    while ($channel->is_consuming()) {
        $channel->wait();
    }

    $channel->close();
    $connection->close();

} catch (Exception $e) {
    echo " " . $e->getMessage() . "\n";
}
?>
