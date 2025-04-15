<?php

require_once __DIR__ . '/messaging/vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;

$host = '100.107.33.60';
$port = 5672;
$username = 'admin';
$password = 'admin';
$queue_name = 'front_to_back';

$connection = new AMQPStreamConnection($host, $port, $username, $password);
$channel = $connection->channel();

$channel->queue_declare($queue_name, false, true, false, false);

echo ' [*] Waiting for messages. To exit press CTRL+C', "\n";

$callback = function($msg) {
    echo " [x] Received: " . $msg->body . "\n";
};

$channel->basic_consume($queue_name, '', false, true, false, false, $callback);

while($channel->is_consuming()) {
    $channel->wait();
}

$channel->close();
$connection->close();

?>
