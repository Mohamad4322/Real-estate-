<?php
echo "Name: ";
$name = trim(fgets(STDIN));

echo "Email: ";
$email = trim(fgets(STDIN));

echo "Password: ";
$password = trim(fgets(STDIN)); 


$host = '100.82.47.115';
$db   = 'real_estate';
$user = 'root';
$pass = 'admin';

$mysqli = new mysqli($host, $user, $pass, $db);


if ($mysqli->connect_error) {
    die("❌ Connection failed: " . $mysqli->connect_error . PHP_EOL);
}

$stmt = $mysqli->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $name, $email, $password);

if ($stmt->execute()) {
    echo "✅ User inserted successfully." . PHP_EOL;
} else {
    echo "❌ Error inserting user: " . $stmt->error . PHP_EOL;
}

$stmt->close();
$mysqli->close();
