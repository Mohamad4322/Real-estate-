<?php
require_once __DIR__ . '/vendor/autoload.php';
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use PDO;

$RABBITMQ_URL = "100.107.33.60";

$connection = new AMQPStreamConnection($RABBITMQ_URL, 5672, 'admin', 'admin');
$channel = $connection->channel();
$channel->queue_declare('backend_to_database', false, true, false, false);

$callback = function($msg) {
    $data = json_decode($msg->body, true);
    // Process signup/login in database (same as before)
};

$channel->basic_consume('backend_to_database', '', false, true, false, false, $callback);
while ($channel->is_consuming()) {
    $channel->wait();
}
?>
