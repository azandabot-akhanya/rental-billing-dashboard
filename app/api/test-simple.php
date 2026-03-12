<?php
header('Content-Type: application/json');
echo json_encode(['status' => 'working', 'time' => date('Y-m-d H:i:s')]);
