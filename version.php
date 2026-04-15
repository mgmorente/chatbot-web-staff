<?php
/**
 * version.php — Genera window.APP_VERSION a partir del último commit git.
 *
 * Uso en el frontend:
 *   <script src="version.php"></script>                 → define window.APP_VERSION
 *   fetch('version.php?format=json').then(r => r.json()) → obtiene los datos como JSON
 *
 * Si git no está disponible, cae a valores por defecto para no romper la app.
 */

// Caché ligera para no ejecutar git en cada petición (60 segundos).
header('Cache-Control: public, max-age=60');

// Busca la raíz del repo subiendo directorios.
function findGitRoot(): ?string {
    $dir = __DIR__;
    for ($i = 0; $i < 8; $i++) {
        if (is_dir($dir . DIRECTORY_SEPARATOR . '.git')) return $dir;
        $parent = dirname($dir);
        if ($parent === $dir) break;
        $dir = $parent;
    }
    return null;
}

// Intenta localizar el ejecutable git en rutas habituales si no está en PATH.
function findGitBinary(): string {
    // 1) ¿Está en PATH?
    $which = stripos(PHP_OS, 'WIN') === 0 ? 'where git 2>nul' : 'command -v git 2>/dev/null';
    $found = trim((string) @shell_exec($which));
    if ($found) {
        $first = strtok($found, "\r\n");
        return $first ?: 'git';
    }
    // 2) Rutas comunes en Windows (XAMPP/Git for Windows)
    $candidates = [
        'C:\\Program Files\\Git\\cmd\\git.exe',
        'C:\\Program Files\\Git\\bin\\git.exe',
        'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
        '/usr/bin/git',
        '/usr/local/bin/git',
    ];
    foreach ($candidates as $c) {
        if (is_file($c)) return $c;
    }
    return 'git'; // último recurso: dependemos del PATH
}

$GIT_BIN  = findGitBinary();
$GIT_ROOT = findGitRoot();

function runGit(string $args): string {
    global $GIT_BIN, $GIT_ROOT;
    if (!$GIT_ROOT) return '';
    $cmd = escapeshellarg($GIT_BIN) . ' -C ' . escapeshellarg($GIT_ROOT) . ' ' . $args . ' 2>&1';
    return trim((string) @shell_exec($cmd));
}

$hash      = runGit("log -1 --format=%h")      ?: 'dev';
$hashFull  = runGit("log -1 --format=%H")      ?: '';
$isoDate   = runGit("log -1 --format=%cI")     ?: date('c');
$message   = runGit("log -1 --format=%s")      ?: '';
$branch    = runGit("rev-parse --abbrev-ref HEAD") ?: '';
$dirty     = runGit("status --porcelain")      !== '';

// Fecha de build legible (YYYY-MM-DD HH:MM)
$buildDate = $isoDate ? date('Y-m-d H:i', strtotime($isoDate)) : date('Y-m-d H:i');

$data = [
    'version'   => $hash . ($dirty ? '+dirty' : ''),
    'hash'      => $hash,
    'hashFull'  => $hashFull,
    'buildDate' => $buildDate,
    'branch'    => $branch,
    'message'   => $message,
    'dirty'     => $dirty,
];

// Modo diagnóstico: ver qué detecta el script (git_root, git_bin, errores)
if (isset($_GET['debug'])) {
    header('Content-Type: text/plain; charset=utf-8');
    echo "=== version.php debug ===\n";
    echo "PHP OS: "           . PHP_OS                  . "\n";
    echo "Script dir: "       . __DIR__                 . "\n";
    echo "Git binary found: " . $GIT_BIN                . "\n";
    echo "Git root detected: "  . ($GIT_ROOT ?: '(no encontrado)') . "\n";
    echo "shell_exec enabled: " . (function_exists('shell_exec') && !in_array('shell_exec', array_map('trim', explode(',', (string) ini_get('disable_functions'))), true) ? 'sí' : 'NO') . "\n";
    echo "which git: "        . trim((string) @shell_exec(stripos(PHP_OS, 'WIN') === 0 ? 'where git 2>&1' : 'command -v git 2>&1')) . "\n";
    echo "git --version: "    . trim((string) @shell_exec(escapeshellarg($GIT_BIN) . ' --version 2>&1')) . "\n";
    echo "\n=== Datos resueltos ===\n";
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// ¿Pedido en JSON?
if (isset($_GET['format']) && $_GET['format'] === 'json') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Respuesta por defecto: JavaScript que define window.APP_VERSION
header('Content-Type: application/javascript; charset=utf-8');
?>
// Generado automáticamente por version.php a partir del último commit git.
window.APP_VERSION = <?= json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?>;
// En la UI solo mostramos fecha y hora del último commit (el hash queda disponible en window.APP_VERSION.hash).
window.APP_VERSION.full = window.APP_VERSION.buildDate + (window.APP_VERSION.dirty ? ' (dirty)' : '');
