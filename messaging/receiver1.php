<?php
require_once __DIR__ . '/vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

$connection = new AMQPStreamConnection('100.107.33.60', 5672, 'admin', 'admin', '/');
$channel = $connection->channel();

$channel->queue_declare('backend_testing', false, true, false, false);

$callback = function($msg) {
    echo 'Received message: ' . $msg->body . "\n";
    $msg->ack();
};

$channel->basic_consume('backend_testing', '', false, false, false, false, $callback);

while($channel->is_consuming()) {
    $channel->wait();
}

$channel->close();
$connection->close();
?>
