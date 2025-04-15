<?php
require_once __DIR__ . '/vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

$connection = new AMQPStreamConnection('100.107.33.60', 5672, 'admin', 'admin', '/');
$channel = $connection->channel();

$channel->queue_declare('backend_testing', false, true, false, false);

$message = new AMQPMessage('Hello from Bryan/RMQ!');

$channel->basic_publish($message, '', 'backend_testing');

echo "Message sent to queue: Hello from Bryan/RMQ!\n";

$channel->close();
$connection->close();
?>
