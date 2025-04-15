<?php

//vendor needed for messages being sent
require_once __DIR__ . '/vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

// Specify the details for RMQ
$host = '100.107.33.60';
$port = 5672;
$username = 'admin';
$password = 'admin';
$queue_name = 'backend_to_database'; // Declare the queue

// Connect to RMQ
$connection = new AMQPStreamConnection($host, $port, $username, $password);
$channel = $connection->channel();

$channel->queue_declare($queue_name, false, true, false, false);

$message_body = 'Hello from the Database!';

$msg = new AMQPMessage($message_body, ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]);

// Send message to the queue
$channel->basic_publish($msg, '', $queue_name);

echo " [x] Sent: " . $message_body . "\n";

$channel->close();
$connection->close();

?>
