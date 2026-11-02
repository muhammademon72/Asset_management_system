<?php
// Attachment Proxy for shared hosting (SolidHosting cPanel)
// Replaces Next.js /api/attachment route on shared hosting.
// URL: https://assets-ys.com/api/attachment.php?id=xxx
//   GET    ?id=xxx  — fetch an attachment by ID
//   POST            — create/update an attachment
//   DELETE ?id=xxx  — delete an attachment

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

$TURSO_URL = 'https://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io';
$TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA';
$TURSO_API = $TURSO_URL . '/v2/pipeline';

$method = $_SERVER['REQUEST_METHOD'];
$input = file_get_contents('php://input');
$id = isset($_GET['id']) ? $_GET['id'] : null;

try {
  if ($method === 'GET' && $id) {
    // Fetch attachment by ID
    $payload = [
      'requests' => [
        [
          'type' => 'execute',
          'stmt' => [
            'sql' => 'SELECT id, filename, filetype, filesize, data FROM attachments WHERE id = ?',
            'args' => [['type' => 'text', 'value' => $id]]
          ]
        ]
      ]
    ];
    $result = turso_request($TURSO_API, $TURSO_TOKEN, $payload);
    if (isset($result['results'][0]['response']['result']['rows'][0])) {
      $row = $result['results'][0]['response']['result']['rows'][0];
      echo json_encode([
        'ok' => true,
        'attachment' => [
          'id' => $row[0]['value'],
          'name' => $row[1]['value'],
          'type' => $row[2]['value'],
          'size' => $row[3]['value'],
          'data' => $row[4]['value']
        ]
      ]);
    } else {
      http_response_code(404);
      echo json_encode(['ok' => false, 'error' => 'Attachment not found']);
    }

  } elseif ($method === 'POST') {
    // Create or update an attachment
    $body = json_decode($input, true);
    if (!$body || !isset($body['id'])) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'Missing `id` in request body']);
      exit;
    }
    $aid = $body['id'];
    $name = isset($body['name']) ? $body['name'] : '';
    $type = isset($body['type']) ? $body['type'] : 'File';
    $size = isset($body['size']) ? (string)$body['size'] : '';
    $data = isset($body['data']) ? $body['data'] : '';

    // Upsert
    $payload = [
      'requests' => [
        [
          'type' => 'execute',
          'stmt' => [
            'sql' => 'UPDATE attachments SET filename = ?, filetype = ?, filesize = ?, data = ? WHERE id = ?',
            'args' => [
              ['type' => 'text', 'value' => $name],
              ['type' => 'text', 'value' => $type],
              ['type' => 'text', 'value' => $size],
              ['type' => 'text', 'value' => $data],
              ['type' => 'text', 'value' => $aid]
            ]
          ]
        ]
      ]
    ];
    $result = turso_request($TURSO_API, $TURSO_TOKEN, $payload);
    $rowsAffected = $result['results'][0]['response']['result']['rows_affected'] ?? 0;

    if ($rowsAffected === 0) {
      $payload = [
        'requests' => [
          [
            'type' => 'execute',
            'stmt' => [
              'sql' => 'INSERT INTO attachments (id, filename, filetype, filesize, data) VALUES (?, ?, ?, ?, ?)',
              'args' => [
                ['type' => 'text', 'value' => $aid],
                ['type' => 'text', 'value' => $name],
                ['type' => 'text', 'value' => $type],
                ['type' => 'text', 'value' => $size],
                ['type' => 'text', 'value' => $data]
              ]
            ]
          ]
        ]
      ];
      turso_request($TURSO_API, $TURSO_TOKEN, $payload);
    }

    echo json_encode(['ok' => true, 'id' => $aid]);

  } elseif ($method === 'DELETE' && $id) {
    // Delete attachment
    $payload = [
      'requests' => [
        [
          'type' => 'execute',
          'stmt' => [
            'sql' => 'DELETE FROM attachments WHERE id = ?',
            'args' => [['type' => 'text', 'value' => $id]]
          ]
        ]
      ]
    ];
    turso_request($TURSO_API, $TURSO_TOKEN, $payload);
    echo json_encode(['ok' => true]);

  } else {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid request']);
  }

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}

function turso_request($url, $token, $payload) {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
  ]);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);
  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $error = curl_error($ch);
  curl_close($ch);
  if ($response === false) {
    throw new Exception('Turso request failed: ' . $error);
  }
  $data = json_decode($response, true);
  if ($httpCode !== 200) {
    throw new Exception('Turso returned HTTP ' . $httpCode . ': ' . $response);
  }
  return $data;
}
?>
