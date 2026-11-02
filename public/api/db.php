<?php
// Turso DB Proxy for shared hosting (SolidHosting cPanel)
// Replaces Next.js /api/db route on shared hosting.
// URL: https://assets-ys.com/api/db.php
// (app.html will be configured to call /api/db.php instead of /api/db)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

try {
  if ($method === 'GET') {
    $payload = [
      'requests' => [
        [
          'type' => 'execute',
          'stmt' => [
            'sql' => 'SELECT data, updated_at FROM app_data WHERE id = ?',
            'args' => [{ 'type' => 'text', 'value' => 'main' }]
          ]
        ]
      ]
    ];
    $result = turso_request($TURSO_API, $TURSO_TOKEN, $payload);

    if (isset($result['results'][0]['response']['result']['rows'][0])) {
      $row = $result['results'][0]['response']['result']['rows'][0];
      $dataStr = $row[0]['value'];
      $updatedAt = isset($row[1]['value']) ? $row[1]['value'] : null;
      $parsed = json_decode($dataStr, true);
      if ($parsed !== null) {
        echo json_encode(['ok' => true, 'data' => $parsed, 'updatedAt' => $updatedAt]);
      } else {
        echo json_encode(['ok' => true, 'data' => get_default_db(), 'updatedAt' => $updatedAt]);
      }
    } else {
      echo json_encode(['ok' => true, 'data' => get_default_db(), 'updatedAt' => null]);
    }

  } elseif ($method === 'POST') {
    $body = json_decode($input, true);
    if (!$body || !isset($body['data'])) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'Missing `data` in request body']);
      exit;
    }
    $json = json_encode($body['data']);

    // Upsert: UPDATE first, then INSERT if no rows affected
    $payload = [
      'requests' => [
        [
          'type' => 'execute',
          'stmt' => [
            'sql' => "UPDATE app_data SET data = ?, updated_at = datetime('now') WHERE id = ?",
            'args' => [
              ['type' => 'text', 'value' => $json],
              ['type' => 'text', 'value' => 'main']
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
              'sql' => "INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))",
              'args' => [
                ['type' => 'text', 'value' => 'main'],
                ['type' => 'text', 'value' => $json]
              ]
            ]
          ]
        ]
      ];
      turso_request($TURSO_API, $TURSO_TOKEN, $payload);
    }

    $payload = [
      'requests' => [
        [
          'type' => 'execute',
          'stmt' => [
            'sql' => 'SELECT updated_at FROM app_data WHERE id = ?',
            'args' => [['type' => 'text', 'value' => 'main']]
          ]
        ]
      ]
    ];
    $result = turso_request($TURSO_API, $TURSO_TOKEN, $payload);
    $updatedAt = $result['results'][0]['response']['result']['rows'][0][0]['value'] ?? date('c');
    echo json_encode(['ok' => true, 'updatedAt' => $updatedAt]);

  } else {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
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

function get_default_db() {
  return [
    'branches' => [], 'employees' => [], 'departments' => [], 'designations' => [],
    'categories' => [], 'brands' => [], 'uoms' => [], 'products' => [],
    'suppliers' => [], 'conditions' => [], 'warranties' => [], 'purchases' => [],
    'deliveries' => [], 'adjustments' => [], 'damages' => [], 'transfers' => [],
    'cashIn' => [], 'cashOut' => [],
    'users' => [
      ['id' => 1, 'name' => 'Admin User', 'username' => 'admin', 'email' => 'admin@itassets.com',
       'password' => 'admin123', 'role' => 'Super Admin', 'status' => 'Active']
    ],
    'roles' => [
      ['id' => 1, 'name' => 'Super Admin', 'permissions' => 'Full Access'],
      ['id' => 2, 'name' => 'Branch Manager', 'permissions' => 'Dashboard, Inventory, Reports (Own Branch)'],
      ['id' => 3, 'name' => 'Inventory Officer', 'permissions' => 'Inventory, Delivery, Adjustment'],
      ['id' => 4, 'name' => 'Finance Officer', 'permissions' => 'Cash Book, Reports'],
      ['id' => 5, 'name' => 'Viewer', 'permissions' => 'Dashboard, Reports (Read Only)']
    ],
    'company' => ['name' => '', 'address' => '', 'phone' => '', 'email' => '', 'website' => '']
  ];
}
?>
